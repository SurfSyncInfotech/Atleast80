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

async function migrateV9() {
  await addColumnIfMissing("users", "address", "address TEXT NULL AFTER phone")
  await addColumnIfMissing("users", "city", "city VARCHAR(100) NULL AFTER address")
  await addColumnIfMissing("users", "pincode", "pincode VARCHAR(10) NULL AFTER city")

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(20) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      kitchen_id INT NOT NULL,
      status ENUM('pending','confirmed','preparing','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
      payment_method VARCHAR(20) DEFAULT 'cod',
      packing_type VARCHAR(30) DEFAULT 'standard',
      delivery_method VARCHAR(30) DEFAULT 'free',
      item_total DECIMAL(10,2) NOT NULL,
      packing_fee DECIMAL(10,2) DEFAULT 0,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      grand_total DECIMAL(10,2) NOT NULL,
      delivery_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_item_id INT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      qty INT NOT NULL,
      image VARCHAR(500),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log("✅ Migration V9 completed")
  process.exit(0)
}

migrateV9().catch((e) => {
  console.error("❌ Migration V9 failed:", e.message)
  process.exit(1)
})
