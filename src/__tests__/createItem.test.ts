import { describe, expect, it } from 'vitest';
import { handler } from '../handlers/createItem.js';
import { makeEvent, validItemData } from './helpers.js';

describe('createItem handler', () => {
  it('should create an item with valid data', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify(validItemData),
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body.subject).toBe('AP Biology');
    expect(body.metadata.author).toBe('test-author');
    expect(body.metadata.version).toBe(1);
    expect(body.metadata.created).toBeTypeOf('number');
    expect(body.metadata.lastModified).toBeTypeOf('number');
  });

  it('should return 400 when body is missing', async () => {
    const result = await handler(
      makeEvent({ httpMethod: 'POST', path: '/api/items' })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error).toBe('Missing request body');
  });

  it('should return 400 for invalid itemType', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify({ ...validItemData, itemType: 'invalid' }),
      })
    );
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('should return 400 for difficulty out of range', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify({ ...validItemData, difficulty: 10 }),
      })
    );

    expect(JSON.parse(result.body).error).toBe('Validation failed');
    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for invalid securityLevel', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify({ ...validItemData, securityLevel: 'top-secret' }),
      })
    );

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 for missing required fields', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify({ subject: 'AP Biology' }),
      })
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Validation failed');
  });

  it('should return 400 for unexpected fields', async () => {
    const result = await handler(
      makeEvent({
        httpMethod: 'POST',
        path: '/api/items',
        body: JSON.stringify({ ...validItemData, rogue: true }),
      })
    );

    expect(result.statusCode).toBe(400);
  });
});
