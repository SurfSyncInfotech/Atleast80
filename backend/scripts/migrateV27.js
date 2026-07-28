import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV27() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fcm_token'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN fcm_token VARCHAR(255) DEFAULT NULL`
    )
    console.log("✅ Added users.fcm_token column")
  } else {
    console.log("ℹ️  users.fcm_token column already exists")
  }

  console.log("✅ Migration V27 completed")
  process.exit(0)
}

migrateV27().catch((e) => {
  console.error("❌ Migration V27 failed:", e.message)
  process.exit(1)
})
