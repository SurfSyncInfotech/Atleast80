import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV16() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bulk_order_enquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kitchen_id INT NOT NULL,
      customer_id INT NOT NULL,
      message TEXT NOT NULL,
      estimated_value DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'quoted') NOT NULL DEFAULT 'pending',
      quotation_file VARCHAR(500) NULL,
      quotation_amount DECIMAL(10,2) NULL,
      quotation_notes TEXT NULL,
      quoted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_bulk_enquiries_kitchen (kitchen_id),
      INDEX idx_bulk_enquiries_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log("✅ bulk_order_enquiries table ready")
  console.log("✅ Migration V16 completed")
  process.exit(0)
}

migrateV16().catch((e) => {
  console.error("❌ Migration V16 failed:", e.message)
  process.exit(1)
})
