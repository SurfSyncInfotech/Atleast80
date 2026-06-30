import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV11() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hygiene_checks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kitchen_id INT NOT NULL,
      area ENUM('washing_area', 'fridge', 'cooking_area') NOT NULL,
      media_url VARCHAR(500) NOT NULL,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      INDEX idx_hygiene_kitchen (kitchen_id),
      INDEX idx_hygiene_recorded (recorded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      target_role ENUM('kitchen', 'customer') NOT NULL,
      kitchen_id INT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      is_system BOOLEAN DEFAULT FALSE,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_alerts_target (target_role),
      INDEX idx_alerts_kitchen (kitchen_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_dismissals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      alert_id INT NOT NULL,
      user_id INT NOT NULL,
      dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_alert_user (alert_id, user_id),
      FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const [existing] = await pool.query(
    "SELECT COUNT(*) AS c FROM alerts WHERE is_system = 1 AND target_role = 'kitchen'"
  )
  if (existing[0].c === 0) {
    await pool.query(
      `INSERT INTO alerts (target_role, title, body, is_system) VALUES
       ('kitchen', 'Record daily hygiene videos',
        'Upload fresh videos of your washing area, refrigerator, and cooking area every 24 hours using the camera. Your kitchen will be hidden from customers if overdue.',
        1),
       ('kitchen', 'No outside selling allowed',
        'Selling food outside the Atleast80 platform is strictly prohibited. Violations will result in immediate account ban.',
        1)`
    )
  }

  console.log("✅ Migration V11 completed — hygiene_checks, alerts")
  process.exit(0)
}

migrateV11().catch((e) => {
  console.error("❌ Migration V11 failed:", e.message)
  process.exit(1)
})
