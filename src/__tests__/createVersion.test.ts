import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/createVersion.js';
import { handler as getItem } from '../handlers/getItem.js';
import { makeEvent, createTestItem } from './helpers.js';

describe('createVersion handler', () => {
  it('should create a new version of an existing item', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: `/api/items/${created.id}/versions`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.id).toBe(created.id);
    expect(body.metadata.version).toBe(2);
    expect(body.metadata.lastModified).toBeGreaterThanOrEqual(created.metadata.lastModified);
  });

  it('should increment version on each call', async () => {
    const created = await createTestItem();

    await handler(
      makeEvent({
        httpMethod: 'POST',
        path: `/api/items/${created.id}/versions`,
        pathParameters: { id: created.id },
      })
    );

    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: `/api/items/${created.id}/versions`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(body.metadata.version).toBe(3);
  });

  it('should update the current item state', async () => {
    const created = await createTestItem();

    await handler(
      makeEvent({
        httpMethod: 'POST',
        path: `/api/items/${created.id}/versions`,
        pathParameters: { id: created.id },
      })
    );

    const getResult = await getItem(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
      })
    );
    const current = JSON.parse(getResult.body);

    expect(current.metadata.version).toBe(2);
  });

  it('should return 404 for non-existent item', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items/non-existent/versions',
        pathParameters: { id: 'non-existent' },
      })
    );

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Item not found');
  });

  it('should return 400 when id is missing', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items//versions',
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Missing item id');
  });
});
