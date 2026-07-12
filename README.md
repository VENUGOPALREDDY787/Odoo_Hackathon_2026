# AssetFlow — Enterprise Asset & Resource Management ERP

AssetFlow is a multi-tenant, role-based ERP designed to track departments, categories, employee directories, asset lifecycles, allocations, transfers, resource bookings, maintenance workflows, and audit cycles.

---

## Technical Stack
* **Database:** MySQL 8.0+ (InnoDB)
* **Backend:** Node.js + Express (layered: `routes -> controllers -> services -> repository -> DB`)
* **ORM:** Prisma v7.8.0 + `@prisma/adapter-mariadb` (MySQL/MariaDB client adapter)
* **Real-time:** Socket.IO
* **Validation:** Zod (Zod schema validations at HTTP layer, service-level state machine validations at backend)
* **Auth:** JSON Web Tokens (Access + Hashed Refresh Tokens)

---

## Directory Structure
```text
backend/
├── prisma/
│   ├── migrations/      # Versioned migration histories
│   ├── schema.prisma    # Prisma schemas for MySQL
│   └── seed.js          # DB seed data populating core entities
├── src/
│   ├── config/          # Configurations (db.js parsing urls)
│   ├── middleware/      # Middlewares (auth.js, error.js, logger.js)
│   ├── modules/         # Domain-modular modules
│   │   ├── auth/        # Signup, login, logout, refreshes
│   │   ├── employees/   # Directories, promotes, status toggles
│   │   ├── departments/ # Parent hierarchies, head assignments
│   │   ├── categories/  # Custom JSON fields, registration
│   │   ├── assets/      # Sequential tags, search filters
│   │   ├── allocations/ # Returns, assignment checks, transfers
│   │   ├── bookings/    # Overlapping slot checks
│   │   ├── maintenance/ # Approval states, technician routing
│   │   ├── audits/      # Cycles, Auditor allocations, lockings
│   │   ├── notifications/# Employee alert listing
│   │   └── reports/     # Dynamic dashboard KPIs & heatmaps
│   ├── utils/           # Utilities (cron.js, socket.js, response.js)
│   ├── app.js           # Express app setup
│   └── server.js        # Server boot & port listening
├── .env                 # Environment variables
├── .env.example         # Example template of env parameters
└── package.json         # Scripts and dependencies
```

---

## Getting Started

### 1. Prerequisites
* **Node.js** (v18+)
* **MySQL** (v8.0+ running on port 3306)

### 2. Installation
Navigate to the `backend/` directory and install NPM packages:
```bash
cd backend
npm install
```

### 3. Environment Setup
Copy the `.env.example` file to `.env` and adjust the variables:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local MySQL setup:
```text
DATABASE_URL="mysql://<user>:<password>@localhost:3306/assetflow"
```

### 4. Database Setup & Migrations
To create the database and apply the schema migrations, run:
```bash
npx prisma migrate dev --name init
```

### 5. Seeding the Database
To populate the database with default departments, categories, assets, and role-based test employees, run:
```bash
npm run db:seed
```

Seeded credentials (all passwords are `<Role>@123` e.g. `Admin@123`):
* **Admin:** `admin@acme.com` (password: `Admin@123`)
* **Asset Manager:** `manager@acme.com` (password: `Manager@123`)
* **Department Head:** `head@acme.com` (password: `Head@123`)
* **Employee (Priya):** `employee@acme.com` (password: `Employee@123`)
* **Employee (Raj):** `raj@acme.com` (password: `Employee@123`)

### 6. Run the Server
Start the development server:
```bash
npm run dev
```
The server will start on port `5000` (e.g. `http://localhost:5000`).

---

## Real-Time & Scheduled Cron Systems
* **WebSockets:** Socket.IO runs on top of the HTTP server. Clients pass their JWT in the handshake config. Based on their credentials, they join organizational rooms (e.g., `org_<id>`), role rooms (e.g., `org_<id>_Asset Manager`), and personal rooms (`user_<id>`).
* **Cron Jobs:** A scheduled job runs in the background (configured for every 5 minutes in development) to:
  * Flag active allocations past expected return date as `Overdue` and notify managers.
  * Auto-transition upcoming bookings to `Ongoing` and completed ones to `Completed`.
