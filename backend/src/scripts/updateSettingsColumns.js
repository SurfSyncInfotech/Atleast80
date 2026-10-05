import "dotenv/config"
import pool from "../config/db.js"

async function run() {
  try {
    await pool.query("ALTER TABLE site_settings ADD COLUMN support_phone VARCHAR(50) DEFAULT '+91 40 3559 4439'")
  } catch (e) {
    console.log("support_phone column note:", e.message)
  }

  try {
    await pool.query("ALTER TABLE site_settings ADD COLUMN support_email VARCHAR(100) DEFAULT 'contact@elifelo.com'")
  } catch (e) {
    console.log("support_email column note:", e.message)
  }

  try {
    await pool.query("ALTER TABLE site_settings ADD COLUMN support_address VARCHAR(255) DEFAULT 'Maharashtra, India'")
  } catch (e) {
    console.log("support_address column note:", e.message)
  }

  await pool.query("UPDATE site_settings SET support_phone = COALESCE(support_phone, '+91 40 3559 4439'), support_email = COALESCE(support_email, 'contact@elifelo.com'), support_address = COALESCE(support_address, 'Maharashtra, India') WHERE id = 1")

  const [rows] = await pool.query("SELECT support_phone, support_email, support_address FROM site_settings WHERE id = 1")
  console.log("Updated site_settings row:", rows[0])
  process.exit(0)
}

run().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
