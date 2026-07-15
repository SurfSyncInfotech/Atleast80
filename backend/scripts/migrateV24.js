import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV24() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'training_video_url'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE site_settings
       ADD COLUMN training_video_url VARCHAR(500) NULL,
       ADD COLUMN training_video_version INT NOT NULL DEFAULT 0,
       ADD COLUMN training_video_updated_at TIMESTAMP NULL`
    )
    console.log("✅ Added site_settings.training_video_url, training_video_version, and training_video_updated_at")
  } else {
    console.log("ℹ️  site_settings training video columns already exist")
  }

  console.log("✅ Migration V24 completed")
  process.exit(0)
}

migrateV24().catch((e) => {
  console.error("❌ Migration V24 failed:", e.message)
  process.exit(1)
})
