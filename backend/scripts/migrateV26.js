import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV26() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rider_cash_handovers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rider_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE CASCADE
    )
  `)
  console.log("✅ Created rider_cash_handovers table")

  console.log("✅ Migration V26 completed")
  process.exit(0)
}

migrateV26().catch((e) => {
  console.error("❌ Migration V26 failed:", e.message)
  process.exit(1)
})
