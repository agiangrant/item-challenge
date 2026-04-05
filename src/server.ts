/**
 * Local Development Server
 *
 * Config-based HTTP server that transforms incoming requests into
 * APIGatewayProxyEvent format before dispatching to Lambda handlers.
 *
 * Run with: pnpm dev
 */

import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "http";
import type { APIGatewayProxyEvent, LambdaHandler } from "./types/lambda.js";
import { handler as createItem } from "./handlers/createItem.js";
import { handler as getItem } from "./handlers/getItem.js";
import { handler as updateItem } from "./handlers/updateItem.js";
import { handler as listItems } from "./handlers/listItems.js";
import { handler as createVersion } from "./handlers/createVersion.js";
import { handler as getAuditTrail } from "./handlers/getAuditTrail.js";

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

interface Route {
  method: string;
  path: string; // Express-style pattern, e.g. /api/items/:id
  handler: LambdaHandler;
}

const routes: Route[] = [
  { method: "GET", path: "/api/items/:id/audit", handler: getAuditTrail },
  { method: "POST", path: "/api/items/:id/versions", handler: createVersion },
  { method: "GET", path: "/api/items/:id", handler: getItem },
  { method: "PUT", path: "/api/items/:id", handler: updateItem },
  { method: "GET", path: "/api/items", handler: listItems },
  { method: "POST", path: "/api/items", handler: createItem },
];

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

function matchRoute(
  method: string,
  url: string,
): { handler: LambdaHandler; pathParameters: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const paramNames: string[] = [];
    const regexStr = route.path.replace(/:([^/]+)/g, (_match, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

    const match = url.match(new RegExp(`^${regexStr}$`));
    if (!match) continue;

    const pathParameters: Record<string, string> = {};
    paramNames.forEach((name, i) => {
      pathParameters[name] = match[i + 1];
    });

    return { handler: route.handler, pathParameters };
  }

  return null;
}

// ---------------------------------------------------------------------------
// HTTP → Lambda event transformer
// ---------------------------------------------------------------------------

function toAPIGatewayEvent(
  req: IncomingMessage,
  body: string,
  pathParameters: Record<string, string>,
): APIGatewayProxyEvent {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const queryStringParameters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[key] = value;
  }

  return {
    httpMethod: req.method ?? "GET",
    path: url.pathname,
    pathParameters: Object.keys(pathParameters).length ? pathParameters : null,
    queryStringParameters: Object.keys(queryStringParameters).length
      ? queryStringParameters
      : null,
    headers,
    body: body || null,
  };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const { method, url } = req;

  // Read body
  let body = "";
  req.on("data", (chunk: Buffer) => (body += chunk));
  await new Promise((resolve) => req.on("end", resolve));

  console.log(`${method} ${url}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = new URL(url ?? "/", `http://localhost:${PORT}`).pathname;
  const matched = matchRoute(method!, pathname);

  if (!matched) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const event = toAPIGatewayEvent(req, body, matched.pathParameters);
    const result = await matched.handler(event);

    res.writeHead(result.statusCode, {
      "Content-Type": "application/json",
      ...result.headers,
    });
    res.end(result.body);
  } catch (error) {
    console.error("Server error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log(`\nRoutes:`);
  for (const route of routes) {
    console.log(
      `  ${route.method.padEnd(6)} http://localhost:${PORT}${route.path}`,
    );
  }
  console.log(`\nPress Ctrl+C to stop\n`);
});
