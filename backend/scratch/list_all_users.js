import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function listAllUsers() {
  const [rows] = await pool.query(
    "SELECT id, role, name, email, phone FROM users"
  )
  console.log("All users in DB:", rows)
  process.exit(0)
}

listAllUsers().catch(console.error)
