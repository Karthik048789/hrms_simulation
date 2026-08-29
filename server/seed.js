const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const INITIAL_MODULES = [
  { id: "emp_docs", name: "Employee & Docs", layer: 0, table: "employee_records", active: true },
  { id: "attendance_leave", name: "Attendance & Leave", layer: 1, table: "attendance_leave", active: true },
  { id: "performance", name: "Performance & Appraisal", layer: 1, table: "performance_cycles", active: true },
  { id: "assets", name: "Asset Management", layer: 1, table: "company_assets", active: true },
  { id: "loans", name: "Loan Management", layer: 1, table: "employee_loans", active: true },
  { id: "awards", name: "Excellence Awards", layer: 1, table: "excellence_awards", active: true },
  { id: "payroll", name: "Payroll & Statutory", layer: 2, table: "payroll_records", active: true },
  { id: "special_allowances", name: "Special Allowances", layer: 2, table: "special_allowances", active: true },
  { id: "ess", name: "Self-Service (ESS)", layer: 3, table: "ess_requests", active: true },
];

async function seed() {
  for (const m of INITIAL_MODULES) {
    try {
      await pool.query(
        'INSERT INTO hrms_modules (id, name, layer, table_name, active, is_custom) VALUES ($1, $2, $3, $4, $5, false) ON CONFLICT (id) DO NOTHING',
        [m.id, m.name, m.layer, m.table, m.active]
      );
      console.log(`Inserted ${m.id}`);
    } catch (e) {
      console.error(`Failed to insert ${m.id}`, e);
    }
  }
  pool.end();
}

seed();
