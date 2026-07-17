import pool from "../src/config/db.js"
async function run() {
  const [rows] = await pool.query(
    `SELECT id, name, email, phone, role, account_verified FROM users WHERE id IN (33, 34)`
  )
  console.log("Users:")
  console.table(rows)
  process.exit(0)
}
run().catch(console.error)
