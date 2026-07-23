import pool from './config/db.js';

async function run() {
  try {
    const [columns] = await pool.query('DESCRIBE orders');
    console.log("COLUMNS:", columns.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}
run();
