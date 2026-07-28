import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function testLimitParams() {
  try {
    let query = `
      FROM riders r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `
    const limit = 15
    const offset = 0
    const params = []

    const [riders] = await pool.query(
      `SELECT r.*, u.name, u.email, u.phone,
              (SELECT COUNT(id) FROM orders WHERE rider_id = r.id AND status = 'delivered' AND DATE(created_at) = CURDATE()) AS today_orders_count,
              (SELECT COALESCE(SUM(delivery_fee), 0) FROM orders WHERE rider_id = r.id AND status = 'delivered' AND DATE(created_at) = CURDATE()) AS today_earnings,
              (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE rider_id = r.id AND status = 'delivered' AND payment_method = 'cod' AND DATE(created_at) = CURDATE()) AS today_cash_collected,
              (SELECT COALESCE(SUM(amount), 0) FROM rider_cash_handovers WHERE rider_id = r.id AND date = CURDATE()) AS today_cash_handover,
              (SELECT COUNT(id) FROM orders WHERE rider_id = r.id AND status = 'delivered') AS total_orders_count,
              (SELECT COALESCE(SUM(delivery_fee), 0) FROM orders WHERE rider_id = r.id AND status = 'delivered') AS total_earnings
       ${query}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    console.log("Success! Riders count:", riders.length)
  } catch (err) {
    console.error("SQL Error with query params:", err)
  }
  process.exit(0)
}

testLimitParams()
