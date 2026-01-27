import pool from '../config/db';

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'public',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const trafficSignalsTable = `
    CREATE TABLE IF NOT EXISTS traffic_signals (
      id SERIAL PRIMARY KEY,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'RED',
      congestion_level VARCHAR(50) DEFAULT 'LOW',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const violationsTable = `
    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      vehicle_number VARCHAR(50) NOT NULL,
      location VARCHAR(255) NOT NULL,
      fine_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alertsTable = `
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id SERIAL PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(usersTable);
    await pool.query(trafficSignalsTable);
    await pool.query(violationsTable);
    await pool.query(alertsTable);
    console.log('✅ Database tables checked/created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
};

export default createTables;
