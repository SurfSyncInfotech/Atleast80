import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

const columns = [
  "ADD COLUMN state VARCHAR(100) DEFAULT 'Uttar Pradesh' AFTER city",
  "ADD COLUMN pincode VARCHAR(10) AFTER state",
  "ADD COLUMN kitchen_type ENUM('veg', 'non_veg', 'both') DEFAULT 'veg' AFTER speciality",
  "ADD COLUMN fssai_number VARCHAR(50) AFTER kitchen_type",
  "ADD COLUMN opening_time VARCHAR(100) DEFAULT '9 AM - 9 PM' AFTER fssai_number",
]

async function migrateV2() {
  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE kitchens ${col}`)
      console.log(`Added: ${col.split(" ")[2]}`)
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log(`Skipped (exists): ${col.split(" ")[2]}`)
      } else {
        throw error
      }
    }
  }
  console.log("✅ Migration V2 completed")
  process.exit(0)
}

migrateV2().catch((e) => {
  console.error("❌ Migration V2 failed:", e.message)
  process.exit(1)
})
