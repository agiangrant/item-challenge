import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/getAuditTrail.js';
import { handler as updateItem } from '../handlers/updateItem.js';
import { handler as createVersion } from '../handlers/createVersion.js';
import { makeEvent, createTestItem } from './helpers.js';

describe('getAuditTrail handler', () => {
  it('should return the initial version after creation', async () => {
    const created = await createTestItem();

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}/audit`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.itemId).toBe(created.id);
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0].metadata.version).toBe(1);
  });

  it('should accumulate versions after updates', async () => {
    const created = await createTestItem();

    await updateItem(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ difficulty: 5 }),
      })
    );

    await updateItem(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ difficulty: 2 }),
      })
    );

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}/audit`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(body.versions).toHaveLength(3);
    expect(body.versions[0].metadata.version).toBe(1);
    expect(body.versions[1].metadata.version).toBe(2);
    expect(body.versions[2].metadata.version).toBe(3);
  });

  it('should include versions from createVersion calls', async () => {
    const created = await createTestItem();

    await createVersion(
      makeEvent({
        httpMethod: 'POST',
        path: `/api/items/${created.id}/versions`,
        pathParameters: { id: created.id },
      })
    );

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}/audit`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(body.versions).toHaveLength(2);
    expect(body.versions[0].metadata.version).toBe(1);
    expect(body.versions[1].metadata.version).toBe(2);
  });

  it('should return empty versions for non-existent item', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items/non-existent/audit',
        pathParameters: { id: 'non-existent' },
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.versions).toHaveLength(0);
  });

  it('should return 400 when id is missing', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: '/api/items//audit',
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Missing item id');
  });

  it('should show correct data at each version', async () => {
    const created = await createTestItem();

    await updateItem(
      makeEvent({
        httpMethod: 'PUT',
        path: `/api/items/${created.id}`,
        pathParameters: { id: created.id },
        body: JSON.stringify({ difficulty: 5 }),
      })
    );

    const result = await handler(
      makeEvent({
        httpMethod: 'GET',
        path: `/api/items/${created.id}/audit`,
        pathParameters: { id: created.id },
      })
    );
    const body = JSON.parse(result.body);

    expect(body.versions[0].difficulty).toBe(3); // original
    expect(body.versions[1].difficulty).toBe(5); // updated
  });
});
