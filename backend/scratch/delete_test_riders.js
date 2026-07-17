import pool from "../src/config/db.js"
async function run() {
  const [res] = await pool.query(
    "DELETE FROM users WHERE id IN (30, 31, 32)"
  )
  console.log("Deleted test users:", res.affectedRows)
  process.exit(0)
}
run().catch(console.error)
