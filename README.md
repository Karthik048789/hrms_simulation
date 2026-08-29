# HR Digital Twin — Module Simulator

This is a full-stack HRMS (Human Resource Management System) Simulator. It features a React frontend (powered by Vite) and an Express.js backend that stores data persistently in a local PostgreSQL database.

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **PostgreSQL** installed locally (with pgAdmin or psql)

## Step 1: Database Setup

1. Open pgAdmin (or your preferred PostgreSQL client) and create a new database named `hrms_db`.
2. Open the Query Tool for `hrms_db` and run the following SQL script to create the necessary tables:

```sql
-- Store the structure of custom modules
CREATE TABLE hrms_modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  layer INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  is_custom BOOLEAN DEFAULT TRUE
);

-- Store the actual data rows flexibly
CREATE TABLE hrms_records (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL, 
  data JSONB NOT NULL,     
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

## Step 2: Start the Backend Server

The backend server connects to PostgreSQL and provides the API for the simulator.

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. *(Optional)* Ensure your PostgreSQL credentials match the `.env` file located in the `server` directory:
   ```env
   DB_USER=postgres
   DB_PASSWORD=123456789@Ks
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hrms_db
   PORT=3000
   ```
4. Start the backend server:
   ```bash
   node server.js
   ```
   *You should see "Server listening on port 3000" and "Successfully connected to database: hrms_db". Keep this terminal open.*

## Step 3: Seed Default Modules

Once the server is running, populate the `hrms_modules` table with the default built-in HR modules so they are tracked permanently in your database.

1. Open a new terminal inside the `server` directory.
2. Run the seed script:
   ```bash
   node seed_api.js
   ```

## Step 4: Start the Frontend Application

The frontend is a Vite + React application.

1. Open a **new** terminal window and navigate to the project root directory.
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to the URL provided in the terminal (usually `http://localhost:5173` or `http://localhost:5174`).

---

### Features
* **Persistent Database**: All employees, leave requests, assets, and payroll runs are saved directly to PostgreSQL.
* **Auto-Populate Data**: Register new custom modules and optionally auto-populate an initial record for every single employee instantly.
* **Database Sync Indicator**: A glowing notification above the Dependency Graph lets you know in real-time exactly when data is syncing and successfully updated in PostgreSQL.
* **Collapsible Database Panel**: View your database schema gracefully with interactive collapsible accordion tables so the screen stays uncluttered.
* **Dynamic JSONB Schema**: Register new custom HR modules on the fly, with their data seamlessly injected into the flexible `hrms_records` PostgreSQL structure.
* **Visual Graph**: See how different HR modules (like Payroll and Attendance) depend on each other visually.
