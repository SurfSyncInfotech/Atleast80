import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function run() {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, city, 
              CASE WHEN fcm_token IS NULL THEN 'NULL' ELSE 'PRESENT' END AS fcm_token_status 
       FROM users 
       WHERE role = 'customer'`
    )
    console.log("=== All Customer Users in Database ===")
    console.table(rows)
  } catch (e) {
    console.error("Error querying database:", e.message)
  }
  process.exit(0)
}

run()
