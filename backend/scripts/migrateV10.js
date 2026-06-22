import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV10() {
  const [cols] = await pool.query(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchen_stories' AND COLUMN_NAME = 'purpose'`
  )

  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE kitchen_stories
      ADD COLUMN purpose ENUM('verification', 'story') NOT NULL DEFAULT 'verification'
      AFTER media_type
    `)
    console.log("✅ Added kitchen_stories.purpose column (existing rows = verification)")
  } else {
    console.log("ℹ️ kitchen_stories.purpose already exists — skipped")
  }

  console.log("✅ Migration V10 completed")
  process.exit(0)
}

migrateV10().catch((e) => {
  console.error("❌ Migration V10 failed:", e.message)
  process.exit(1)
})
