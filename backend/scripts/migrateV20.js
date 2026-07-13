import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV20() {
  const columnsToAdd = [
    { name: "is_active", definition: "ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status" },
    { name: "is_fresh_food_active", definition: "ADD COLUMN is_fresh_food_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active" },
    { name: "is_grocery_active", definition: "ADD COLUMN is_grocery_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_fresh_food_active" }
  ]

  for (const col of columnsToAdd) {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = ?`,
      [col.name]
    )

    if (cols.length === 0) {
      await pool.query(`ALTER TABLE kitchens ${col.definition}`)
      console.log(`✅ Added kitchens.${col.name}`)
    } else {
      console.log(`ℹ️  kitchens.${col.name} already exists`)
    }
  }

  console.log("✅ Migration V20 completed")
  process.exit(0)
}

migrateV20().catch((e) => {
  console.error("❌ Migration V20 failed:", e.message)
  process.exit(1)
})
