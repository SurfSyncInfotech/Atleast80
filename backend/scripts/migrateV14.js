import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV14() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = 'review_comment'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE menu_items
       ADD COLUMN review_comment TEXT NULL AFTER reviewed_by`
    )
    console.log("✅ Added menu_items.review_comment")
  } else {
    console.log("ℹ️  menu_items.review_comment already exists")
  }

  console.log("✅ Migration V14 completed")
  process.exit(0)
}

migrateV14().catch((e) => {
  console.error("❌ Migration V14 failed:", e.message)
  process.exit(1)
})
