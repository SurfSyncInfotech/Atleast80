import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV6() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kitchen_stories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kitchen_id INT NOT NULL,
      media_url VARCHAR(500) NOT NULL,
      media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      INDEX idx_kitchen_stories_kitchen (kitchen_id),
      INDEX idx_kitchen_stories_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log("✅ Migration V6 completed — kitchen_stories table")
  process.exit(0)
}

migrateV6().catch((e) => {
  console.error("❌ Migration V6 failed:", e.message)
  process.exit(1)
})
