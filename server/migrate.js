require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  try {
    console.log('Running migration...');
    
    // Add schema column to hrms_modules if it doesn't exist
    await pool.query('ALTER TABLE hrms_modules ADD COLUMN IF NOT EXISTS schema JSONB;');
    console.log('Added schema column to hrms_modules');

    // Update primary key of hrms_records
    await pool.query('ALTER TABLE hrms_records DROP CONSTRAINT IF EXISTS hrms_records_pkey;');
    await pool.query('ALTER TABLE hrms_records ADD PRIMARY KEY (id, module_id);');
    console.log('Updated primary key for hrms_records');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
