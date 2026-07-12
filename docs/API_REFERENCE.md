# AssetFlow Backend — Complete API Reference

This document provides a comprehensive API reference for the AssetFlow Backend to assist in frontend development.

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Authentication:** All protected routes require `Authorization: Bearer <access_token>`.
- **Global Rate Limit:** 100 requests per minute per IP.
- **Auth Route Rate Limit:** 10 requests per 15 minutes per IP (on `/api/auth/*`).

---

## 1. Standard Response & Error Envelopes

All API responses (except file exports/downloads) follow these standard shapes.

### ✅ Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response payload (object or array)
  },
  "meta": null // Or pagination metadata
}
```

### ❌ Error Response (400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", // System error code
    "message": "Detailed error message describing what went wrong",
    "details": null // Optional object containing specific field-level validation errors
  }
}
```

---

## 2. Role-Based Access Control (RBAC)

The backend enforces role-based authorization using the following user roles:
*   `Admin`: Full administrative privileges across all organizations, settings, audit logs, and configurations.
*   `Asset Manager`: Performs day-to-day asset operations, checkouts, returns, transfers, maintenance, and audits.
*   `Department Head`: Manages and views department-specific assets, requests, schedules, and approvals.
*   `Employee`: Standard staff role. Can view own allocated assets, request transfers, make resource bookings, and raise maintenance tickets.

---

## 3. Modular API Reference

### 🔐 Authentication (`/api/auth`)
*Stricter rate limiting applies to this module.*

#### `POST /api/auth/signup`
Registers a new user and provisions an organization if `organizationId` is omitted.
*   **Auth Required**: None
*   **Request Body**:
    ```json
    {
      "name": "Employee Name",
      "email": "employee@example.com",
      "password": "SecurePassword123",
      "organizationId": "optional-organization-uuid"
    }
    ```
*   **Response (201 Created)**:
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

#### `POST /api/auth/login`
Authenticates user and returns active tokens.
*   **Auth Required**: None
*   **Request Body**:
    ```json
    {
      "email": "employee@example.com",
      "password": "SecurePassword123"
    }
    ```
*   **Response (200 OK)**:
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

#### `POST /api/auth/refresh`
Rotates access token and refresh token before expiry.
*   **Auth Required**: None
*   **Request Body**:
    ```json
    {
      "refreshToken": "jwt-refresh-token"
    }
    ```

#### `POST /api/auth/logout`
Invalidates session logs and token signatures in Redis.
*   **Auth Required**: 🔒 Yes
*   **Request Body**:
    ```json
    {
      "refreshToken": "jwt-refresh-token"
    }
    ```

#### `POST /api/auth/forgot-password`
Triggers password reset flow and emails a token.
*   **Request Body**: `{"email": "user@example.com"}`

#### `POST /api/auth/reset-password`
Applies new password using emailed reset token.
*   **Request Body**: `{"token": "reset-token", "password": "NewSecurePassword123"}`

#### `POST /api/auth/change-password`
Updates password for an active session.
*   **Auth Required**: 🔒 Yes
*   **Request Body**: `{"oldPassword": "...", "newPassword": "..."}`

---

### 🏢 Departments (`/api/departments`)

#### `GET /api/departments`
Lists departments.
*   **Auth Required**: 🔒 Yes (Any Role)
*   **Query Parameters**:
    *   `page`: number (default: 1)
    *   `limit`: number (default: 10)
    *   `status`: `"Active" | "Inactive"`
    *   `search`: string (matches department name)
*   **Response**:
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

#### `POST /api/departments`
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**:
    ```json
    {
      "name": "Department Name",
      "parentId": "optional-parent-dept-uuid",
      "managerId": "optional-manager-user-uuid",
      "status": "Active" // Optional, default: Active
    }
    ```

#### `PUT /api/departments/:id`
Updates department details.
*   **Auth Required**: 🔒 Yes (`Admin` only)

#### `PUT /api/departments/:id/deactivate`
Deactivates a department (fails if department has active assets or employees).
*   **Auth Required**: 🔒 Yes (`Admin` only)

#### `PUT /api/departments/:id/restore`
Re-activates a department.
*   **Auth Required**: 🔒 Yes (`Admin` only)

#### `PUT /api/departments/:id/head`
Assigns head manager to department.
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**: `{"employeeId": "employee-uuid"}`

---

### 🏷️ Asset Categories (`/api/categories`)

#### `GET /api/categories`
Lists categories.
*   **Auth Required**: 🔒 Yes (Any Role)

#### `POST /api/categories`
Creates a category.
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**: `{"name": "Electronics", "description": "Laptops, phones..."}`

#### `PUT /api/categories/:id` / `DELETE /api/categories/:id`
Updates or deletes a category (delete fails if referenced by assets).
*   **Auth Required**: 🔒 Yes (`Admin` only)

---

### 👤 Employees (`/api/employees`)

#### `GET /api/employees/profile`
Retrieves logged-in user profile details.
*   **Auth Required**: 🔒 Yes

#### `GET /api/employees`
Lists directory of employees.
*   **Auth Required**: 🔒 Yes
*   **Query Parameters**: `page`, `limit`, `search`, `departmentId`, `role`, `status`

#### `PUT /api/employees/:id/role`
Updates employee role.
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**: `{"role": "Admin | Asset Manager | Department Head | Employee"}`

#### `PUT /api/employees/:id/department`
Assigns employee to a department.
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**: `{"departmentId": "dept-uuid"}`

#### `PUT /api/employees/:id/status`
Activates or deactivates employee account.
*   **Auth Required**: 🔒 Yes (`Admin` only)
*   **Request Body**: `{"status": "Active | Inactive"}`

---

### 📦 Assets (`/api/assets`)

#### `GET /api/assets`
Lists assets.
*   **Auth Required**: 🔒 Yes
*   **Role Scoping**: `Employee` users are auto-scoped to view only assets allocated to them.
*   **Query Parameters**: `page`, `limit`, `search`, `status` (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed), `categoryId`, `location`, `condition`, `isShared`

#### `GET /api/assets/:id`
Gets asset detail profile, allocation details, and history.

#### `GET /api/assets/:id/qrcode`
Generates QR Code data URL.

#### `POST /api/assets`
Registers an asset.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Request Body**:
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

#### `PUT /api/assets/:id`
Updates asset fields.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)

#### `DELETE /api/assets/:id`
Soft-deletes (archives) an asset.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)

#### `POST /api/assets/import`
Bulk imports assets.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Request Body**:
    ```json
    {
      "assets": [
        // Array of create-asset objects
      ]
    }
    ```

#### `GET /api/assets/export/csv`
Downloads CSV catalog of filtered assets.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)

---

### 🔄 Allocations (`/api/allocations`)

#### `GET /api/allocations`
Lists allocations. `Employee` users are auto-scoped to their own records.
*   **Query Parameters**: `page`, `limit`, `status`, `employeeId`, `departmentId`

#### `POST /api/allocations`
Allocates (checks out) an asset. Uses interactive transactions and row-level locks.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Request Body**:
    ```json
    {
      "assetId": "asset-uuid",
      "allocatedToType": "Employee", // "Employee" | "Department"
      "employeeId": "employee-uuid", // Required if type is Employee
      "departmentId": null,          // Required if type is Department
      "expectedReturnDate": "2026-12-31T00:00:00.000Z"
    }
    ```

#### `POST /api/allocations/bulk`
Bulk allocates multiple assets.
*   **Request Body**: `{"allocations": [ ... ]}`

#### `POST /api/allocations/:assetId/return`
Returns (checks in) an allocated asset.
*   **Auth Required**: 🔒 Yes (`Admin`, `Asset Manager`, or `Department Head`)
*   **Request Body**:
    ```json
    {
      "returnCondition": "Good", // Excellent, Good, Fair, Damaged, Lost, Disposed
      "returnNotes": "Returned in normal condition"
    }
    ```

#### `POST /api/allocations/bulk/return`
Bulk check-in.
*   **Request Body**: `{"assetIds": ["uuid-1", "uuid-2"], "returnCondition": "Good"}`

---

### 🚚 Transfers (`/api/transfers`)

#### `GET /api/transfers`
Lists asset transfer requests.

#### `POST /api/transfers`
Requests transferring an asset.
*   **Request Body**:
    ```json
    {
      "assetId": "asset-uuid",
      "toEmployeeId": "employee-uuid", // or toDepartmentId
      "toDepartmentId": null,
      "requestNotes": "Need for project work"
    }
    ```

#### `PUT /api/transfers/:id/cancel`
Cancels pending transfer request (enforced in service layer to be requester-only).

#### `PUT /api/transfers/:id/approve` / `PUT /api/transfers/:id/reject`
Approves or rejects a transfer.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Rejection Body**: `{"rejectionReason": "..."}`

---

### 📅 Bookings (`/api/bookings`)
*Used for shared/bookable assets (e.g., meeting rooms, shared testing devices).*

#### `POST /api/bookings`
Books a shared asset. Fails if timeframe conflicts with another booking.
*   **Request Body**:
    ```json
    {
      "assetId": "asset-uuid",
      "startTime": "2026-07-20T10:00:00.000Z",
      "endTime": "2026-07-20T11:00:00.000Z",
      "notes": "Project demo meeting",
      "bookedOnBehalfOfDeptId": "dept-uuid"
    }
    ```

#### `PUT /api/bookings/:id/reschedule`
Updates booking time slots.
*   **Request Body**: `{"startTime": "...", "endTime": "...", "reason": "..."}`

#### `GET /api/bookings/calendar/today`
Lists today's active bookings.

#### `GET /api/bookings/calendar/day` / `GET /api/bookings/calendar/week` / `GET /api/bookings/calendar/month`
Fetch calendar views using format queries:
*   `GET /api/bookings/calendar/day?date=YYYY-MM-DD`
*   `GET /api/bookings/calendar/week?week=YYYY-MM-DD` (takes start of week date)
*   `GET /api/bookings/calendar/month?month=YYYY-MM`

---

### 🔧 Maintenance (`/api/maintenance`)

#### `POST /api/maintenance`
Raises a maintenance request.
*   **Request Body**:
    ```json
    {
      "assetId": "asset-uuid",
      "issueDescription": "Screen flickering",
      "priority": "Medium" // Low, Medium, High, Critical
    }
    ```

#### `PUT /api/maintenance/:id/approve`
Approves ticket.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Request Body**:
    ```json
    {
      "assignedTechnician": "John Contractor",
      "estimatedCompletionDate": "2026-07-15T00:00:00.000Z",
      "estimatedCost": 150,
      "vendor": "Hardware Fix Ltd"
    }
    ```

#### `PUT /api/maintenance/:id/complete`
Resolves ticket.
*   **Request Body**:
    ```json
    {
      "resolutionNotes": "Replaced internal display cable",
      "actualCost": 120,
      "actualCompletionDate": "2026-07-14T00:00:00.000Z"
    }
    ```

Other transitions: `/reject`, `/assign-technician`, `/start`, `/close`, `/cancel`.

---

### 🔍 Audit (`/api/audit`)

#### `POST /api/audit`
Creates an audit cycle.
*   **Auth Required**: 🔒 Yes (`Admin` or `Asset Manager`)
*   **Request Body**:
    ```json
    {
      "name": "Q3 IT Equipment Audit",
      "scopeType": "Category", // All, Department, Location, Category
      "scopeCategoryId": "category-uuid",
      "scheduledStartDate": "2026-08-01T00:00:00.000Z",
      "scheduledEndDate": "2026-08-15T00:00:00.000Z",
      "auditorIds": ["user-uuid-1"]
    }
    ```

#### Workflow Transitions
*   `PUT /api/audit/:id/schedule`
*   `PUT /api/audit/:id/start` (creates verification checklist entries)
*   `PUT /api/audit/:id/complete`
*   `PUT /api/audit/:id/close` (locks audit checklist, logs discrepancies)

#### `POST /api/audit/:id/verify/:assetId`
Submits verification for an asset.
*   **Request Body**:
    ```json
    {
      "verificationStatus": "Verified", // Verified, Missing, Damaged, Not Verified
      "notes": "Verified at reception",
      "physicalLocation": "Reception",
      "conditionOnVerify": "Good"
    }
    ```

#### `POST /api/audit/:id/evidence/:assetId`
Uploads evidence image/doc url.
*   **Request Body**: `{"fileUrl": "...", "fileType": "image", "caption": "..."}`

---

### 🔔 Notifications (`/api/notifications`)

#### `GET /api/notifications/my`
Retrieves user's notifications.

#### `GET /api/notifications/unread-count`
Retrieves unread badge count (Returns `{"data": {"count": 4}}`).

#### `PUT /api/notifications/read`
Marks notifications as read.
*   **Request Body**: `{"ids": ["uuid-1", "uuid-2"]}`

#### `PUT /api/notifications/preferences`
Updates notification delivery preferences.
*   **Request Body**:
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

---

### 📊 Dashboard (`/api/dashboard`)
*Scoping rules auto-scoped: Employees see own; Dept Heads see department; Managers/Admins see org-wide.*

*   `GET /api/dashboard/summary`: High-level metrics counts.
*   `GET /api/dashboard/kpis`: KPI metrics.
*   `GET /api/dashboard/category-distribution`: Count per category.
*   `GET /api/dashboard/utilization`: Scoped asset utilization percentages.
*   `GET /api/dashboard/booking-heatmap`: Hot hours / days grid data.
*   `GET /api/dashboard/maintenance-cost-trend`: Monthly cost trends.

---

### 📈 Reports (`/api/reports`)
All report endpoints support `?format=json|csv|pdf|xlsx` format types.

*   `GET /api/reports/utilization`
*   `GET /api/reports/department-allocation`
*   `GET /api/reports/employee-allocation`
*   `GET /api/reports/maintenance-cost`
*   `GET /api/reports/warranty-expiry`
*   `GET /api/reports/missing-assets`
*   `GET /api/reports/damaged-assets`
*   `GET /api/reports/analytics`: BI summary containing growth and reliability analysis.

---

## 4. Socket.IO Real-Time Push Events

The backend exposes a real-time gateway using Socket.IO:
*   **Connection URL**: `ws://localhost:5000`
*   **Authentication**: Pass active access token under auth handshake:
    ```javascript
    const socket = io('ws://localhost:5000', {
      auth: { token: accessToken }
    });
    ```

### Subscribed Events
*   `notification`: Received when a user gets a targeted notification. Payload: `{"title": "...", "message": "..."}`
*   `allocation.created` / `booking.created` / `booking.updated` / `maintenance.updated` / `audit.updated`: Org-wide streams broadcast to matching organization rooms.
*   `dashboard.updated`: Emitted when statistics update. Payload: `{"type": "kpi_update"}`. Prompting the frontend to trigger fresh dashboard loads.
