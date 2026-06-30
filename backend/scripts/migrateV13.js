import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV13() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = 'approval_status'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE menu_items
       ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'
       AFTER is_available,
       ADD COLUMN reviewed_at TIMESTAMP NULL AFTER approval_status,
       ADD COLUMN reviewed_by INT NULL AFTER reviewed_at`
    )
    await pool.query("UPDATE menu_items SET approval_status = 'approved'")
    console.log("✅ Added menu_items.approval_status (existing rows marked approved)")
  } else {
    console.log("ℹ️  menu_items.approval_status already exists")
  }

  console.log("✅ Migration V13 completed")
  process.exit(0)
}

migrateV13().catch((e) => {
  console.error("❌ Migration V13 failed:", e.message)
  process.exit(1)
})
