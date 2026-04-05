# Getting Started

## Prerequisites

- [Node 22+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://docs.docker.com/get-docker/) (for local DynamoDB)
- [Terraform](https://developer.hashicorp.com/terraform/downloads) (for IaC validation)

## Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start local DynamoDB:**

   ```bash
   docker compose up -d
   ```

   This starts DynamoDB Local on port 8000 and creates the `ExamItems` table with the production schema (composite key, GSIs).

3. **Start the development server:**

   ```bash
   pnpm dev
   ```

   The server starts at `http://localhost:3000` with hot reload. The `.env` file configures it to use the local DynamoDB automatically.

4. **Test the endpoints:**

   ```bash
   # Create an item
   curl -s -X POST http://localhost:3000/api/items \
     -H "Content-Type: application/json" \
     -d '{
       "subject": "AP Biology",
       "itemType": "multiple-choice",
       "difficulty": 3,
       "content": {
         "question": "What is photosynthesis?",
         "options": ["A", "B", "C", "D"],
         "correctAnswer": "A",
         "explanation": "Photosynthesis is the process..."
       },
       "metadata": {
         "author": "test-author",
         "status": "draft",
         "tags": ["biology", "photosynthesis"]
       },
       "securityLevel": "standard"
     }' | jq

   # Get an item (replace {id} with the id from the create response)
   curl -s http://localhost:3000/api/items/{id} | jq

   # Update an item
   curl -s -X PUT http://localhost:3000/api/items/{id} \
     -H "Content-Type: application/json" \
     -d '{"difficulty": 5}' | jq

   # List items (with optional filters)
   curl -s 'http://localhost:3000/api/items?status=draft&limit=10' | jq

   # Create a version snapshot
   curl -s -X POST http://localhost:3000/api/items/{id}/versions | jq

   # Get audit trail
   curl -s http://localhost:3000/api/items/{id}/audit | jq
   ```

## Project Structure

```
src/
├── handlers/              # One Lambda handler per file
│   ├── createItem.ts      # POST   /api/items
│   ├── getItem.ts         # GET    /api/items/:id
│   ├── updateItem.ts      # PUT    /api/items/:id
│   ├── listItems.ts       # GET    /api/items
│   ├── createVersion.ts   # POST   /api/items/:id/versions
│   └── getAuditTrail.ts   # GET    /api/items/:id/audit
├── validation/
│   └── schemas.ts         # Zod schemas for request validation
├── storage/
│   ├── interface.ts       # Storage contract
│   ├── memory.ts          # In-memory storage (default for tests)
│   ├── dynamodb.ts        # DynamoDB storage (version-0 convention)
│   └── index.ts           # Singleton factory (selects backend via env vars)
├── types/
│   ├── item.ts            # ExamItem types and interfaces
│   └── lambda.ts          # APIGatewayProxyEvent/Result types
├── __tests__/
│   ├── helpers.ts         # Shared test utilities (makeEvent, createTestItem)
│   ├── createItem.test.ts
│   ├── getItem.test.ts
│   ├── updateItem.test.ts
│   ├── listItems.test.ts
│   ├── createVersion.test.ts
│   └── getAuditTrail.test.ts
└── server.ts              # Local dev server (config-based router, HTTP → Lambda event transform)

iac/
├── main.tf                # Provider config, S3 deployment bucket, Lambda module invocations
├── api_gateway.tf         # REST API, path resources, deployment, stage, throttling, logging
├── dynamodb.tf            # ExamItems table (id + version key, 2 GSIs, PITR)
├── variables.tf           # Region, environment, project name
├── outputs.tf             # API URL, table info, function ARNs
├── versions.tf            # Terraform and provider version constraints
└── lambda/                # Reusable Lambda module
    ├── main.tf            # Function, S3 artifact, log group, conditional APIGW integration
    ├── variables.tf       # Module interface
    ├── iam.tf             # Per-function IAM role and policies
    └── outputs.tf         # Function ARN, invoke ARN, integration IDs
```

## Architecture

### Local Development vs Lambda Deployment

**Local development** uses `server.ts` — a config-based router that transforms incoming HTTP requests into `APIGatewayProxyEvent` objects and dispatches them to the handler functions. A `.env` file configures the DynamoDB connection. Docker Compose runs DynamoDB Local with the same table schema as production.

**Lambda deployment** uses API Gateway to route requests to individual Lambda functions. Each handler file exports a `handler` function that accepts an `APIGatewayProxyEvent` and returns an `APIGatewayProxyResult`. The handlers are identical in both environments — the server is the only component aware of the local/Lambda distinction.

### Data Model

The DynamoDB table uses a version-0 convention:
- `SK=0` is the current item state (overwritten on updates)
- `SK=1, 2, 3...` are immutable historical snapshots

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details on schema design, access patterns, and infrastructure choices.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run compiled JS |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Run tests with interactive UI |

## Validating Infrastructure

```bash
cd iac
terraform init
terraform validate
```
