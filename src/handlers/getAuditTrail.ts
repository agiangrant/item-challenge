import { createStorage } from '../storage/index.js';
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

    const trail = await storage.getAuditTrail(id);

    return {
      statusCode: 200,
      body: JSON.stringify({ itemId: id, versions: trail }),
    };
  } catch (error) {
    console.error('Error getting audit trail:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
