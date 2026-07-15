import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV21() {
  // 1. Add is_combo column if it doesn't exist in menu_items
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = 'is_combo'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE menu_items
       ADD COLUMN is_combo TINYINT(1) NOT NULL DEFAULT 0 AFTER is_available`
    )
    console.log("✅ Added menu_items.is_combo")
  } else {
    console.log("ℹ️  menu_items.is_combo already exists")
  }

  // 2. Create combo_items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS combo_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      combo_id INT NOT NULL,
      item_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      FOREIGN KEY (combo_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      INDEX idx_combo (combo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log("✅ Created combo_items table if not exists")

  console.log("✅ Migration V21 completed")
  process.exit(0)
}

migrateV21().catch((e) => {
  console.error("❌ Migration V21 failed:", e.message)
  process.exit(1)
})
