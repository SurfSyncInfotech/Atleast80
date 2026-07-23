const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Nitesh@2005',
    database: 'atleast80'
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log("TABLES:", tables);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await connection.end();
  }
}
run();
