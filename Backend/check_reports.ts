
import pool from './src/config/db';

const checkReports = async () => {
  try {
    const res = await pool.query('SELECT * FROM reports ORDER BY id DESC');
    console.log('Current Reports in DB:', JSON.stringify(res.rows, null, 2));
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkReports();
