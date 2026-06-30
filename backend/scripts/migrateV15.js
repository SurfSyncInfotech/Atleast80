import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV15() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone_verified'`
  )

  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash`
    )
    console.log("✅ Added users.phone_verified")

    const [result] = await pool.query(
      `UPDATE users SET phone_verified = 1 WHERE role = 'customer'`
    )
    console.log(`ℹ️  Marked ${result.affectedRows} existing customers as phone-verified`)
  } else {
    console.log("ℹ️  users.phone_verified already exists")
  }

  console.log("✅ Migration V15 completed")
  process.exit(0)
}

migrateV15().catch((e) => {
  console.error("❌ Migration V15 failed:", e.message)
  process.exit(1)
})
