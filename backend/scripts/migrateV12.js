import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV12() {
  const [cols] = await pool.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hygiene_checks' AND COLUMN_NAME = 'area'`
  )

  if (cols.length > 0 && !String(cols[0].COLUMN_TYPE).includes("daily_check")) {
    await pool.query(
      `ALTER TABLE hygiene_checks
       MODIFY area ENUM('washing_area', 'fridge', 'cooking_area', 'daily_check') NOT NULL`
    )
    console.log("✅ Added daily_check to hygiene_checks.area enum")
  }

  await pool.query(
    `UPDATE alerts
     SET title = 'Record your daily hygiene video',
         body = 'Record one short video showing your washing area, refrigerator, and cooking area every 24 hours. Your kitchen will be hidden from customers if overdue.'
     WHERE is_system = 1 AND target_role = 'kitchen' AND title LIKE '%hygiene%'`
  )

  console.log("✅ Migration V12 completed")
  process.exit(0)
}

migrateV12().catch((e) => {
  console.error("❌ Migration V12 failed:", e.message)
  process.exit(1)
})
