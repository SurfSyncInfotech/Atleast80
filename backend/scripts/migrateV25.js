import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV25() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'cancel_fee_paid'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE orders
       ADD COLUMN cancel_fee_paid TINYINT(1) NOT NULL DEFAULT 0`
    )
    console.log("✅ Added orders.cancel_fee_paid")
  } else {
    console.log("ℹ️  orders.cancel_fee_paid column already exists")
  }

  console.log("✅ Migration V25 completed")
  process.exit(0)
}

migrateV25().catch((e) => {
  console.error("❌ Migration V25 failed:", e.message)
  process.exit(1)
})
