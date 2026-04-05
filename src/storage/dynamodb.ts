/**
 * DynamoDB Storage Implementation
 *
 * Uses a version-0 convention for the sort key:
 *   SK=0  → current state of the item (overwritten on every update)
 *   SK=1+ → immutable historical snapshots (audit trail)
 *
 * Environment variables:
 *   USE_DYNAMODB=true
 *   DYNAMODB_TABLE_NAME (default "ExamItems")
 *   DYNAMODB_ENDPOINT   (for local DynamoDB)
 *   AWS_REGION          (default "us-east-1")
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ExamItem, CreateItemRequest, UpdateItemRequest, ListItemsQuery, ListItemsResponse } from '../types/item.js';
import { ItemStorage } from './interface.js';

/** Shape of a DynamoDB record — ExamItem + sort key + denormalized GSI fields */
interface DynamoRecord extends ExamItem {
  version: number;
  status: string;
  lastModified: number;
}

export class DynamoDBStorage implements ItemStorage {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'ExamItems';
  }

  async createItem(data: CreateItemRequest): Promise<ExamItem> {
    const now = Date.now();
    const item: ExamItem = {
      id: randomUUID(),
      ...data,
      metadata: {
        ...data.metadata,
        created: now,
        lastModified: now,
        version: 1,
      },
    };

    const record = this.toRecord(item, 0);
    const snapshot = this.toRecord(item, 1);

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: this.tableName, Item: record } },
        { Put: { TableName: this.tableName, Item: snapshot } },
      ],
    }));

    return item;
  }

  async getItem(id: string): Promise<ExamItem | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { id, version: 0 },
    }));

    return result.Item ? this.fromRecord(result.Item as DynamoRecord) : null;
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    const updated: ExamItem = {
      ...existing,
      ...data,
      content: data.content ? { ...existing.content, ...data.content } : existing.content,
      metadata: {
        ...existing.metadata,
        ...(data.metadata || {}),
        lastModified: Date.now(),
        version: existing.metadata.version + 1,
      },
    };

    const record = this.toRecord(updated, 0);
    const snapshot = this.toRecord(updated, updated.metadata.version);

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: this.tableName, Item: record } },
        { Put: { TableName: this.tableName, Item: snapshot } },
      ],
    }));

    return updated;
  }

  async listItems(query: ListItemsQuery): Promise<ListItemsResponse> {
    const limit = query.limit || 20;
    const startKey = query.cursor
      ? JSON.parse(Buffer.from(query.cursor, 'base64').toString())
      : undefined;

    let result;

    if (query.status) {
      result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'status-lastModified-index',
        KeyConditionExpression: '#status = :status',
        FilterExpression: 'version = :zero',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': query.status, ':zero': 0 },
        ScanIndexForward: false,
        Limit: limit,
        ...(startKey && { ExclusiveStartKey: startKey }),
      }));
    } else if (query.subject) {
      result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'subject-lastModified-index',
        KeyConditionExpression: 'subject = :subject',
        FilterExpression: 'version = :zero',
        ExpressionAttributeValues: { ':subject': query.subject, ':zero': 0 },
        ScanIndexForward: false,
        Limit: limit,
        ...(startKey && { ExclusiveStartKey: startKey }),
      }));
    } else {
      result = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'version = :zero',
        ExpressionAttributeValues: { ':zero': 0 },
        Limit: limit,
        ...(startKey && { ExclusiveStartKey: startKey }),
      }));
    }

    const items = (result.Items || []).map(i => this.fromRecord(i as DynamoRecord));
    const cursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return { items, cursor };
  }

  async createVersion(id: string): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    const newVersion: ExamItem = {
      ...existing,
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
        lastModified: Date.now(),
      },
    };

    const record = this.toRecord(newVersion, 0);
    const snapshot = this.toRecord(newVersion, newVersion.metadata.version);

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: this.tableName, Item: record } },
        { Put: { TableName: this.tableName, Item: snapshot } },
      ],
    }));

    return newVersion;
  }

  async getAuditTrail(id: string): Promise<ExamItem[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id AND version > :zero',
      ExpressionAttributeValues: { ':id': id, ':zero': 0 },
      ScanIndexForward: true,
    }));

    return (result.Items || []).map(i => this.fromRecord(i as DynamoRecord));
  }

  /** Build a DynamoDB record with sort key + denormalized GSI fields */
  private toRecord(item: ExamItem, version: number): DynamoRecord {
    return {
      ...item,
      version,
      status: item.metadata.status,
      lastModified: item.metadata.lastModified,
    };
  }

  /** Strip DynamoDB sort key + denormalized fields back to a clean ExamItem */
  private fromRecord(record: DynamoRecord): ExamItem {
    const { version: _sk, status: _status, lastModified: _lm, ...item } = record;
    return item as ExamItem;
  }
}
