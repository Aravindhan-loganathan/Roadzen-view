import pool from '../config/db';

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'public',
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

  try {
    await pool.query(usersTable);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50)`);
    
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

    // Seed Chennai Metropolitan Area - Mostly LOW and MEDIUM Traffic
    const chennaiMetroCheck = await pool.query("SELECT COUNT(*) FROM traffic_signals WHERE location = 'Besant Nagar Signal'");
    if (parseInt(chennaiMetroCheck.rows[0].count) === 0) {
      const seedChennaiMetro = `
        INSERT INTO traffic_signals (location, congestion_level, current_green, countdown, latitude, longitude) VALUES
        ('Besant Nagar Signal', 'LOW', 'North', 25, 13.0001, 80.2668),
        ('Nungambakkam High Road', 'MEDIUM', 'East', 35, 13.0569, 80.2426),
        ('Mylapore Tank Junction', 'LOW', 'South', 20, 13.0339, 80.2619),
        ('Alwarpet Signal', 'LOW', 'West', 30, 13.0338, 80.2501),
        ('Saidapet Signal', 'MEDIUM', 'North', 40, 13.0210, 80.2231),
        ('Ashok Nagar Junction', 'LOW', 'East', 25, 13.0358, 80.2095),
        ('KK Nagar Signal', 'LOW', 'South', 30, 13.0383, 80.2006),
        ('Nandanam Signal', 'MEDIUM', 'West', 35, 13.0297, 80.2426),
        ('Teynampet Signal', 'LOW', 'North', 25, 13.0418, 80.2532),
        ('Egmore Junction', 'MEDIUM', 'East', 40, 13.0732, 80.2609),
        ('Chetpet Signal', 'LOW', 'South', 20, 13.0708, 80.2425),
        ('Kilpauk Signal', 'LOW', 'West', 30, 13.0808, 80.2421),
        ('Aminjikarai Signal', 'LOW', 'North', 25, 13.0708, 80.2191),
        ('Shenoy Nagar Signal', 'MEDIUM', 'East', 35, 13.0808, 80.2267),
        ('Perambur Signal', 'LOW', 'South', 30, 13.1127, 80.2394),
        ('Vyasarpadi Signal', 'LOW', 'West', 25, 13.0986, 80.2558),
        ('Tondiarpet Junction', 'MEDIUM', 'North', 40, 13.1167, 80.2833),
        ('Royapuram Signal', 'LOW', 'East', 20, 13.1119, 80.2953),
        ('Washermanpet Signal', 'LOW', 'South', 30, 13.1025, 80.2786),
        ('Madhavaram Junction', 'MEDIUM', 'West', 35, 13.1482, 80.2314),
        ('Ambattur Signal', 'MEDIUM', 'North', 40, 13.1143, 80.1548),
        ('Avadi Junction', 'LOW', 'East', 25, 13.1147, 80.1018),
        ('Pattabiram Signal', 'LOW', 'South', 30, 13.1333, 80.0833),
        ('Thiruverkadu Signal', 'LOW', 'West', 20, 13.0667, 80.1500),
        ('Maduravoyal Junction', 'MEDIUM', 'North', 35, 13.0333, 80.1667),
        ('Mangadu Signal', 'LOW', 'East', 25, 13.0333, 80.1000),
        ('Kundrathur Signal', 'LOW', 'South', 30, 13.0000, 80.0833),
        ('Pallavaram Signal', 'MEDIUM', 'West', 40, 12.9675, 80.1491),
        ('Chrompet Junction', 'MEDIUM', 'North', 35, 12.9516, 80.1462),
        ('Pammal Signal', 'LOW', 'East', 25, 12.9761, 80.1275),
        ('Anakaputhur Signal', 'LOW', 'South', 20, 12.9833, 80.1167),
        ('Meenambakkam Signal', 'LOW', 'West', 30, 12.9833, 80.1667),
        ('Tirusulam Signal', 'LOW', 'North', 25, 12.9667, 80.1333),
        ('Palavanthangal Signal', 'LOW', 'East', 20, 13.0000, 80.1500),
        ('Nanganallur Signal', 'MEDIUM', 'South', 35, 13.0000, 80.1833),
        ('Alandur Junction', 'MEDIUM', 'West', 40, 13.0025, 80.2061),
        ('St Thomas Mount Signal', 'LOW', 'North', 25, 13.0067, 80.1983);
      `;
      await pool.query(seedChennaiMetro);
      console.log('✅ Seeded Chennai Metropolitan Area traffic signals (LOW/MEDIUM focus)');
    }

    // Seed More Medium Traffic Signals in Chennai and neighboring districts
    const mediumSignalsCheck = await pool.query("SELECT COUNT(*) FROM traffic_signals WHERE location = 'Kelambakkam Junction'");
    if (parseInt(mediumSignalsCheck.rows[0].count) === 0) {
      const seedMediumSignals = `
        INSERT INTO traffic_signals (location, congestion_level, current_green, countdown, latitude, longitude) VALUES
        ('Kelambakkam Junction', 'MEDIUM', 'North', 35, 12.7850, 80.2201),
        ('Navalur OMR Junction', 'MEDIUM', 'East', 40, 12.8450, 80.2250),
        ('Sholinganallur Junction', 'MEDIUM', 'South', 45, 12.9010, 80.2269),
        ('Medavakkam Signal', 'MEDIUM', 'West', 35, 12.9200, 80.1900),
        ('Camp Road Junction', 'MEDIUM', 'North', 40, 12.9100, 80.1400),
        ('Perungalathur Signal', 'MEDIUM', 'East', 50, 12.9051, 80.0917),
        ('Urapakkam Junction', 'MEDIUM', 'South', 30, 12.8682, 80.0716),
        ('Guduvanchery Signal', 'MEDIUM', 'West', 35, 12.8454, 80.0617),
        ('Maraimalai Nagar Junction', 'MEDIUM', 'North', 40, 12.7917, 80.0217),
        ('Red Hills Junction', 'MEDIUM', 'East', 35, 13.1833, 80.1667),
        ('Manali High Road Signal', 'MEDIUM', 'South', 30, 13.1667, 80.2667),
        ('Kattupalli Road Signal', 'MEDIUM', 'West', 25, 13.3167, 80.3333),
        ('Sriperumbudur Junction', 'MEDIUM', 'North', 40, 12.9734, 79.9482),
        ('Oragadam Junction', 'MEDIUM', 'East', 45, 12.8333, 79.9500),
        ('Kanchipuram Moongil Mandapam', 'MEDIUM', 'South', 35, 12.8387, 79.7016);
      `;
      await pool.query(seedMediumSignals);
      console.log('✅ Seeded more medium-traffic signals in outskirts');
    }

    await pool.query(violationsTable);
    await pool.query(alertsTable);
    await pool.query(reportsTable);

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
      console.log('✅ Updated reports status constraint');
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
      console.log('✅ Seeded emergency alerts data');
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
      console.log('✅ Seeded additional emergency alerts data');
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
