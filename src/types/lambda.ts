export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  headers: Record<string, string>;
  body: string | null;
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type LambdaHandler = (
  event: APIGatewayProxyEvent
) => Promise<APIGatewayProxyResult>;
