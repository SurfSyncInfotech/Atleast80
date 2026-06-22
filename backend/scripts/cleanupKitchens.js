import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function cleanup() {
  try {
    const [kitchens] = await pool.query(
      `SELECT k.id, k.name, u.email FROM kitchens k JOIN users u ON u.id = k.user_id`
    )

    if (kitchens.length === 0) {
      console.log("No kitchens found to remove")
      process.exit(0)
    }

    console.log(`Found ${kitchens.length} kitchen(s):`)
    kitchens.forEach((k) => console.log(`  - #${k.id} ${k.name} (${k.email})`))

    const [result] = await pool.query("DELETE FROM users WHERE role = 'kitchen'")
    console.log(`✅ Removed ${result.affectedRows} kitchen user(s) and linked kitchen records`)
    process.exit(0)
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message)
    process.exit(1)
  }
}

cleanup()
