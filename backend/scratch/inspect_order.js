import pool from "../src/config/db.js"
async function run() {
  const [rows] = await pool.query(
    `SELECT id, order_number, status, delivery_status, pickup_code, delivery_otp, delivery_fee 
     FROM orders ORDER BY id DESC LIMIT 2`
  )
  console.log("Last 2 orders in DB:")
  console.table(rows)
  process.exit(0)
}
run().catch(console.error)
