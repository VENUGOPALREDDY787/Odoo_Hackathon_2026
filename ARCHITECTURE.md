# AssetFlow — Backend Architecture Standards & Design Blueprint

This document defines the permanent structural standards, layer responsibilities, protocols, security frameworks, and environment setups for the AssetFlow ERP backend.

---

## 1. Domain Driven Layered Architecture (DDD-LA)

```text
src/
├── config/             # Config Loader & Environmental Validation (Zod)
├── core/               # Global Infrastructure Layer (Singletons, Base Classes, Wrappers)
├── database/           # Prisma client adapters and seeding
├── middlewares/         # HTTP Gatekeepers (Security, Auth, Rate-limiters, Logging)
├── constants/          # Global System-wide Enums and Code Maps
├── types/              # Domain-spanning Type Interfaces
├── utils/              # Reusable Helper Utilities (Query, Pagination, Dates)
└── modules/            # Business Domain Modules (Auth, Employee, Asset, etc.)
```

### Folder Responsibilities & Constraints

| Folder | Core Responsibility | What should NEVER go here |
| :--- | :--- | :--- |
| `src/config/` | Reading process environments and running schema validation. | Business or database logic. |
| `src/core/` | Singletons and framework adapters (Redis, Prisma, Mailers). | Express route definitions or controllers. |
| `src/middlewares/` | Intercepting, parsing, and authenticating HTTP traffic. | Direct SQL execution or domain specific logic. |
| `src/utils/` | Stateless, generic utility libraries (string, math, dates). | Business rules, database models, state transitions. |
| `src/modules/` | Self-contained domain-driven business slices. | Cross-module class sharing without injection/interfaces. |

### Request Lifecycle Flow

1. **HTTP Request Entry**
   - A client request enters through the Express server and is first processed by global middleware.
   - Security headers, CORS, request parsing, and rate limiting are applied before any business logic executes.

2. **Route Resolution**
   - Routes should remain thin and only delegate to module controllers.
   - Controllers must not contain direct database or infrastructure logic.

3. **Validation & Authorization**
   - DTOs validate payload shape, type safety, and required fields.
   - Authentication middleware verifies JWT claims and attaches the current user context.
   - Authorization checks ensure the user has the required role or permission for the requested action.

4. **Application / Service Layer Execution**
   - Service classes coordinate business rules, invariants, and multi-step workflows.
   - Services may call repositories, external providers, or core adapters through interfaces.

5. **Data Access Layer**
   - Repository or database adapter classes handle Prisma queries and persistence logic.
   - Database access must remain isolated from controllers and middleware.

6. **Response Mapping**
   - Domain objects are mapped into response DTOs.
   - Responses are wrapped in the standardized success/error envelope before being returned.

7. **Side Effects & Events**
   - Events, notifications, cache invalidation, or socket emissions are triggered after successful state changes.
   - Background jobs should be used for expensive or delayed operations.

### Dependency Direction

The architecture must follow a strict top-down dependency flow:

`Controller -> Service -> Repository/Adapter -> Database`

- Higher layers may depend on abstractions from lower layers, not concrete implementations.
- Modules should communicate through interfaces, events, or shared contracts instead of importing each other directly.
- Infrastructure concerns such as Redis, email, and file storage must be injected rather than instantiated in feature code.

### Module Structure Example

```text
src/modules/asset/
├── asset.controller.ts
├── asset.service.ts
├── asset.repository.ts
├── asset.dto.ts
├── asset.routes.ts
├── asset.mapper.ts
└── asset.events.ts
```

### Module Flow Rules

- **Controllers** accept requests, validate inputs, and return HTTP responses.
- **Services** coordinate business rules and transactional behavior.
- **Repositories** encapsulate persistence and query patterns.
- **Mappers** convert between persistence models, domain models, and response DTOs.
- **Events** describe important domain state changes for sockets, jobs, and cache invalidation.

---

## 2. Reusable Interface Standards

All model schemas, response wrappers, and token decodes must inherit from defined global TypeScript interfaces inside `src/types/`.

### Paginated Requests & Queries
```typescript
export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface ISortedParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface ISearchFilterParams {
  search?: string;
  filters?: Record<string, any>;
}

export interface IPaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Shared Contract Rules

- All API requests that support listing must accept pagination and sorting in a consistent format.
- Query DTOs should extend common pagination/filter interfaces wherever possible.
- Response DTOs must omit secrets such as passwords, refresh tokens, internal flags, and audit-only fields.
- Domain-specific enums should be centralized under `src/constants/` to avoid duplication.

---

## 3. Reusable DTO Standards

Every domain module must enforce identical DTO patterns using interfaces and class validators.

- **Create DTO (`Create<Entity>DTO`):** Captures registration data. Strictly validates required fields.
- **Update DTO (`Update<Entity>DTO`):** Optional fields representing mutations. Partial types.
- **Response DTO (`<Entity>ResponseDTO`):** Clears credentials and internal secrets.
- **Query DTO (`Query<Entity>DTO`):** Pagination parameters, search terms, and filter criteria.

### DTO Design Rules

- DTOs must remain transport-layer only and never contain persistence-specific concerns.
- Validation decorators or Zod schemas should fail fast with clear messages.
- Nested DTOs should be used for complex payloads instead of untyped objects.
- DTO naming must remain consistent across all modules for discoverability and maintainability.

---

## 4. API & Security Architecture

### REST Envelopes
- **Success:"
  ```json
  {
    "success": true,
    "message": "Resource resolved successfully",
    "data": {},
    "meta": null
  }
  ```
- **Error:"
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "The requested entity does not exist",
      "details": null
    }
  }
  ```

### Security Flow
1. **Helmet & CORS:** Enforce strict CSP headers, frame-guard constraints, and origin whitelisting.
2. **Rate Limiting:** Redis-based rate limiting (100 requests per 15 minutes per IP/User for standard routes, 5 requests per 15 minutes for auth/login endpoints).
3. **JWT Authentication:** Short-lived access tokens (15 mins) and rotating refresh tokens (7 days) saved securely.
4. **Input Sanitization:** Express validator/Zod schemas reject any undeclared query or body inputs, protecting against XSS and prototype pollution.

### Error Handling Flow

- Throw domain-specific errors from services, not raw framework errors.
- Map application errors to stable error codes in a central error handler.
- Never expose stack traces or internal database messages in production responses.
- Convert validation failures into structured field-level feedback for clients.

### Authorization Model

- Permissions should be checked at the service boundary, not only at the route level.
- Support organization-scoped access control for multi-tenant data isolation.
- Role-based checks should be centralized so that the same rule applies across REST, Socket.IO, and cron-triggered operations.

---

## 5. Socket.IO Architecture

### Connection Handshake
Clients connect to `/` with JWT credentials. Upon verification, the connection joins:
*   `user_<id>`: For personal user notifications.
*   `org_<org_id>`: Organization-wide real-time broadcasts.
*   `org_<org_id>_<role>`: Role-specific notifications (e.g., Asset Managers or Admins).

### Event Naming Conventions
*   **Asset Events:** `asset:created`, `asset:updated`, `asset:deallocated`
*   **Booking Events:** `booking:created`, `booking:cancelled`, `booking:started`
*   **Maintenance Events:** `maintenance:requested`, `maintenance:approved`, `maintenance:resolved`
*   **Audit Events:** `audit:created`, `audit:verified`, `audit:closed`

### Real-Time Event Flow

1. A domain action is completed in the service layer.
2. The service emits a domain event or returns a result to the orchestration layer.
3. The event dispatcher determines the target rooms and event payload.
4. Socket.IO broadcasts the update to subscribed clients.
5. Clients refresh visible state or update cache-local data.

### Realtime Design Principles

- Only emit events after the database transaction succeeds.
- Keep event payloads minimal and DTO-based.
- Use room-based delivery for tenant isolation and reduced noise.
- Make event names stable and descriptive so frontend consumers can subscribe consistently.

---

## 6. Redis Architecture

### Caching Strategy
*   **Dashboard Cache:** Dashboard KPIs are cached per-organization (`org_<id>:dashboard_kpi`) with a 5-minute TTL. Invalidated upon asset allocation, return, or booking updates.
*   **Rate Limiter Storage:** Stores rate limit buckets per IP (`ratelimit:<ip>`).
*   **Token Store:** Rotated refresh tokens are cached (`token:refresh:<userId>:<token_hash>`) to enable blacklisting.

### Cache Flow

- Read-through caching should be used for expensive dashboard or summary queries.
- Writes that affect cached summaries must invalidate or refresh related keys immediately.
- Cache keys must include tenant or organization context to prevent cross-tenant leakage.
- Use Redis for ephemeral state only; persistent source of truth remains the database.

---

## 7. Cron Architecture

A centralized cron scheduler (`src/core/cron/scheduler.ts`) manages background tasks:
*   **Every 5 Minutes:** Overdue allocation checker and booking state transition updates.
*   **Every Midnight:** Lifecycle verification checks, maintenance reminders, and dashboard cache pre-warming.
*   **Every Month:** Monthly reporting summary generation.

### Background Job Flow

- Cron jobs should enqueue or trigger discrete tasks rather than doing large synchronous work inline.
- Long-running jobs should be broken into idempotent steps.
- Each job must be safe to rerun if it fails midway.
- Job execution should log success, failure, duration, and affected entities.

### Operational Considerations

- Avoid overlapping executions by using locks or lease-based coordination where needed.
- Schedule jobs in a single authoritative runtime to prevent duplicate processing.
- Prefer background processing for maintenance, cleanup, and reporting operations.

---

## 8. Git & CI/CD Strategy

### Branching Strategy
*   `main`: Mirror of production. Only release and hotfix merges.
*   `develop`: Integration branch for developers. Main development target.
*   `feature/*`: Feature-specific branches branched from and merged to `develop`.
*   `release/*`: Preparing staging releases. Branched from `develop` and merged to `main` and `develop`.
*   `hotfix/*`: Emergency production patches. Branched from `main` and merged to `main` and `develop`.

### CI/CD Workflow (`.github/workflows/ci.yml`)
1. **Linting:** Runs ESLint and Prettier.
2. **Type Checking:** Runs `tsc --noEmit` to verify type safety.
3. **Testing:** Executes Jest unit and integration tests.
4. **Docker Build:** Compiles a production-ready Docker image.

### Deployment Flow

- Merge feature branches into `develop` after code review and green checks.
- Promote `develop` to a release branch for staging validation.
- Merge release branches into `main` only after verification.
- Use hotfix branches for urgent production issues and back-merge fixes into `develop`.

### Quality Gates

- No merge without passing lint, tests, and type checks.
- Add or update tests for any changed business rule.
- Keep module boundaries clean and avoid direct cross-module imports.
- Prefer incremental, reviewable commits over large mixed-purpose changes.

### Recommended Repository Conventions

- Keep module code close to its feature boundary.
- Centralize environment parsing and runtime validation in `src/config/`.
- Keep shared helpers small, pure, and well-tested.
- Document new modules with their public contracts and event behavior.

---

## 9. Observability & Operational Standards

### Logging

- Use structured JSON logs for application and audit events.
- Include request ID, user ID, organization ID, route, status code, and duration where available.
- Log errors once at the boundary where they are handled.

### Monitoring

- Track API latency, error rate, cron job failures, cache hit ratio, and socket connection health.
- Emit metrics for important business actions such as asset allocation, booking approval, and maintenance resolution.
- Alert on repeated authentication failures or unusually high rate-limit activity.

### Auditability

- Important state changes must be traceable through logs or audit tables.
- Include before/after snapshots when modifying sensitive records.
- Ensure admin actions remain reviewable for compliance and debugging.

---

## 10. Environment & Configuration Standards

- All configuration values must be read from environment variables and validated at startup.
- Missing or invalid configuration should fail fast during boot.
- Secrets must never be hardcoded in modules or committed to version control.
- Feature flags and environment-specific behavior should be centralized in config helpers.

### Common Environment Categories

- **App runtime:** port, node environment, base URL.
- **Database:** connection URL, pool settings, migration mode.
- **Redis:** host, port, auth, TTL defaults.
- **JWT:** access secret, refresh secret, token expiry values.
- **Integrations:** mail provider, file storage, webhook endpoints.

---

## 11. Architecture Decision Rules

- Prefer composition over inheritance for business logic.
- Keep business rules deterministic and side-effect free where possible.
- Move reusable logic into services or utilities only if it is truly shared.
- Avoid framework lock-in by keeping domain code independent from Express-specific APIs.
- Any new module must define its routes, DTOs, service layer, repository layer, and event boundaries before implementation.

---

## 12. Recommended End-to-End Flow Summary

**Typical request flow:**

`Client -> Middleware -> Route -> Controller -> DTO Validation -> Service -> Repository -> Database -> Mapper -> Response Envelope -> Client`

**Typical asynchronous flow:**

`Service -> Domain Event -> Socket Notification / Cache Invalidation / Cron Job -> Client or Background Worker`

**Typical read flow:**

`Client -> Middleware -> Route -> Controller -> Cache Lookup -> Repository Fallback -> Mapper -> Response Envelope`

This flow keeps the system secure, scalable, testable, and easy to extend as new AssetFlow modules are introduced.
