import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/getItem.js';
import { makeEvent, createTestItem } from './helpers.js';

describe('getItem handler', () => {
  it('should return 404 for non-existent item', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items/non-existent-id',
        pathParameters: { id: 'non-existent-id' },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.error).toBe('Item not found');
  });

  it('should return 400 when id is missing', async () => {
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/api/items/' })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error).toBe('Missing item id');
  });

  it('should retrieve an existing item', async () => {
    const created = await createTestItem({ subject: 'AP Calculus' });

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.subject).toBe('AP Calculus');
  });
});
