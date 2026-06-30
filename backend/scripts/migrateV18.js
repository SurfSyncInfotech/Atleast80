import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV18() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = 'visibility_status'`
  )

  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE kitchens
      ADD COLUMN visibility_status ENUM('auto', 'visible', 'hidden') NOT NULL DEFAULT 'auto'
      AFTER is_featured
    `)
    console.log("✅ Added kitchens.visibility_status")
  } else {
    console.log("ℹ️  kitchens.visibility_status already exists")
  }

  console.log("✅ Migration V18 completed")
  process.exit(0)
}

migrateV18().catch((e) => {
  console.error("❌ Migration V18 failed:", e.message)
  process.exit(1)
})
