import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV29() {
  // Website now requires OTP on a customer's first login (separate from the
  // signup OTP). Backfill account_verified=1 for customers who were already
  // phone-verified before this change, so existing users aren't suddenly
  // asked for an OTP they didn't need before.
  const [result] = await pool.query(
    `UPDATE users SET account_verified = 1 WHERE role = 'customer' AND phone_verified = 1 AND account_verified = 0`
  )
  console.log(`ℹ️  Marked ${result.affectedRows} already-verified customer accounts as account_verified`)

  console.log("✅ Migration V29 completed")
  process.exit(0)
}

migrateV29().catch((e) => {
  console.error("❌ Migration V29 failed:", e.message)
  process.exit(1)
})
