import pool from "../src/config/db.js"
async function run() {
  const [rows] = await pool.query("SHOW CREATE TABLE users")
  console.log("USERS SCHEMA:")
  console.log(rows[0]["Create Table"])
  
  const [triggers] = await pool.query("SHOW TRIGGERS")
  console.log("TRIGGERS:")
  console.log(triggers)
  
  process.exit(0)
}
run().catch(console.error)
