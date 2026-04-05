import { createStorage } from '../storage/index.js';
import { createItemSchema } from '../validation/schemas.js';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/lambda.js';

const storage = createStorage();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const raw = event.body ? JSON.parse(event.body) : null;
    if (!raw) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const parsed = createItemSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed', details: parsed.error.issues }),
      };
    }

    const item = await storage.createItem(parsed.data);

    return {
      statusCode: 201,
      body: JSON.stringify(item),
    };
  } catch (error) {
    console.error('Error creating item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
