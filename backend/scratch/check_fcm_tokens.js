import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function checkFcmTokens() {
  const [rows] = await pool.query(
    "SELECT id, role, name, fcm_token FROM users WHERE fcm_token IS NOT NULL"
  )
  console.log("Users with active FCM tokens:", rows)
  process.exit(0)
}

checkFcmTokens().catch(console.error)
