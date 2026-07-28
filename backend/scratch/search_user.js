import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function searchUser() {
  const [rows] = await pool.query(
    "SELECT id, role, name, email, phone FROM users WHERE phone LIKE '%85400%'"
  )
  console.log("Matching users:", rows)
  process.exit(0)
}

searchUser().catch(console.error)
