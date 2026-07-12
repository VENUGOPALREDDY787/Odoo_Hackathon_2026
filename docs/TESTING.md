# AssetFlow Enterprise Testing & QA Guide

This document outlines the testing strategy, architecture, and instructions for the AssetFlow Backend application. We enforce a high bar for code quality, focusing on reliability, concurrency, security, and maintainability.

## 1. Testing Architecture

AssetFlow uses a rigorous, multi-layered testing approach:

- **Unit Tests (`*.spec.ts`)**: Isolate business logic (services, helpers, middleware) using Jest. Database and external dependencies (Redis, Socket.io, BullMQ) are mocked.
- **Integration Tests (Workflows)**: Validate complete business flows (e.g. `Create -> Allocate -> Transfer`).
- **Concurrency Tests**: Verify transactional integrity (`SELECT FOR UPDATE`) under load to prevent double-bookings or conflicting allocations.
- **Security Tests**: Ensure `XSS` sanitization, rate limiting, and JWT validations hold up against malicious inputs.
- **Regression Tests**: Protect previously fixed bugs so they do not reappear during later refactors.
- **Smoke Tests**: Quick checks that confirm the application boots, key routes respond, and critical dependencies are wired correctly.

### Testing Pyramid

The preferred balance is:

1. **Many unit tests** for fast feedback.
2. **Some integration tests** for important workflows.
3. **Few end-to-end or load tests** for high-risk paths.

This keeps the suite fast enough to run frequently while still validating business-critical behavior.

### Tech Stack

- **Test Runner**: Jest
- **Compiler**: `@swc/jest` (bypasses `ts-jest` version constraints for rapid execution)
- **Assertions**: Built-in Jest `expect()`
- **Mocking**: Jest global mocks (`jest.mock`) via `src/tests/setup.ts`
- **Load Testing**: k6 or Artillery for staging and concurrency checks

---

## 2. Environment Setup

Before running tests locally, ensure your dependencies are installed:

```bash
cd backend
npm install
```

The test environment uses mocked dependencies, so you **do not** need a running MySQL or Redis instance for unit testing. The `src/tests/setup.ts` automatically provisions mocked Prisma and mocked ioredis clients.

### Recommended Local Setup

- Use a recent Node.js LTS version.
- Keep `.env.test` separate from `.env.development` and `.env.production`.
- Reset mock state between tests to avoid cross-test contamination.

---

## 3. How to Run Tests

### Running the Entire Suite

To run all tests across all modules:

```bash
npm run test
```

### Running Specific Test Suites

To run tests for a specific module (e.g. Booking or Allocation):

```bash
npx jest src/modules/allocation/tests/allocation.spec.ts
npx jest src/modules/booking/tests/conflict-detection.service.spec.ts
```

### Running Tests in Watch Mode

For development, run tests in watch mode:

```bash
npm run test:watch
```

### Running with Coverage

To generate a coverage report while running tests:

```bash
npm run test:cov
```

---

## 4. Writing Good Tests

### Test Structure

Use the Arrange / Act / Assert pattern:

- **Arrange**: Prepare inputs, mocks, and any required state.
- **Act**: Call the function or route being tested.
- **Assert**: Verify the expected output and side effects.

### Best Practices

- Test one behavior per test when possible.
- Prefer deterministic inputs and avoid timing-dependent assertions.
- Mock network, queue, and database dependencies.
- Cover both success and failure cases.
- Include boundary checks for empty values, invalid IDs, duplicate records, and unauthorized access.

### Naming Conventions

Good test names should describe the behavior being verified, for example:

- `should reject allocation when stock is unavailable`
- `should create booking when all validations pass`
- `should rollback transaction when transfer fails`

---

## 5. Code Coverage

We require **>95% code coverage** for core business logic files.

To generate a coverage report:

```bash
npm run test:cov
```

This generates an HTML report in `backend/coverage/lcov-report/index.html`. Open it in your browser to identify untested branches and lines.

### What Coverage Should Focus On

- Conditional branches
- Error handling paths
- Transaction rollback behavior
- Authorization checks
- Input validation and sanitization

Coverage numbers are helpful, but branch quality matters more than raw percentages.

---

## 6. Mocking Guide

Our tests are heavily isolated. Do not connect to real databases during unit test runs.

### Database (Prisma) Mocking

We use a centralized proxy mock in `src/tests/setup.ts` and `src/tests/mocks/prisma.mock.ts`.

- **Transactions**: For testing transaction blocks (`prisma.$transaction`), use the helper `mockPrismaTransaction(prismaMock)` in your `beforeEach` block.
- **Raw SQL**: `prisma.$queryRawUnsafe` is mocked to return arrays. Use `(prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([...])` to simulate row locks or raw queries.
- **Error Simulation**: Mock rejected promises to validate rollback and error mapping behavior.

### External Services

- **Redis (ioredis)**: Mocked to return standard `OK` / `PONG` responses.
- **BullMQ**: Queues and workers are mocked to instantly resolve without background processing.
- **Socket.io**: Broadcast functions (`emitToOrg`, `emitToUser`) execute harmlessly in memory.

### Helpful Mocking Tips

- Clear mocks in `beforeEach()` or `afterEach()`.
- Use `jest.spyOn()` when you only need to override one method.
- Prefer explicit mock return values over implicit defaults.

---

## 7. Integration and Workflow Testing

Integration tests should verify multiple layers working together.

### Good Candidates for Integration Tests

- Authentication and authorization flows
- Booking creation and conflict detection
- Allocation and transfer workflows
- Notification dispatch after entity changes
- Audit log creation after mutations

### What to Verify

- Correct status codes
- Database side effects
- Queue/job creation
- Event emission
- Rollback behavior on failure

Integration tests should exercise real application wiring where possible, while still avoiding unnecessary reliance on live infrastructure.

---

## 8. Security Testing

Security tests help protect against common application risks.

### Suggested Coverage

- **Input sanitization** for rich text, comments, and form fields
- **Authentication** failures for invalid or expired JWTs
- **Authorization** checks for forbidden resource access
- **Rate limiting** behavior under repeated requests
- **Injection resistance** for payloads intended to break queries or logic

### Example Security Scenarios

- A user cannot access another organization’s assets.
- A malformed token returns a consistent unauthorized response.
- Dangerous HTML is sanitized before persistence or rendering.

---

## 9. Performance and Load Testing Benchmark Guide

While unit tests handle correctness, we validate throughput using external tools such as Artillery or k6 against a staging environment.

### Target Benchmarks

- **Dashboard APIs**: < 100ms 95th percentile latency
- **Booking / Allocation APIs**: < 150ms 95th percentile latency, accounting for row locks
- **Concurrency**: Must sustain 1000 concurrent writes without deadlocks or row-lock exhaustion

For running a load test against your local server, ensure it is running via `npm run start`:

```bash
# Example k6 load test script (requires k6 installed)
k6 run tests/load/booking-concurrency.js
```

### Load Testing Tips

- Start with a low virtual user count and increase gradually.
- Watch CPU, memory, and database connection usage.
- Check for lock contention and slow queries.
- Repeat tests after major schema or transaction changes.

---

## 10. Continuous Integration (CI)

AssetFlow integrates directly with GitHub Actions. The `.github/workflows/ci.yml` pipeline automatically triggers on every push and pull request to the `main` branch.

It executes:

1. ESLint (`npm run lint`)
2. Jest unit suites (`npm test`)
3. Coverage report upload
4. Optional verification steps for critical workflows when configured

**No code is merged into `main` unless it successfully passes all CI workflow stages.**

### CI Checklist

Before opening a PR, confirm that:

- Tests pass locally
- Coverage does not drop unexpectedly
- New features include tests
- Mock updates are consistent with code changes

---

## 11. Troubleshooting

If tests fail unexpectedly:

- Re-run a single failing spec file with `npx jest <path-to-test>`.
- Check whether a mock needs to be reset or reinitialized.
- Confirm the test is not depending on execution order.
- Inspect stack traces for the first real failure, not the cascade of follow-up errors.
- Review recent changes in shared helpers or setup files.

### Common Issues

- **Flaky tests**: usually caused by shared mutable state or time-based assertions.
- **Mock leakage**: fix with proper cleanup between tests.
- **Transaction tests failing**: ensure the transaction mock matches the expected call order.
- **Coverage gaps**: add tests for edge cases and branch conditions.

---

## 12. Suggested Testing Checklist for New Features

When adding a new feature, aim to include:

- Unit tests for business logic
- Validation tests for bad inputs
- Authorization tests for access control
- Integration test for the main workflow
- Regression test for any bug fixed along the way
- Coverage for error and rollback paths

A feature is not complete until the important success and failure paths are both tested.
