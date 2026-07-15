import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function connectDB() {
  try {
    const connection = await pool.getConnection()
    await connection.ping()

    // Auto-migrate bulk_order_enquiries status enum to add 'completed'
    try {
      await connection.query(`
        ALTER TABLE bulk_order_enquiries
        MODIFY COLUMN status ENUM('pending', 'quoted', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending'
      `)
      console.log("✅ Auto-migrated bulk_order_enquiries.status enum (added 'completed')")
    } catch (e) {
      // Ignored if table doesn't exist yet or already altered
    }

    // Auto-migrate to create kitchen_agreement_signatures table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS kitchen_agreement_signatures (
          id INT AUTO_INCREMENT PRIMARY KEY,
          kitchen_id INT,
          user_id INT NOT NULL,
          agreement_version INT NOT NULL,
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NOT NULL,
          device_info VARCHAR(255) NOT NULL,
          app_version VARCHAR(50) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log("✅ Auto-migrated kitchen_agreement_signatures table")
    } catch (e) {
      console.error("❌ Auto-migration of kitchen_agreement_signatures failed:", e.message)
    }

    // Auto-migrate to add KYC columns to kitchens table
    try {
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_number VARCHAR(12) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_card VARCHAR(255) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN pan_number VARCHAR(10) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN pan_card VARCHAR(255) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_card_back VARCHAR(255) DEFAULT NULL")
      } catch (_) {}
      console.log("✅ Auto-migrated kitchens table with KYC columns")
    } catch (e) {
      console.error("❌ Auto-migration of kitchens KYC columns failed:", e.message)
    }

    connection.release()
    console.log("✅ Database connected successfully")
    return pool
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    throw error
  }
}

export default pool
