import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

const columns = [
  "ADD COLUMN images JSON NULL AFTER image",
  "ADD COLUMN videos JSON NULL AFTER images",
]

async function migrateV4() {
  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE menu_items ${col}`)
      console.log(`Added: ${col.split(" ")[2]}`)
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log(`Skipped (exists): ${col.split(" ")[2]}`)
      } else {
        throw error
      }
    }
  }

  await pool.query(`
    UPDATE menu_items
    SET images = JSON_ARRAY(image)
    WHERE image IS NOT NULL AND image != '' AND (images IS NULL OR JSON_LENGTH(images) = 0)
  `)

  console.log("✅ Migration V4 completed")
  process.exit(0)
}

migrateV4().catch((e) => {
  console.error("❌ Migration V4 failed:", e.message)
  process.exit(1)
})
