import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV7() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = 'cover_image'`
  )

  if (cols.length === 0) {
    await pool.query(
      "ALTER TABLE kitchens ADD COLUMN cover_image VARCHAR(500) NULL AFTER image"
    )
    console.log("✅ Added kitchens.cover_image column")
  } else {
    console.log("ℹ️  kitchens.cover_image already exists")
  }

  console.log("✅ Migration V7 completed")
  process.exit(0)
}

migrateV7().catch((e) => {
  console.error("❌ Migration V7 failed:", e.message)
  process.exit(1)
})
