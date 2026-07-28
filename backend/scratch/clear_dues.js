import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function clearDues() {
  await pool.query(
    "UPDATE orders SET delivery_status = 'delivered', status = 'delivered' WHERE delivery_status = 'handover_pending'"
  )
  console.log("✅ Updated all 'handover_pending' orders to 'delivered'")
  process.exit(0)
}

clearDues().catch(console.error)
