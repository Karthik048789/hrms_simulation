require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const INITIAL_MODULES = [
  { id: "emp_docs", name: "Employee & Docs", layer: 0, table_name: "employee_records", active: true, is_custom: false },
  { id: "attendance_leave", name: "Attendance & Leave", layer: 1, table_name: "attendance_leave", active: true, is_custom: false },
  { id: "performance", name: "Performance & Appraisal", layer: 1, table_name: "performance_cycles", active: true, is_custom: false },
  { id: "assets", name: "Asset Management", layer: 1, table_name: "company_assets", active: true, is_custom: false },
  { id: "loans", name: "Loan Management", layer: 1, table_name: "employee_loans", active: true, is_custom: false },
  { id: "awards", name: "Excellence Awards", layer: 1, table_name: "excellence_awards", active: true, is_custom: false },
  { id: "payroll", name: "Payroll & Statutory", layer: 2, table_name: "payroll_records", active: true, is_custom: false },
  { id: "special_allowances", name: "Special Allowances", layer: 2, table_name: "special_allowances", active: true, is_custom: false },
  { id: "ess", name: "Self-Service (ESS)", layer: 3, table_name: "ess_requests", active: true, is_custom: false },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const m of INITIAL_MODULES) {
      try {
        await client.query(
          `INSERT INTO hrms_modules (id, name, layer, table_name, active, is_custom)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [m.id, m.name, m.layer, m.table_name, m.active, m.is_custom]
        );
        console.log(`✓ ${m.id}`);
      } catch (err) {
        console.error(`✗ ${m.id}:`, err.message);
      }
    }
    console.log('\nAll modules seeded!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
