import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV22() {
  // Alter bulk_order_enquiries.status enum to add 'accepted' and 'rejected'
  await pool.query(`
    ALTER TABLE bulk_order_enquiries
    MODIFY COLUMN status ENUM('pending', 'quoted', 'accepted', 'rejected') NOT NULL DEFAULT 'pending'
  `)
  console.log("✅ Modified bulk_order_enquiries.status enum values")
  console.log("✅ Migration V22 completed")
  process.exit(0)
}

migrateV22().catch((e) => {
  console.error("❌ Migration V22 failed:", e.message)
  process.exit(1)
})
