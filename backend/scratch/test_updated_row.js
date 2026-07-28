import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function testUpdatedRow() {
  const [rows] = await pool.query(
    "SELECT id FROM orders LIMIT 1"
  )
  if (rows.length === 0) {
    console.log("No orders found to test.")
    process.exit(0)
  }
  const orderId = rows[0].id
  
  const [updated] = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [orderId]
  )
  console.log("Returned row keys:", Object.keys(updated[0]))
  console.log("user_id value:", updated[0].user_id)
  process.exit(0)
}

testUpdatedRow().catch(console.error)
