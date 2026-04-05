import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/listItems.js';
import { makeEvent, createTestItem } from './helpers.js';

describe('listItems handler', () => {
  it('should return an empty list when no items exist', async () => {
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/api/items' })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.items).toBeInstanceOf(Array);
  });

  it('should return created items', async () => {
    await createTestItem({ subject: 'Physics' });
    await createTestItem({ subject: 'Chemistry' });

    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/api/items' })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by status', async () => {
    await createTestItem({ metadata: { author: 'a', status: 'approved', tags: [] } });
    await createTestItem({ metadata: { author: 'a', status: 'draft', tags: [] } });

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { status: 'approved' },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    for (const item of body.items) {
      expect(item.metadata.status).toBe('approved');
    }
  });

  it('should filter by subject', async () => {
    await createTestItem({ subject: 'AP History' });
    await createTestItem({ subject: 'AP Math' });

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { subject: 'AP History' },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    for (const item of body.items) {
      expect(item.subject).toBe('AP History');
    }
  });

  it('should respect limit', async () => {
    await createTestItem();
    await createTestItem();
    await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { limit: '1' },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.items.length).toBe(1);
  });

  it('should paginate with cursor', async () => {
    // Create enough items to paginate
    for (let i = 0; i < 3; i++) {
      await createTestItem({ subject: `Paginate-${i}` });
    }

    const page1 = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { limit: '2' },
      })
    );
    const body1 = JSON.parse(page1.body);

    expect(body1.items.length).toBe(2);
    expect(body1.cursor).toBeDefined();

    const page2 = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { limit: '2', cursor: body1.cursor },
      })
    );
    const body2 = JSON.parse(page2.body);

    expect(body2.items.length).toBeGreaterThanOrEqual(1);
    // No overlap between pages
    const page1Ids = new Set(body1.items.map((i: { id: string }) => i.id));
    for (const item of body2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });

  it('should return 400 for invalid status', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { status: 'invalid' },
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Validation failed');
  });

  it('should return 400 for invalid limit', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items',
        queryStringParameters: { limit: '0' },
      })
    );

    expect(result.statusCode).toBe(400);
  });
});
