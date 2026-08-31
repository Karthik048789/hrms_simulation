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
   DB_PASSWORD=password
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

# protocols used

🔌 Protocols Used
1. HTTP/REST — Frontend ↔ Backend
The React frontend communicates with the Express server via HTTP requests:

Browser (React)  →  HTTP  →  Express.js (localhost:3000)
GET /api/modules — fetch all modules
POST /api/modules — create a module
PATCH /api/modules/:id — update module status
GET /api/records — fetch all records
POST /api/records — insert a record
DELETE /api/reset — reset simulation


2. PostgreSQL Wire Protocol — Backend ↔ Database
The Express server connects to PostgreSQL using the pg (node-postgres) library, which uses PostgreSQL's native TCP binary wire protocol:

Express.js  →  TCP/PostgreSQL Wire Protocol  →  PostgreSQL (localhost:5432)

3. WebSocket / HMR (dev only) — Vite Hot Reload
Vite uses WebSocket in development to push hot module replacement (HMR) updates instantly to the browser without a full refresh:

Vite Dev Server  →  WebSocket  →  Browser


# how the simulation and its animations work under the hood in this project:
Here is exactly how the simulation and its animations work under the hood in this project:

1. JavaScript Promises (setTimeout)
Instead of a complex simulation engine like SimPy, the "simulation" steps are controlled using native JavaScript timeouts wrapped in Promises. In the code, you'll see a small utility function:

javascript
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
When you trigger an action (like running Payroll), the code uses await sleep(500) between steps to create deliberate delays. This creates the visual effect of a process taking time and stepping through the workflow.

2. React State Updates
As the JavaScript steps through the workflow, it constantly updates React state variables:

hlNodes (Highlighted Nodes): Tracks which HR module is currently active.
hlEdges (Highlighted Edges): Tracks which dependency line in the graph is active.
flash: Temporarily flags a module to "glow" when data is inserted.
3. CSS Transitions
The actual visual "animation" (the glowing, color changes, and fading lines) is purely CSS. When the React state updates (e.g., adding "Attendance" to hlNodes), React re-renders that specific SVG circle or box with an active CSS class (like .active-node). That CSS class has a transition property (e.g., transition: all 0.3s ease), which tells the browser to smoothly animate the color and glow effect.

Summary
It’s a state-driven React UI. The JavaScript logic dictates when a step happens, React updates the UI state, and standard CSS handles the smooth visual animations!