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
      current_green VARCHAR(50) DEFAULT 'North',
      countdown INTEGER DEFAULT 60,
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

    // Ensure columns exist if table was created previously without them
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS current_green VARCHAR(50) DEFAULT 'North'`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS countdown INTEGER DEFAULT 60`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6)`);
    await pool.query(`ALTER TABLE traffic_signals ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6)`);

    // Update coordinates for existing signals (Seeding coordinates)
    const updateCoords = `
      UPDATE traffic_signals SET latitude = 12.9716, longitude = 77.5946 WHERE location = 'MG Road Junction';
      UPDATE traffic_signals SET latitude = 12.9698, longitude = 77.6075 WHERE location = 'Brigade Road Crossing';
      UPDATE traffic_signals SET latitude = 12.9784, longitude = 77.6408 WHERE location = 'Indiranagar Signal';
      UPDATE traffic_signals SET latitude = 12.9352, longitude = 77.6245 WHERE location = 'Koramangala Junction';
      UPDATE traffic_signals SET latitude = 12.9698, longitude = 77.7500 WHERE location = 'Whitefield Main';
      UPDATE traffic_signals SET latitude = 12.8458, longitude = 77.6712 WHERE location = 'Electronic City Gate';
    `;
    await pool.query(updateCoords);

    // Seed Chennai Traffic Signals
    const chennaiSignalsCheck = await pool.query("SELECT COUNT(*) FROM traffic_signals WHERE location = 'Anna Salai Junction'");
    if (parseInt(chennaiSignalsCheck.rows[0].count) === 0) {
      const seedChennai = `
        INSERT INTO traffic_signals (location, congestion_level, current_green, countdown, latitude, longitude) VALUES
        ('Anna Salai Junction', 'HIGH', 'North', 60, 13.0626, 80.2644),
        ('T. Nagar Panagal Park', 'MEDIUM', 'East', 45, 13.0404, 80.2337),
        ('Adyar Signal', 'LOW', 'South', 30, 13.0067, 80.2570),
        ('Kathipara Junction', 'HIGH', 'West', 90, 13.0096, 80.2034),
        ('Madhya Kailash', 'MEDIUM', 'North', 40, 13.0064, 80.2433),
        ('Tidel Park Signal', 'LOW', 'East', 20, 12.9901, 80.2484);
      `;
      await pool.query(seedChennai);
      console.log('✅ Seeded Chennai traffic signals data');
    }

    // Seed Additional Tamil Nadu Traffic Signals
    const tnSignalsCheck = await pool.query("SELECT COUNT(*) FROM traffic_signals WHERE location = 'Tambaram Junction'");
    if (parseInt(tnSignalsCheck.rows[0].count) === 0) {
      const seedTNSignals = `
        INSERT INTO traffic_signals (location, congestion_level, current_green, countdown, latitude, longitude) VALUES
        ('Tambaram Junction', 'HIGH', 'South', 55, 12.9249, 80.1000),
        ('Chromepet Signal', 'MEDIUM', 'North', 35, 12.9516, 80.1462),
        ('Guindy Roundtana', 'HIGH', 'East', 70, 13.0067, 80.2206),
        ('Velachery Vijaya Nagar', 'HIGH', 'West', 65, 12.9759, 80.2212),
        ('Porur Junction', 'MEDIUM', 'South', 40, 13.0382, 80.1565),
        ('Vadapalani Signal', 'HIGH', 'North', 60, 13.0500, 80.2121),
        ('Koyambedu Junction', 'HIGH', 'East', 80, 13.0732, 80.1934),
        ('Thirumangalam Signal', 'MEDIUM', 'West', 45, 13.0850, 80.1990),
        ('Anna Nagar Roundtana', 'LOW', 'South', 30, 13.0878, 80.2150),
        ('Poonamallee Junction', 'MEDIUM', 'North', 50, 13.0473, 80.0945),
        ('Madurai Goripalayam', 'HIGH', 'East', 60, 9.9252, 78.1198),
        ('Trichy Central Bus Stand', 'MEDIUM', 'West', 40, 10.8050, 78.6856),
        ('Coimbatore Gandhipuram', 'HIGH', 'South', 55, 11.0168, 76.9558),
        ('Salem Central Bus Stand', 'MEDIUM', 'North', 35, 11.6643, 78.1460),
        ('Tirunelveli New Bus Stand', 'LOW', 'East', 25, 8.7139, 77.7567),
        ('Vellore New Bus Stand', 'MEDIUM', 'West', 40, 12.9165, 79.1325),
        ('Erode New Bus Stand', 'MEDIUM', 'South', 30, 11.3410, 77.7172),
        ('Thanjavur Old Bus Stand', 'LOW', 'North', 20, 10.7870, 79.1378);
      `;
      await pool.query(seedTNSignals);
      console.log('✅ Seeded Additional Tamil Nadu traffic signals data');
    }

    await pool.query(violationsTable);
    await pool.query(alertsTable);

    // Update Alerts Table Schema
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS eta VARCHAR(50)`);
    await pool.query(`ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'`);

    // Seed Alerts if empty
    const alertsCheck = await pool.query('SELECT COUNT(*) FROM emergency_alerts');
    if (parseInt(alertsCheck.rows[0].count) === 0) {
      const seedAlerts = `
        INSERT INTO emergency_alerts (type, location, status, title, eta, priority) VALUES
        ('ambulance', 'MG Road towards Hospital', 'ACTIVE', 'Ambulance Detected', '2 min', 'high'),
        ('firetruck', 'Brigade Road Junction', 'ACTIVE', 'Fire Truck Approaching', '5 min', 'high'),
        ('accident', 'Outer Ring Road, Marathahalli', 'ACTIVE', 'Accident Reported', NULL, 'medium');
      `;
      await pool.query(seedAlerts);
      console.log('✅ Seeded emergency alerts data');
    }

    // Seed Traffic Signals if empty
    const signalsCheck = await pool.query('SELECT COUNT(*) FROM traffic_signals');
    if (parseInt(signalsCheck.rows[0].count) === 0) {
      const seedSignals = `
        INSERT INTO traffic_signals (location, congestion_level, current_green, countdown) VALUES
        ('MG Road Junction', 'LOW', 'North', 45),
        ('Brigade Road Crossing', 'MEDIUM', 'East', 30),
        ('Indiranagar Signal', 'HIGH', 'West', 15),
        ('Koramangala Junction', 'MEDIUM', 'South', 25),
        ('Whitefield Main', 'LOW', 'North', 60),
        ('Electronic City Gate', 'HIGH', 'East', 10);
      `;
      await pool.query(seedSignals);
      console.log('✅ Seeded traffic signals data');
    }

    console.log('✅ Database tables checked/created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
};

export default createTables;
