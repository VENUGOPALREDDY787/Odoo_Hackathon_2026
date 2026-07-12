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

---

## 3. Reusable DTO Standards

Every domain module must enforce identical DTO patterns using interfaces and class validators.

- **Create DTO (`Create<Entity>DTO`):** Captures registration data. Strictly validates required fields.
- **Update DTO (`Update<Entity>DTO`):** Optional fields representing mutations. Partial types.
- **Response DTO (`<Entity>ResponseDTO`):** Clears credentials and internal secrets.
- **Query DTO (`Query<Entity>DTO`):** Pagination parameters, search terms, and filter criteria.

---

## 4. API & Security Architecture

### REST Envelopes
- **Success:**
  ```json
  {
    "success": true,
    "message": "Resource resolved successfully",
    "data": {},
    "meta": null
  }
  ```
- **Error:**
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

---

## 6. Redis Architecture

### Caching Strategy
*   **Dashboard Cache:** Dashboard KPIs are cached per-organization (`org_<id>:dashboard_kpi`) with a 5-minute TTL. Invalidated upon asset allocation, return, or booking updates.
*   **Rate Limiter Storage:** Stores rate limit buckets per IP (`ratelimit:<ip>`).
*   **Token Store:** Rotated refresh tokens are cached (`token:refresh:<userId>:<token_hash>`) to enable blacklisting.

---

## 7. Cron Architecture

A centralized cron scheduler (`src/core/cron/scheduler.ts`) manages background tasks:
*   **Every 5 Minutes:** Overdue allocation checker and booking state transition updates.
*   **Every Midnight:** Lifecycle verification checks, maintenance reminders, and dashboard cache pre-warming.
*   **Every Month:** Monthly reporting summary generation.

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
