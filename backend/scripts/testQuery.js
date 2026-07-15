import pool from "../src/config/db.js"
async function run() {
  const [rows] = await pool.query(
    `SELECT e.*, k.name AS kitchen_name
     FROM bulk_order_enquiries e
     JOIN kitchens k ON k.id = e.kitchen_id
     WHERE e.customer_id = ? AND e.kitchen_id = ?
     ORDER BY e.created_at DESC
     LIMIT 1`,
    [18, 10]
  )
  console.log("Query result:", rows)
  process.exit(0)
}
run().catch(console.error)
