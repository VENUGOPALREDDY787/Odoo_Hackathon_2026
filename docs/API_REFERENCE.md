# AssetFlow Backend — API Reference

This document describes the backend APIs for AssetFlow in a way that is easier to scan, implement against, and maintain.

## Quick Overview

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Authentication:** Protected routes require `Authorization: Bearer <access_token>`.
- **Global Rate Limit:** 100 requests per minute per IP
- **Auth Rate Limit:** 10 requests per 15 minutes per IP for `/api/auth/*`

## How to Read This Document

Each endpoint section includes:

- **Purpose** — what the endpoint is for
- **Auth** — whether a token is required and which roles can use it
- **Request** — body or query parameters
- **Response** — expected response shape when useful
- **Notes** — extra behavior, scoping rules, or constraints

## Standard Response Shapes

Most endpoints return one of the following structures.

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": null
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error message describing what went wrong",
    "details": null
  }
}
```

## Roles and Access Control

The API uses role-based access control (RBAC):

| Role | Description |
| --- | --- |
| `Admin` | Full administrative access across organizations, settings, audit logs, and configurations. |
| `Asset Manager` | Manages assets, allocations, returns, transfers, maintenance, and audits. |
| `Department Head` | Manages and views department-specific assets, requests, schedules, and approvals. |
| `Employee` | Standard staff role. Can view allocated assets, request transfers, make bookings, and raise maintenance tickets. |

## API Modules

### Authentication (`/api/auth`)

Authentication endpoints have stricter rate limits than the rest of the API.

#### POST `/api/auth/signup`
Registers a new user and creates an organization if `organizationId` is not provided.

- **Auth:** None
- **Request body:**

```json
{
  "name": "Employee Name",
  "email": "employee@example.com",
  "password": "SecurePassword123",
  "organizationId": "optional-organization-uuid"
}
```

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Employee registered successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "Employee Name",
      "email": "employee@example.com",
      "role": "Employee"
    },
    "organization": {
      "id": "org-uuid",
      "name": "Org Name"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

#### POST `/api/auth/login`
Authenticates a user and returns access and refresh tokens.

- **Auth:** None
- **Request body:**

```json
{
  "email": "employee@example.com",
  "password": "SecurePassword123"
}
```

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "Employee Name",
      "email": "employee@example.com",
      "role": "Admin",
      "organizationId": "org-uuid"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

#### POST `/api/auth/refresh`
Refreshes the token pair before expiry.

- **Auth:** None
- **Request body:**

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### POST `/api/auth/logout`
Invalidates the current session and refresh token state.

- **Auth:** Yes
- **Request body:**

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### POST `/api/auth/forgot-password`
Starts the password reset flow by emailing a reset token.

- **Auth:** None
- **Request body:**

```json
{ "email": "user@example.com" }
```

#### POST `/api/auth/reset-password`
Sets a new password using the emailed reset token.

- **Auth:** None
- **Request body:**

```json
{ "token": "reset-token", "password": "NewSecurePassword123" }
```

#### POST `/api/auth/change-password`
Updates the password for the currently authenticated user.

- **Auth:** Yes
- **Request body:**

```json
{ "oldPassword": "...", "newPassword": "..." }
```

### Departments (`/api/departments`)

#### GET `/api/departments`
Lists departments.

- **Auth:** Yes, any role
- **Query parameters:** `page`, `limit`, `status`, `search`
- **Notes:** `search` matches department name.

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "dept-uuid",
        "name": "Engineering",
        "status": "Active",
        "manager": { "id": "user-uuid", "name": "Manager Name" },
        "employeeCount": 14
      }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

#### POST `/api/departments`
Creates a department.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{
  "name": "Department Name",
  "parentId": "optional-parent-dept-uuid",
  "managerId": "optional-manager-user-uuid",
  "status": "Active"
}
```

#### PUT `/api/departments/:id`
Updates department details.

- **Auth:** Yes, `Admin` only

#### PUT `/api/departments/:id/deactivate`
Deactivates a department.

- **Auth:** Yes, `Admin` only
- **Notes:** Fails if the department still has active assets or employees.

#### PUT `/api/departments/:id/restore`
Reactivates a department.

- **Auth:** Yes, `Admin` only

#### PUT `/api/departments/:id/head`
Assigns a head manager to a department.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{ "employeeId": "employee-uuid" }
```

### Asset Categories (`/api/categories`)

#### GET `/api/categories`
Lists categories.

- **Auth:** Yes, any role

#### POST `/api/categories`
Creates a category.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{ "name": "Electronics", "description": "Laptops, phones..." }
```

#### PUT `/api/categories/:id`
Updates a category.

- **Auth:** Yes, `Admin` only

#### DELETE `/api/categories/:id`
Deletes a category.

- **Auth:** Yes, `Admin` only
- **Notes:** Delete fails if the category is referenced by assets.

### Employees (`/api/employees`)

#### GET `/api/employees/profile`
Returns the profile for the logged-in user.

- **Auth:** Yes

#### GET `/api/employees`
Lists employees.

- **Auth:** Yes
- **Query parameters:** `page`, `limit`, `search`, `departmentId`, `role`, `status`

#### PUT `/api/employees/:id/role`
Updates an employee role.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{ "role": "Admin | Asset Manager | Department Head | Employee" }
```

#### PUT `/api/employees/:id/department`
Assigns an employee to a department.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{ "departmentId": "dept-uuid" }
```

#### PUT `/api/employees/:id/status`
Activates or deactivates an employee account.

- **Auth:** Yes, `Admin` only
- **Request body:**

```json
{ "status": "Active | Inactive" }
```

### Assets (`/api/assets`)

#### GET `/api/assets`
Lists assets.

- **Auth:** Yes
- **Notes:** `Employee` users only see assets allocated to them.
- **Query parameters:** `page`, `limit`, `search`, `status`, `categoryId`, `location`, `condition`, `isShared`
- **Status values:** `Available`, `Allocated`, `Reserved`, `Under Maintenance`, `Lost`, `Retired`, `Disposed`

#### GET `/api/assets/:id`
Returns asset details, allocation information, and history.

- **Auth:** Yes

#### GET `/api/assets/:id/qrcode`
Returns QR code data for the asset.

- **Auth:** Yes

#### POST `/api/assets`
Registers a new asset.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Request body:**

```json
{
  "name": "Asset Name",
  "categoryId": "category-uuid",
  "serialNumber": "SN12345",
  "acquisitionDate": "2026-07-12T00:00:00.000Z",
  "acquisitionCost": 1200,
  "condition": "Excellent",
  "location": "Warehouse A",
  "isShared": false,
  "imageUrl": "optional-image-url",
  "documentsUrl": "optional-document-url",
  "warrantyExpiry": "2029-07-12T00:00:00.000Z",
  "maintenanceFrequency": "Monthly",
  "manufacturer": "Dell",
  "modelNumber": "Latitude 7420",
  "vendor": "Dell Direct",
  "description": "Developer Laptop",
  "customMetadata": {}
}
```

#### PUT `/api/assets/:id`
Updates asset fields.

- **Auth:** Yes, `Admin` or `Asset Manager`

#### DELETE `/api/assets/:id`
Archives an asset using soft delete.

- **Auth:** Yes, `Admin` or `Asset Manager`

#### POST `/api/assets/import`
Bulk imports assets.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Request body:**

```json
{
  "assets": []
}
```

#### GET `/api/assets/export/csv`
Downloads a CSV export of the filtered asset list.

- **Auth:** Yes, `Admin` or `Asset Manager`

### Allocations (`/api/allocations`)

#### GET `/api/allocations`
Lists allocations.

- **Auth:** Yes
- **Notes:** `Employee` users are scoped to their own records.
- **Query parameters:** `page`, `limit`, `status`, `employeeId`, `departmentId`

#### POST `/api/allocations`
Allocates an asset.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Notes:** Uses interactive transactions and row-level locks.
- **Request body:**

```json
{
  "assetId": "asset-uuid",
  "allocatedToType": "Employee",
  "employeeId": "employee-uuid",
  "departmentId": null,
  "expectedReturnDate": "2026-12-31T00:00:00.000Z"
}
```

#### POST `/api/allocations/bulk`
Bulk allocates multiple assets.

- **Auth:** Yes
- **Request body:**

```json
{ "allocations": [] }
```

#### POST `/api/allocations/:assetId/return`
Returns an allocated asset.

- **Auth:** Yes, `Admin`, `Asset Manager`, or `Department Head`
- **Request body:**

```json
{
  "returnCondition": "Good",
  "returnNotes": "Returned in normal condition"
}
```

#### POST `/api/allocations/bulk/return`
Bulk returns allocated assets.

- **Auth:** Yes
- **Request body:**

```json
{ "assetIds": ["uuid-1", "uuid-2"], "returnCondition": "Good" }
```

### Transfers (`/api/transfers`)

#### GET `/api/transfers`
Lists transfer requests.

- **Auth:** Yes

#### POST `/api/transfers`
Creates a transfer request.

- **Auth:** Yes
- **Request body:**

```json
{
  "assetId": "asset-uuid",
  "toEmployeeId": "employee-uuid",
  "toDepartmentId": null,
  "requestNotes": "Need for project work"
}
```

#### PUT `/api/transfers/:id/cancel`
Cancels a pending transfer request.

- **Auth:** Yes
- **Notes:** The service layer enforces requester-only cancellation.

#### PUT `/api/transfers/:id/approve`
Approves a transfer.

- **Auth:** Yes, `Admin` or `Asset Manager`

#### PUT `/api/transfers/:id/reject`
Rejects a transfer.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Request body:**

```json
{ "rejectionReason": "..." }
```

### Bookings (`/api/bookings`)

Bookings are used for shared or bookable assets such as meeting rooms or shared devices.

#### POST `/api/bookings`
Creates a booking.

- **Auth:** Yes
- **Notes:** Fails if the requested time conflicts with another booking.
- **Request body:**

```json
{
  "assetId": "asset-uuid",
  "startTime": "2026-07-20T10:00:00.000Z",
  "endTime": "2026-07-20T11:00:00.000Z",
  "notes": "Project demo meeting",
  "bookedOnBehalfOfDeptId": "dept-uuid"
}
```

#### PUT `/api/bookings/:id/reschedule`
Updates the time range for an existing booking.

- **Auth:** Yes
- **Request body:**

```json
{ "startTime": "...", "endTime": "...", "reason": "..." }
```

#### GET `/api/bookings/calendar/today`
Returns today's active bookings.

- **Auth:** Yes

#### GET `/api/bookings/calendar/day`
Returns a day calendar view.

- **Auth:** Yes
- **Query:** `date=YYYY-MM-DD`

#### GET `/api/bookings/calendar/week`
Returns a week calendar view.

- **Auth:** Yes
- **Query:** `week=YYYY-MM-DD` where the value is the start of the week.

#### GET `/api/bookings/calendar/month`
Returns a month calendar view.

- **Auth:** Yes
- **Query:** `month=YYYY-MM`

### Maintenance (`/api/maintenance`)

#### POST `/api/maintenance`
Creates a maintenance request.

- **Auth:** Yes
- **Request body:**

```json
{
  "assetId": "asset-uuid",
  "issueDescription": "Screen flickering",
  "priority": "Medium"
}
```

- **Priority values:** `Low`, `Medium`, `High`, `Critical`

#### PUT `/api/maintenance/:id/approve`
Approves a maintenance ticket.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Request body:**

```json
{
  "assignedTechnician": "John Contractor",
  "estimatedCompletionDate": "2026-07-15T00:00:00.000Z",
  "estimatedCost": 150,
  "vendor": "Hardware Fix Ltd"
}
```

#### PUT `/api/maintenance/:id/complete`
Completes a maintenance ticket.

- **Auth:** Yes
- **Request body:**

```json
{
  "resolutionNotes": "Replaced internal display cable",
  "actualCost": 120,
  "actualCompletionDate": "2026-07-14T00:00:00.000Z"
}
```

Other supported transitions include: `/reject`, `/assign-technician`, `/start`, `/close`, and `/cancel`.

### Audit (`/api/audit`)

#### POST `/api/audit`
Creates an audit cycle.

- **Auth:** Yes, `Admin` or `Asset Manager`
- **Request body:**

```json
{
  "name": "Q3 IT Equipment Audit",
  "scopeType": "Category",
  "scopeCategoryId": "category-uuid",
  "scheduledStartDate": "2026-08-01T00:00:00.000Z",
  "scheduledEndDate": "2026-08-15T00:00:00.000Z",
  "auditorIds": ["user-uuid-1"]
}
```

- **Scope types:** `All`, `Department`, `Location`, `Category`

#### Audit workflow endpoints

- `PUT /api/audit/:id/schedule`
- `PUT /api/audit/:id/start` — creates verification checklist entries
- `PUT /api/audit/:id/complete`
- `PUT /api/audit/:id/close` — locks the audit checklist and logs discrepancies

#### POST `/api/audit/:id/verify/:assetId`
Submits verification for one asset during an audit.

- **Auth:** Yes
- **Request body:**

```json
{
  "verificationStatus": "Verified",
  "notes": "Verified at reception",
  "physicalLocation": "Reception",
  "conditionOnVerify": "Good"
}
```

- **Verification statuses:** `Verified`, `Missing`, `Damaged`, `Not Verified`

#### POST `/api/audit/:id/evidence/:assetId`
Uploads evidence for an audited asset.

- **Auth:** Yes
- **Request body:**

```json
{ "fileUrl": "...", "fileType": "image", "caption": "..." }
```

### Notifications (`/api/notifications`)

#### GET `/api/notifications/my`
Returns notifications for the current user.

- **Auth:** Yes

#### GET `/api/notifications/unread-count`
Returns the unread notification count.

- **Auth:** Yes
- **Response example:**

```json
{ "data": { "count": 4 } }
```

#### PUT `/api/notifications/read`
Marks notifications as read.

- **Auth:** Yes
- **Request body:**

```json
{ "ids": ["uuid-1", "uuid-2"] }
```

#### PUT `/api/notifications/preferences`
Updates notification delivery preferences.

- **Auth:** Yes
- **Request body:**

```json
{
  "emailEnabled": true,
  "inAppEnabled": true,
  "assetAssigned": true,
  "bookingReminders": true,
  "maintenanceUpdates": true,
  "auditEvents": true
}
```

### Dashboard (`/api/dashboard`)

Dashboard data is automatically scoped:

- Employees see their own data
- Department Heads see their department data
- Managers and Admins see organization-wide data

#### Available endpoints

- `GET /api/dashboard/summary` — high-level metrics
- `GET /api/dashboard/kpis` — KPI metrics
- `GET /api/dashboard/category-distribution` — count per category
- `GET /api/dashboard/utilization` — scoped utilization percentages
- `GET /api/dashboard/booking-heatmap` — hot hours and day grid data
- `GET /api/dashboard/maintenance-cost-trend` — monthly cost trends

### Reports (`/api/reports`)

All report endpoints support the `format` query parameter:

- `json`
- `csv`
- `pdf`
- `xlsx`

#### Available reports

- `GET /api/reports/utilization`
- `GET /api/reports/department-allocation`
- `GET /api/reports/employee-allocation`
- `GET /api/reports/maintenance-cost`
- `GET /api/reports/warranty-expiry`
- `GET /api/reports/missing-assets`
- `GET /api/reports/damaged-assets`
- `GET /api/reports/analytics` — BI summary with growth and reliability analysis

## Real-Time Events

The backend exposes a Socket.IO gateway for real-time updates.

- **Connection URL:** `ws://localhost:5000`
- **Authentication:** pass the access token in the auth handshake

```javascript
const socket = io('ws://localhost:5000', {
  auth: { token: accessToken }
});
```

### Events

| Event | When it fires | Payload |
| --- | --- | --- |
| `notification` | A user receives a targeted notification | `{ "title": "...", "message": "..." }` |
| `allocation.created` | Allocation created in the organization | Org-wide stream |
| `booking.created` | Booking created in the organization | Org-wide stream |
| `booking.updated` | Booking updated in the organization | Org-wide stream |
| `maintenance.updated` | Maintenance ticket updated | Org-wide stream |
| `audit.updated` | Audit updated | Org-wide stream |
| `dashboard.updated` | Statistics change and the frontend should refresh dashboard data | `{ "type": "kpi_update" }` |

## Suggested Frontend Usage

- Start with authentication, then persist `accessToken` and `refreshToken` securely.
- Use the role table to conditionally show navigation and actions.
- Treat list endpoints as paginated by default.
- Use the scoping notes to avoid requesting data the user should not see.
- Prefer the real-time events to refresh dashboard, notification, and workflow screens.

## Notes

- This document is intentionally written as a frontend-friendly reference.
- If the backend behavior changes, update the endpoint sections and examples together.
- For endpoints without explicit examples here, follow the standard success/error envelopes above.
