import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function addColumnIfMissing(table, column, definition) {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
    console.log(`✅ Added ${table}.${column}`)
  } else {
    console.log(`ℹ️  ${table}.${column} already exists`)
  }
}

async function migrateV8() {
  await addColumnIfMissing("kitchens", "fssai_license", "fssai_license VARCHAR(500) NULL AFTER fssai_number")
  await addColumnIfMissing("menu_items", "offer", "offer VARCHAR(100) NULL AFTER price")
  console.log("✅ Migration V8 completed")
  process.exit(0)
}

migrateV8().catch((e) => {
  console.error("❌ Migration V8 failed:", e.message)
  process.exit(1)
})
