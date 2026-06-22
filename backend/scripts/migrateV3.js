import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV3() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kitchen_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category ENUM('food', 'grocery') DEFAULT 'food',
        item_type ENUM('veg', 'non_veg') DEFAULT 'veg',
        image VARCHAR(500),
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
        INDEX idx_kitchen (kitchen_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log("✅ menu_items table ready")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration V3 failed:", error.message)
    process.exit(1)
  }
}

migrateV3()
