require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Successfully connected to database:', process.env.DB_NAME);
  }
});

// Get all modules
app.get('/api/modules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hrms_modules');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new module
app.post('/api/modules', async (req, res) => {
  const { id, name, layer, table_name, active, is_custom } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO hrms_modules (id, name, layer, table_name, active, is_custom) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, name, layer, table_name, active, is_custom]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update module status
app.patch('/api/modules/:id', async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE hrms_modules SET active = $1 WHERE id = $2 RETURNING *',
            [active, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all records (optionally filter by module_id)
app.get('/api/records', async (req, res) => {
  const { module_id } = req.query;
  try {
    let result;
    if (module_id) {
      result = await pool.query('SELECT * FROM hrms_records WHERE module_id = $1 ORDER BY created_at ASC', [module_id]);
    } else {
      result = await pool.query('SELECT * FROM hrms_records ORDER BY created_at ASC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insert a new record
app.post('/api/records', async (req, res) => {
  const { id, module_id, data } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO hrms_records (id, module_id, data) VALUES ($1, $2, $3) RETURNING *',
      [id, module_id, data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset simulation (Delete all data)
app.delete('/api/reset', async (req, res) => {
    try {
        // We only deactivate custom modules to keep them in schema
        await pool.query('UPDATE hrms_modules SET active = false WHERE is_custom = true');
        res.json({ message: 'Simulation reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
