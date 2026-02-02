import pool from '../config/db';

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50),
      location VARCHAR(255),
      phone VARCHAR(20),
      vehicle_number VARCHAR(20),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const trafficSignalsTable = `
    CREATE TABLE IF NOT EXISTS traffic_signals (
      id SERIAL PRIMARY KEY,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'RED',
      congestion_level VARCHAR(50) DEFAULT 'LOW' CHECK (congestion_level IN ('LOW', 'MEDIUM', 'HIGH')),
      current_green VARCHAR(50) DEFAULT 'North',
      countdown INTEGER DEFAULT 60,
      latitude DECIMAL(10, 6),
      longitude DECIMAL(10, 6),
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

  const reportsTable = `
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      description TEXT NOT NULL,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'in_progress', 'completed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const savedLocationsTable = `
    CREATE TABLE IF NOT EXISTS saved_locations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 6) NOT NULL,
      longitude DECIMAL(10, 6) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const systemSettingsTable = `
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(usersTable);
    // Add columns for notification preferences
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_alerts_enabled BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS system_alerts_enabled BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_alerts_enabled BOOLEAN DEFAULT FALSE`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50)`);

    await pool.query(trafficSignalsTable);

    // Ensure columns exist if table was created previously without them
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS current_green VARCHAR(50) DEFAULT 'North'`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS countdown INTEGER DEFAULT 60`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6)`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6)`);

    // Ensure congestion_level constraint
    try {
      await pool.query(`
        ALTER TABLE traffic_signals DROP CONSTRAINT IF EXISTS traffic_signals_congestion_level_check;
        ALTER TABLE traffic_signals ADD CONSTRAINT traffic_signals_congestion_level_check 
        CHECK (congestion_level IN ('LOW', 'MEDIUM', 'HIGH'));
      `);
    } catch (e) { }



    await pool.query(violationsTable);
    await pool.query(alertsTable);
    await pool.query(reportsTable);
    await pool.query(savedLocationsTable);
    await pool.query(systemSettingsTable);

    // Seed default system settings if table is empty
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM system_settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO system_settings (key, value) VALUES 
        ('refresh_interval', '5'),
        ('ai_model', 'YOLOv8n'),
        ('confidence_threshold', '85')
      `);
    }

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)');

    // Update status check constraint to include 'completed'
    try {
      await pool.query(`
        ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
        ALTER TABLE reports ADD CONSTRAINT reports_status_check 
        CHECK (status IN ('pending', 'resolved', 'in_progress', 'completed'));
      `);
    } catch (err) {
      console.error('⚠️ Could not update reports status constraint (might already exist or differ)', err);
    }

    // Update Alerts Table Schema
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS eta VARCHAR(50)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS impact VARCHAR(255)`);

    // Seed Alerts if empty
    const alertsCheck = await pool.query('SELECT COUNT(*) FROM emergency_alerts');
    if (parseInt(alertsCheck.rows[0].count) === 0) {
      const seedAlerts = `
        INSERT INTO emergency_alerts (type, location, status, title, eta, priority, latitude, longitude, impact) VALUES
        ('ambulance', 'MG Road towards Hospital', 'ACTIVE', 'Ambulance Detected', '2 min', 'high', 12.9716, 77.5946, 'Traffic halted for 2 mins'),
        ('firetruck', 'Brigade Road Junction', 'ACTIVE', 'Fire Truck Approaching', '5 min', 'high', 12.9698, 77.6075, 'Lane 2 blocked'),
        ('accident', 'Outer Ring Road, Marathahalli', 'ACTIVE', 'Accident Reported', NULL, 'medium', 12.9352, 77.6245, 'Avg speed reduced to 15km/h');
      `;
      await pool.query(seedAlerts);
    }

    // Seed Additional Alerts (Closures/Weather)
    const closureCheck = await pool.query("SELECT COUNT(*) FROM emergency_alerts WHERE type = 'closure'");
    if (parseInt(closureCheck.rows[0].count) === 0) {
      const seedMoreAlerts = `
        INSERT INTO emergency_alerts (type, location, status, title, eta, priority, latitude, longitude, impact) VALUES
        ('closure', 'Anna Flyover', 'ACTIVE', 'Scheduled Maintenance', NULL, 'medium', 13.0626, 80.2644, 'Closed 11 PM - 5 AM'),
        ('closure', 'Kathipara Service Lane', 'ACTIVE', 'Drainage Work', NULL, 'low', 13.0096, 80.2034, 'Lane restriction'),
        ('weather', 'Marina Beach Loop', 'ACTIVE', 'Water Logging', NULL, 'high', 13.0450, 80.2750, 'Avoid route'),
        ('accident', 'GST Road near Airport', 'ACTIVE', 'Multi-vehicle Collision', NULL, 'high', 12.9800, 80.1600, 'Traffic halted');
      `;
      await pool.query(seedMoreAlerts);
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
};

export default createTables;
