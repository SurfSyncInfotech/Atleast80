import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function checkSchema() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
  )
  console.log("Users columns:", cols.map(c => c.COLUMN_NAME))
  process.exit(0)
}

checkSchema().catch(console.error)
