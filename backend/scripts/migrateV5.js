import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV5() {
  const columns = [
    "ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status",
    "ADD COLUMN featured_order INT NOT NULL DEFAULT 0 AFTER is_featured",
  ]

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

  console.log("✅ Migration V5 completed")
  process.exit(0)
}

migrateV5().catch((e) => {
  console.error("❌ Migration V5 failed:", e.message)
  process.exit(1)
})
