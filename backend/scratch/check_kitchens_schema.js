import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function checkKitchensSchema() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens'`
  )
  cols.forEach(c => {
    console.log(`${c.COLUMN_NAME}: ${c.DATA_TYPE} (${c.COLUMN_TYPE})`)
  })
  process.exit(0)
}

checkKitchensSchema().catch(console.error)
