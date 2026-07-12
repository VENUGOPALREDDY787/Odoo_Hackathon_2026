# AssetFlow Enterprise Testing & QA Guide

This document outlines the testing strategy, architecture, and instructions for the AssetFlow Backend application. We enforce a high bar for code quality, focusing on Reliability, Concurrency, Security, and Production Readiness.

## 1. Testing Architecture

AssetFlow uses a rigorous, multi-layered testing approach:

- **Unit Tests (`*.spec.ts`)**: Isolate business logic (Services, Helpers, Middleware) using Jest. Database and external dependencies (Redis, Socket.io, BullMQ) are mocked.
- **Integration Tests (Workflows)**: Validates complete business flows (e.g. `Create -> Allocate -> Transfer`).
- **Concurrency Tests**: Verifies transactional integrity (`SELECT FOR UPDATE`) under load to prevent double-bookings or conflicting allocations.
- **Security Tests**: Ensures `XSS` sanitization, Rate Limiting, and JWT validations hold up against malicious inputs.

### Tech Stack
- **Test Runner**: Jest
- **Compiler**: `@swc/jest` (Bypasses `ts-jest` version constraints for rapid execution)
- **Assertions**: Built-in Jest `expect()`
- **Mocking**: Jest global mocks (`jest.mock`) via `src/tests/setup.ts`

---

## 2. Environment Setup

Before running tests locally, ensure your dependencies are installed:
```bash
cd backend
npm install
```

The test environment uses mocked dependencies, so you **do not** need a running MySQL or Redis instance for unit testing. The `src/tests/setup.ts` automatically provisions mocked Prisma and mocked ioredis clients.

---

## 3. How to Run Tests

### Running the Entire Suite
To run all tests across all modules:
```bash
npm run test
```

### Running Specific Test Suites
To run tests for a specific module (e.g., Booking or Allocation):
```bash
npx jest src/modules/allocation/tests/allocation.spec.ts
npx jest src/modules/booking/tests/conflict-detection.service.spec.ts
```

### Running Tests in Watch Mode (For Development)
```bash
npm run test:watch
```

---

## 4. Code Coverage

We require **>95% code coverage** for core business logic files. 
To generate a coverage report:
```bash
npm run test:cov
```
This generates an HTML report in `backend/coverage/lcov-report/index.html`. Open it in your browser to identify untested branches and lines.

---

## 5. Mocking Guide

Our tests are heavily isolated. Do not connect to real databases during unit test runs.

### Database (Prisma) Mocking
We use a centralized proxy mock in `src/tests/setup.ts` and `src/tests/mocks/prisma.mock.ts`.
- **Transactions**: For testing transaction blocks (`prisma.$transaction`), use the helper `mockPrismaTransaction(prismaMock)` in your `beforeEach` block.
- **Raw SQL**: `prisma.$queryRawUnsafe` is mocked to return arrays. Use `(prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([...])` to simulate row locks or raw queries.

### External Services
- **Redis (ioredis)**: Mocked to return standard `OK` / `PONG` responses.
- **BullMQ**: Queues and Workers are mocked to instantly resolve without background processing.
- **Socket.io**: Broadcast functions (`emitToOrg`, `emitToUser`) execute harmlessly in memory.

---

## 6. Performance & Load Testing Benchmark Guide

While unit tests handle correctness, we validate throughput using external tools (like Artillery or k6) against a staging environment.

### Target Benchmarks
- **Dashboard APIs**: < 100ms 95th percentile latency.
- **Booking / Allocation APIs**: < 150ms 95th percentile latency (accounting for row locks).
- **Concurrency**: Must sustain 1000 concurrent writes without deadlocks or row-lock exhaustion.

For running a load test against your local server (Ensure it is running via `npm run start`):
```bash
# Example k6 load test script (requires k6 installed)
k6 run tests/load/booking-concurrency.js
```

---

## 7. Continuous Integration (CI)

AssetFlow integrates directly with GitHub Actions. The `.github/workflows/ci.yml` pipeline automatically triggers on every Push and Pull Request to the `main` branch. 

It executes:
1. ESLint (`npm run lint`)
2. Jest Unit Suites (`npm test`)
3. Coverage Report Upload 

**No code is merged into `main` unless it successfully passes all CI workflow stages.**
