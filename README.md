# AssetFlow — Enterprise Asset & Resource Management ERP

<p align="center">
  <img src="docs/assets/banner.png" alt="AssetFlow Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Badge">
  <img src="https://img.shields.io/badge/React-19%2B-blue?style=for-the-badge&logo=react&logoColor=white" alt="React Badge">
  <img src="https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Badge">
  <img src="https://img.shields.io/badge/Prisma-7.8-darkblue?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma Badge">
  <img src="https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io Badge">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS Badge">
</p>

---

## 📖 Table of Contents
1. [Introduction](#-introduction)
2. [🌟 Key Features & Modules](#-key-features--modules)
3. [🏗️ Architecture & Flow](#️-architecture--flow)
4. [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
5. [⚡ Quick Start Guide](#-quick-start-guide)
   - [Prerequisites](#1-prerequisites)
   - [Backend Setup](#2-backend-setup)
   - [Frontend Setup](#3-frontend-setup)
6. [🛠️ Setup Command Cheat-Sheet](#️-setup-command-cheat-sheet)
7. [⏰ Real-Time & Automation Systems](#-real-time--automation-systems)
8. [📂 Directory Structure](#-directory-structure)
9. [🚨 Troubleshooting & FAQ](#-troubleshooting--faq)
10. [📚 Developer Documentation Links](#-developer-documentation-links)

---

## 🚀 Introduction

**AssetFlow** is an enterprise-grade, multi-tenant, role-based ERP system designed to govern the entire lifecycle of corporate physical assets and resources. From real-time room bookings to deep-level department hierarchy setups, sequential barcode tagging, automated maintenance workflows, and rigorous audit locking mechanisms, AssetFlow provides a single source of truth for organizational resource allocation.

> [!NOTE]
> AssetFlow was built with performance and security at its core. It leverages MariaDB/MySQL connection pooling, Redis caching for dashboard metrics, and JWT session isolation.

---

## 🌟 Key Features & Modules

### 🏢 1. Tenant & Organization Setup
* **Hierarchical Departments:** Construct complex organizational trees with parent-child department relations.
* **Department Heads:** Map managers directly to specific units, automatically driving approval chains.
* **Tenant Isolation:** Fully isolated data spaces secure multi-tenant deployments.

### 🏷️ 2. Smart Asset Registry
* **Barcode Tagging:** Generate unique, sequential asset tags (`ACME-COMP-0001`) upon creation.
* **Custom Attributes:** Extend asset categories with dynamic JSON schemas (e.g., storage size, warranty date).
* **Search & Filters:** Real-time paginated grid containing advanced condition, location, and owner filter tags.

### 🔄 3. Allocation & Lifecycle Manager
* **Checkout/Returns:** Manage allocations to single employees or entire departments with strict expected return checking.
* **Inter-Department Transfers:** Route assets smoothly across units with built-in audit trails.
* **Lifecycle States:** Automated transitions through `Draft`, `Active`, `Under Maintenance`, `Audited`, and `Retired`.

### 📅 4. Conflict-Preventing Resource Booking
* **Real-time Scheduling:** Schedule shared office resources, boardrooms, and testing hardware.
* **Overlapping Check:** Backend validation prevents double bookings on same-time slots.
* **Auto-Transitions:** Cron transitions bookings dynamically from `Upcoming` ➔ `Ongoing` ➔ `Completed`.

### 🔧 5. Maintenance Ticket System
* **Broken Asset Reporting:** Employees can file issues directly from their accounts.
* **Technician Routing:** Route repairs to specific technicians based on asset category.
* **State Machine Flow:** Manages state changes from `Reported` ➔ `In Progress` ➔ `Resolved` with verification logs.

### 🔍 6. Rigorous System-Wide Audits
* **Audit Cycles:** Initiate department-wide or category-specific audits.
* **Auditor Assignment:** Direct allocation of dedicated auditors to verifying cycles.
* **State-Locking:** Lock audited records to prevent tamper-prone edits while generating automatic mismatch reports.

---

## 🏗️ Architecture & Flow

AssetFlow utilizes a decoupled, modern architecture designed for maximum performance, horizontal scalability, and zero-conflict multi-user operations.

```mermaid
flowchart TD
    subgraph Client [Frontend - React Portal]
        UI[Tailwind UI / Zustand State]
        SocketClient[Socket.IO Client]
        HTTPClient[Axios Client]
    end

    subgraph API [Backend Gateway - Express Node.js]
        Router[HTTP Router / Zod Validation]
        Middleware[Auth JWT / RBAC Middleware]
        Service[Domain Services & State Machines]
        SocketServer[Socket.IO Real-time Rooms]
        Cron[Scheduled Cron Jobs]
    end

    subgraph Data [Storage Layer]
        Prisma[Prisma ORM]
        DB[(MySQL 8.0 Database)]
    end

    HTTPClient -->|REST Requests| Router
    Router --> Middleware
    Middleware --> Service
    Service --> Prisma
    Prisma --> DB
    
    SocketClient <-->|Bi-directional JWT Handshake| SocketServer
    SocketServer --> Service
    Cron -->|State Transitions & Alert Triggers| Service
```

---

## 👥 Role-Based Access Control (RBAC)

The application enforces fine-grained access checks across four main user roles:

| Privilege | Admin | Asset Manager | Department Head | Employee |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Org / Hierarchies** | ⚡ Yes | ❌ No | ❌ No | ❌ No |
| **Create & Barcode Assets** | ⚡ Yes | ⚡ Yes | ❌ No | ❌ No |
| **Approve Transfers/Allocations** | ⚡ Yes | ⚡ Yes | 💼 Dept Only | ❌ No |
| **Trigger System Audits** | ⚡ Yes | ⚡ Yes | ❌ No | ❌ No |
| **Create Maintenance Requests** | ⚡ Yes | ⚡ Yes | ⚡ Yes | ⚡ Yes |
| **Reserve Shared Resources** | ⚡ Yes | ⚡ Yes | ⚡ Yes | ⚡ Yes |
| **Generate & Export Reports** | ⚡ Yes | ⚡ Yes | 💼 Dept Only | ❌ No |

---

## ⚡ Quick Start Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **MySQL / MariaDB** (v8.0 or higher, running locally on port `3306`)

---

### 2. Backend Setup

1. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory (you can copy `.env.example` as a template):
   ```bash
   cp .env.example .env
   ```
   Modify the `DATABASE_URL` string inside `.env` to match your local MySQL username and password:
   ```text
   DATABASE_URL="mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/assetflow"
   ```

4. **Initialize Database & Apply Migrations:**
   Run Prisma migrations to create the database schema:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed the Database:**
   Populate the database with departments, default categories, assets, and role-based test users:
   ```bash
   npx prisma db seed
   ```
   
   > [!IMPORTANT]  
   > **Default Seeded Credentials (All passwords are `<Role>@123`):**
   > * 🔑 **Admin:** `admin@acme.com` (password: `Admin@123`)
   > * 🔑 **Asset Manager:** `manager@acme.com` (password: `Manager@123`)
   > * 🔑 **Department Head:** `head@acme.com` (password: `Head@123`)
   > * 🔑 **Employee:** `employee@acme.com` (password: `Employee@123`)
   > * 🔑 **Employee 2:** `raj@acme.com` (password: `Employee@123`)

6. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### 3. Frontend Setup

1. **Navigate to the Frontend Directory:**
   ```bash
   cd ../frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the Vite Dev Server:**
   ```bash
   npm run dev
   ```
   The application dashboard will boot and become accessible on `http://localhost:5173`.

---

## 🛠️ Setup Command Cheat-Sheet

| Context | Action | Command |
| :--- | :--- | :--- |
| **Backend** | Dependency Install | `npm install --legacy-peer-deps` |
| **Backend** | Run Database Migrations | `npx prisma migrate dev --name init` |
| **Backend** | Generate Client Models | `npx prisma generate` |
| **Backend** | Run DB Seed Script | `npx prisma db seed` |
| **Backend** | Start Dev Server | `npm run dev` |
| **Backend** | Run Jest Tests | `npx jest` |
| **Frontend** | Dependency Install | `npm install --legacy-peer-deps` |
| **Frontend** | Start Vite Client | `npm run dev` |
| **Frontend** | Check Lints | `npm run lint` |
| **Frontend** | Compile Production Build | `npm run build` |

---

## ⏰ Real-Time & Automation Systems

* **WebSocket Event Architecture:** Socket.IO handles live updates. During authentication, clients join specialized organizational rooms (`org_<id>`), role rooms (`org_<id>_<role_name>`), and custom user channels (`user_<id>`) to receive instant push alerts.
* **Automated Cron Engine:** A background runner sweeps the active databases every 5 minutes in development to:
  * Flag active allocations past expected return date as `Overdue` and trigger notifications to managers.
  * Transitions bookings from `Upcoming` to `Ongoing` and completes them at their end-times.

---

## 📂 Directory Structure

```text
AssetFlow/
├── backend/
│   ├── prisma/             # Schema definitions, seed scripts, migrations
│   ├── src/
│   │   ├── config/         # Environment parser and config definitions
│   │   ├── middleware/     # JWT authentication, error handling, rate limiting
│   │   ├── modules/        # Modular domain-driven backend modules
│   │   └── utils/          # Socket instances, database clients, cron setup
│   └── package.json        # Node script actions and dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI elements (buttons, forms, modals, search bars)
│   │   ├── pages/          # Complete dashboard pages (Registry, Audits, Bookings)
│   │   ├── store/          # Zustand global states (auth, notification hubs)
│   │   └── main.tsx        # App initialization & Routing rules
│   └── package.json        # Frontend bundler settings and libraries
│
└── docs/                   # Additional documentation & system specifications
```

---

## 🚨 Troubleshooting & FAQ

#### Q: I get `Error: DATABASE_URL environment variable is not defined.` when running seeds or starting the server.
> [!TIP]
> Ensure you have copied `.env.example` to `.env` in the `backend/` directory, and that the file is populated. If you are running commands in nested subdirectories, verify the current working directory is `backend/`.

#### Q: The compiler complains about missing Jest symbols (e.g. `jest` is not defined).
> [!TIP]
> This happens when types are not mapped globally. Make sure your `backend/tsconfig.json` contains `"types": ["jest", "node"]` under compiler options. We have already updated this in the main repository config.

#### Q: `npm install` throws resolving peer conflicts for typescript or jest.
> [!TIP]
> Because of version boundaries on testing libraries under TypeScript 7, always install using `npm install --legacy-peer-deps`.

#### Q: How do I rebuild the Prisma Client after database modifications?
> [!TIP]
> Run `npx prisma generate` in the `backend/` directory to rebuild type-definitions for the client database client wrapper.

---

## 📚 Developer Documentation Links

For deeper technical blueprints, query structures, and mockups, explore our dedicated documentation resources:

* 🗺️ **[Architectural Design Blueprint](file:///Users/shaswat/Documents/odoo/Odoo_Hackathon_2026/ARCHITECTURE.md)** — DDD layered directory standards and TypeScript interfaces.
* 🗄️ **[Database Architecture & Schema ERD](file:///Users/shaswat/Documents/odoo/Odoo_Hackathon_2026/DATABASE_DESIGN.md)** — Relational tables, triggers, and state machine transitions.
* 🔌 **[API Reference Documentation](file:///Users/shaswat/Documents/odoo/Odoo_Hackathon_2026/docs/API_REFERENCE.md)** — REST API routing endpoints, payload examples, and responses.
* 🧪 **[Testing Framework Guide](file:///Users/shaswat/Documents/odoo/Odoo_Hackathon_2026/docs/TESTING.md)** — Testing flows, mocks, and coverage configurations.

---
<p align="center">Made with ❤️ for the Odoo Hackathon 2026</p>
