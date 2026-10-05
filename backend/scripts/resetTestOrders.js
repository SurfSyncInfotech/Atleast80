import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import mysql from "mysql2/promise"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

async function resetOrders() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })

  const connection = await pool.getConnection()
  try {
    console.log("Starting test orders & transactions cleanup...")
    await connection.query("SET FOREIGN_KEY_CHECKS = 0")

    await connection.query("TRUNCATE TABLE order_items").catch((e) => console.log("order_items:", e.message))
    console.log("✅ Cleared order_items")

    await connection.query("TRUNCATE TABLE orders").catch((e) => console.log("orders:", e.message))
    console.log("✅ Cleared orders")

    await connection.query("TRUNCATE TABLE settlements").catch((e) => console.log("settlements:", e.message))
    console.log("✅ Cleared settlements")

    await connection.query("TRUNCATE TABLE rider_cash_remittances").catch((e) => console.log("rider_cash_remittances:", e.message))
    console.log("✅ Cleared rider_cash_remittances")

    await connection.query("TRUNCATE TABLE cart_items").catch(() => {})
    console.log("✅ Cleared cart_items")

    await connection.query("TRUNCATE TABLE bulk_order_enquiries").catch(() => {})
    console.log("✅ Cleared bulk_order_enquiries")

    await connection.query("TRUNCATE TABLE alerts").catch(() => {})
    console.log("✅ Cleared alerts")

    await connection.query("UPDATE riders SET cash_collected = 0.00").catch(() => {})
    console.log("✅ Reset all rider cash holding balances to 0")

    await connection.query("SET FOREIGN_KEY_CHECKS = 1")
    console.log("\n🎉 All test orders & financial transaction history reset to ZERO!")
    console.log("User accounts, Kitchens, Riders, and Menu Items remain 100% INTACT.")
  } catch (err) {
    console.error("Cleanup error:", err)
  } finally {
    connection.release()
    process.exit(0)
  }
}

resetOrders()
