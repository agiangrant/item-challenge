import type { APIGatewayProxyEvent } from '../types/lambda.js';
import { handler as createItemHandler } from '../handlers/createItem.js';
import type { ExamItem } from '../types/item.js';

export function makeEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    body: null,
    ...overrides,
  };
}

export const validItemData = {
  subject: 'AP Biology',
  itemType: 'multiple-choice' as const,
  difficulty: 3,
  content: {
    question: 'What is photosynthesis?',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'Photosynthesis is the process...',
  },
  metadata: {
    author: 'test-author',
    status: 'draft' as const,
    tags: ['biology', 'photosynthesis'],
  },
  securityLevel: 'standard' as const,
};

/** Create an item via the handler and return the parsed body. */
export async function createTestItem(
  overrides: Record<string, unknown> = {}
): Promise<ExamItem> {
  const data = { ...validItemData, ...overrides };
  const result = await createItemHandler(
    makeEvent({
      httpMethod: 'POST',
      path: '/api/items',
      body: JSON.stringify(data),
    })
  );
  if (result.statusCode !== 201) {
    throw new Error(`Failed to create test item: ${result.body}`);
  }
  return JSON.parse(result.body);
}
