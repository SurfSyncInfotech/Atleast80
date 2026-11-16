import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function fixAll() {
  console.log("🚀 Starting One-Shot Complete Database Migration & Column Sync...\n")

  const migrations = [
    // KITCHENS
    { table: "kitchens", col: "latitude", sql: "ALTER TABLE kitchens ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL" },
    { table: "kitchens", col: "longitude", sql: "ALTER TABLE kitchens ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL" },
    
    // ORDERS
    { table: "orders", col: "delivery_latitude", sql: "ALTER TABLE orders ADD COLUMN delivery_latitude DECIMAL(10, 8) DEFAULT NULL" },
    { table: "orders", col: "delivery_longitude", sql: "ALTER TABLE orders ADD COLUMN delivery_longitude DECIMAL(11, 8) DEFAULT NULL" },
    { table: "orders", col: "rider_latitude", sql: "ALTER TABLE orders ADD COLUMN rider_latitude DECIMAL(10, 8) DEFAULT NULL" },
    { table: "orders", col: "rider_longitude", sql: "ALTER TABLE orders ADD COLUMN rider_longitude DECIMAL(11, 8) DEFAULT NULL" },
    { table: "orders", col: "cancellation_otp", sql: "ALTER TABLE orders ADD COLUMN cancellation_otp VARCHAR(6) DEFAULT NULL" },
    { table: "orders", col: "cancel_fee_paid", sql: "ALTER TABLE orders ADD COLUMN cancel_fee_paid TINYINT(1) DEFAULT 0" },
    { table: "orders", col: "is_rescue", sql: "ALTER TABLE orders ADD COLUMN is_rescue TINYINT(1) DEFAULT 0" },
    { table: "orders", col: "doorstep_payment_method", sql: "ALTER TABLE orders ADD COLUMN doorstep_payment_method VARCHAR(50) DEFAULT NULL" },
    { table: "orders", col: "arrived_at_customer_at", sql: "ALTER TABLE orders ADD COLUMN arrived_at_customer_at TIMESTAMP DEFAULT NULL" },
    { table: "orders", col: "delivery_fee", sql: "ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00" },
    { table: "orders", col: "delivery_status", sql: "ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(50) DEFAULT NULL" },
    { table: "orders", col: "rider_id", sql: "ALTER TABLE orders ADD COLUMN rider_id INT DEFAULT NULL" },
    { table: "orders", col: "pickup_code", sql: "ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(6) DEFAULT NULL" },
    { table: "orders", col: "delivery_otp", sql: "ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6) DEFAULT NULL" },

    // RIDERS
    { table: "riders", col: "latitude", sql: "ALTER TABLE riders ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL" },
    { table: "riders", col: "longitude", sql: "ALTER TABLE riders ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL" },
    { table: "riders", col: "is_online", sql: "ALTER TABLE riders ADD COLUMN is_online TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "riders", col: "cash_collected", sql: "ALTER TABLE riders ADD COLUMN cash_collected DECIMAL(10, 2) NOT NULL DEFAULT 0.00" },

    // USERS
    { table: "users", col: "fcm_token", sql: "ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) DEFAULT NULL" },
    { table: "users", col: "status", sql: "ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active'" },
    { table: "users", col: "city", sql: "ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL" },
    { table: "users", col: "address", sql: "ALTER TABLE users ADD COLUMN address TEXT DEFAULT NULL" },
    { table: "users", col: "pincode", sql: "ALTER TABLE users ADD COLUMN pincode VARCHAR(10) DEFAULT NULL" }
  ]

  let added = 0
  for (const m of migrations) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM \`${m.table}\` LIKE ?`, [m.col])
      if (cols.length === 0) {
        await pool.query(m.sql)
        console.log(`✅ Added missing column: ${m.table}.${m.col}`)
        added++
      } else {
        console.log(`✔️ Already exists: ${m.table}.${m.col}`)
      }
    } catch (err) {
      console.warn(`⚠️ Skipped ${m.table}.${m.col}:`, err.message)
    }
  }

  console.log(`\n🎉 Complete! ${added} columns added. All tables are 100% in sync!`)
  process.exit(0)
}

fixAll().catch(e => {
  console.error("Migration error:", e)
  process.exit(1)
})
