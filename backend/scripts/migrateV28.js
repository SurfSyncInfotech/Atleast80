import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV28() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN status ENUM('active', 'suspended', 'blocked') NOT NULL DEFAULT 'active'`
    )
    console.log("✅ Added users.status column")
  } else {
    console.log("ℹ️  users.status column already exists")
  }

  console.log("✅ Migration V28 completed")
  process.exit(0)
}

migrateV28().catch((e) => {
  console.error("❌ Migration V28 failed:", e.message)
  process.exit(1)
})
