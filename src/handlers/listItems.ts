import { createStorage } from '../storage/index.js';
import { listItemsQuerySchema } from '../validation/schemas.js';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/lambda.js';

const storage = createStorage();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const raw = event.queryStringParameters || {};

    const parsed = listItemsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed', details: parsed.error.issues }),
      };
    }

    const result = await storage.listItems(parsed.data);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error listing items:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
