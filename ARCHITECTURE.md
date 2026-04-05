# Architecture Documentation

## Data Model Design

### DynamoDB Table Schema

**Table:** `{project}-{env}-ExamItems`

| Key | Attribute | Type | Purpose |
|-----|-----------|------|---------|
| Partition Key | `id` | String (UUID) | Item identity |
| Sort Key | `version` | Number | Version-0 convention (see below) |

**Version-0 Convention:**
- `SK=0` is always the current state of the item. Overwritten on every update.
- `SK=1, 2, 3...` are immutable historical snapshots. Written once, never modified.

This gives us O(1) point reads for the current item via `GetItem(id, 0)` — no query overhead. Audit trail is a simple `Query(id, SK > 0)` returning all versions in chronological order. Every write (create, update, version) is a `TransactWriteItems` that atomically updates the SK=0 record and appends a new snapshot, so the table is always consistent.

### Global Secondary Indexes

| Index | Partition Key | Sort Key | Use Case |
|-------|--------------|----------|----------|
| `status-lastModified-index` | `status` (S) | `lastModified` (N) | List items filtered by workflow status, sorted by recency |
| `subject-lastModified-index` | `subject` (S) | `lastModified` (N) | List items filtered by subject area, sorted by recency |

Both GSIs project ALL attributes. Queries apply `FilterExpression: version = 0` to exclude historical snapshots from list results.

### Pagination

Cursor-based pagination using DynamoDB's `ExclusiveStartKey`/`LastEvaluatedKey`, base64-encoded as an opaque `cursor` token returned to clients. This avoids the performance cliff of offset-based pagination on large datasets — every page is the same cost regardless of depth.

### Configuration

- Billing: `PAY_PER_REQUEST` — no capacity planning needed, scales to zero when idle.
- Point-in-time recovery enabled as a safety net against accidental data loss.

## Infrastructure Choices

### Serverless Architecture

Each API endpoint is a separate Lambda function behind a shared API Gateway. This gives independent scaling per endpoint, isolated failure domains, and granular CloudWatch metrics. The trade-off is cold start latency, which is acceptable for an item management API that is not latency-critical.

### Terraform Module Design

A reusable `lambda` module accepts a handler path, environment variables, a DynamoDB table ARN, and an optional list of API Gateway endpoint configs. If the endpoint list is empty, no API Gateway integration is created — this leaves room for event-driven Lambdas (EventBridge, SQS) without changing the module interface.

All API Gateway path resources (`/api`, `/api/items`, `/api/items/{id}`, etc.) are defined centrally in `api_gateway.tf`. The lambda module only creates methods and integrations on those resources, avoiding conflicts when multiple Lambdas share a path segment (e.g., GET and PUT on `/api/items/{id}`).

### IAM

Each Lambda has its own IAM role with:
- CloudWatch Logs permissions scoped to its own log group.
- DynamoDB permissions scoped to the table ARN and its indexes.

No shared roles. This is more verbose but means a compromised function cannot affect resources outside its scope.

### Deployment Artifacts

Lambda code is zipped and uploaded to a versioned S3 bucket with all public access blocked. The deployment trigger uses a content hash so Lambdas are only updated when code actually changes.

### Local Development

A `docker-compose.yml` runs DynamoDB Local on port 8000 with an init container that creates the table with the same schema and GSIs as production. The Node server loads a `.env` file via `dotenv/config` — handlers are completely unaware of dotenv and read `process.env` the same way they would in Lambda.

## Security

### Current Implementation

- API Gateway throttling at 100 req/s with burst to 200.
- Access logging on the API Gateway stage to CloudWatch.
- S3 deployment bucket blocks all public access with versioning enabled.
- Zod validation on all request bodies with strict schemas — unexpected fields are rejected, enums are enforced, ranges are bounded.
- IAM roles are per-function with least-privilege DynamoDB and CloudWatch scopes.

### Future: Multi-Tenant Access Control

In a production system, items would be scoped to courses and institutions/organizations. This introduces a multi-tenant access control model:

- **Partition isolation:** Items would carry an `organizationId` and `courseId`. A GSI on `organizationId` would enable efficient per-tenant queries. Row-level access would be enforced at the handler layer, verifying the caller's tenant context against the item's ownership before any read or write.
- **API Gateway authorization:** Replace `authorization = "NONE"` with a Cognito authorizer or Lambda authorizer that validates JWTs and extracts tenant claims. The authorizer output would populate `event.requestContext.authorizer` so handlers can enforce ownership without a second auth check.
- **Performance consideration:** Adding organization-scoped authorization means every request needs a tenant lookup. This should use the JWT claims directly rather than a database round-trip. For cross-organization queries (e.g., a platform admin listing all items), a separate GSI or a dedicated admin role with broader IAM permissions would be needed to avoid full table scans.

## Scalability and Performance

### What Scales Well

- **DynamoDB with PAY_PER_REQUEST** scales automatically. The version-0 convention ensures reads are always point lookups (single-digit ms), and writes are bounded to 2 items per transaction regardless of version count.
- **Per-endpoint Lambda functions** scale independently. A spike in list queries does not affect create/update throughput.
- **GSI-backed list queries** are O(partition size), not O(table size). Filtering by status or subject reads only the relevant partition.

### Performance Considerations

- **Audit trail queries** grow linearly with version count. For items with hundreds of versions, the response payload could become large. A `limit` parameter on the audit trail endpoint would cap this, and cursor-based pagination could be added if needed.
- **Scan fallback for unfiltered list:** When no status or subject filter is provided, `listItems` falls back to a table scan with `version = 0` filter. At scale this becomes expensive. A dedicated GSI for listing all current items (e.g., on a synthetic partition key like `ITEM` + `lastModified` sort key) would eliminate the scan.
- **Multi-tenant filtering:** When organization-scoped access is added, combining tenant filtering with status/subject filtering may require composite GSI keys (e.g., `orgId#status` as partition key) to avoid filter-heavy queries that read more data than they return.

## Trade-offs

### What Was Prioritized

- **All 6 endpoints** with full Zod validation, error handling, and test coverage (38 tests).
- **Complete DynamoDB implementation** with transactional writes, versioning, and audit trail — not just the in-memory storage.
- **Production-grade Terraform** with reusable modules, per-function IAM, S3-based deployment, and API Gateway throttling/logging.
- **Local development parity** via Docker Compose + DynamoDB Local with the same schema as production.

### What Would Come Next

- **Exam-to-item relationships:** Items exist independently today, but in practice they belong to exams. An exam would reference items by ID, and the same item could appear in multiple sections of the same course. This requires a separate `Exams` table with a many-to-many relationship (likely a junction table or a list attribute of item IDs per section). The item API would need a reverse lookup — "which exams use this item?" — supported by a GSI on the junction table.
- **Answer collection and validation:** If students submit answers against items, the system needs strict validation around acceptable answer formats per item type (e.g., a single option index for multiple-choice, free text within a character limit for essays). Answer records would be a separate table keyed by `studentId + itemId + attemptId`, with the item's `correctAnswer` used for automated scoring where applicable. Format validation schemas would be derived from the item's `itemType` at submission time.
- **Authorization layer:** Cognito or a custom Lambda authorizer, with tenant claims driving row-level access as described in the Security section.
- **CI/CD pipeline:** Automated `pnpm build` → `terraform plan` → `terraform apply` on merge. The S3 deployment bucket and content-hash-based keys are already designed for this.
- **Observability:** X-Ray tracing on Lambda and API Gateway, custom CloudWatch metrics for business-level monitoring (items created per day, version frequency), and alarms on error rates.
