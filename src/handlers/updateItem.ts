import { createStorage } from '../storage/index.js';
import { updateItemSchema } from '../validation/schemas.js';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/lambda.js';

const storage = createStorage();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing item id' }),
      };
    }

    const raw = event.body ? JSON.parse(event.body) : null;
    if (!raw) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const parsed = updateItemSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed', details: parsed.error.issues }),
      };
    }

    const item = await storage.updateItem(id, parsed.data);
    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Item not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(item),
    };
  } catch (error) {
    console.error('Error updating item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
