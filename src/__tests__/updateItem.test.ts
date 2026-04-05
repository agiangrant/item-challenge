import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/updateItem.js';
import { makeEvent, createTestItem } from './helpers.js';

describe('updateItem handler', () => {
  it('should update an existing item', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ difficulty: 5 }),
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.difficulty).toBe(5);
    expect(body.metadata.version).toBe(2);
    expect(body.metadata.lastModified).toBeGreaterThanOrEqual(created.metadata.lastModified);
    // Unchanged fields preserved
    expect(body.subject).toBe(created.subject);
    expect(body.metadata.author).toBe(created.metadata.author);
  });

  it('should update nested content fields', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ content: { question: 'Updated question?' } }),
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.content.question).toBe('Updated question?');
    // Other content fields preserved
    expect(body.content.correctAnswer).toBe(created.content.correctAnswer);
    expect(body.content.explanation).toBe(created.content.explanation);
  });

  it('should update metadata fields', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ metadata: { status: 'approved' } }),
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.metadata.status).toBe('approved');
    expect(body.metadata.author).toBe(created.metadata.author);
  });

  it('should return 404 for non-existent item', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: '/api/items/non-existent',
        pathParameters: { id: 'non-existent' },
        body: JSON.stringify({ difficulty: 1 }),
      })
    );

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Item not found');
  });

  it('should return 400 when id is missing', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: '/api/items/',
        body: JSON.stringify({ difficulty: 1 }),
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Missing item id');
  });

  it('should return 400 when body is missing', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Missing request body');
  });

  it('should return 400 for empty update body', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({}),
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Validation failed');
  });

  it('should return 400 for invalid difficulty', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ difficulty: 99 }),
      })
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for unexpected fields', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ rogue: true }),
      })
    );

    expect(result.statusCode).toBe(400);
  });
});
