import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV17() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      kitchen_id INT NOT NULL,
      rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      INDEX idx_order_reviews_kitchen (kitchen_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log("✅ order_reviews table ready")
  console.log("✅ Migration V17 completed")
  process.exit(0)
}

migrateV17().catch((e) => {
  console.error("❌ Migration V17 failed:", e.message)
  process.exit(1)
})
