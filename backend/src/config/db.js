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

    // Auto-migrate to add people_count column to bulk_order_enquiries
    try {
      await connection.query("ALTER TABLE bulk_order_enquiries ADD COLUMN people_count INT DEFAULT 1")
      console.log("✅ Auto-migrated bulk_order_enquiries (added people_count)")
    } catch (e) {
      // Ignored if column already exists
    }

    // Auto-migrate to create bulk_order_chat_messages table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bulk_order_chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          enquiry_id INT NOT NULL,
          sender_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (enquiry_id) REFERENCES bulk_order_enquiries(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log("✅ Auto-migrated bulk_order_chat_messages table")
    } catch (e) {
      console.error("❌ Auto-migration of bulk_order_chat_messages failed:", e.message)
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

    // Auto-migrate for delivery rider tables and columns
    try {
      // 1. Modify users role ENUM to support 'rider'
      try {
        await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'kitchen', 'customer', 'rider') NOT NULL")
      } catch (_) {}

      // 2. Create riders table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS riders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          vehicle_type VARCHAR(50) NOT NULL,
          vehicle_number VARCHAR(50) DEFAULT NULL,
          driving_license_number VARCHAR(50) DEFAULT NULL,
          aadhaar_number VARCHAR(12) NOT NULL,
          aadhaar_card VARCHAR(255) NOT NULL,
          aadhaar_card_back VARCHAR(255) NOT NULL,
          pan_number VARCHAR(10) NOT NULL,
          pan_card VARCHAR(255) NOT NULL,
          driving_license VARCHAR(255) DEFAULT NULL,
          status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
          is_online TINYINT(1) NOT NULL DEFAULT 0,
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          cash_collected DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      // 3. Create rider_agreement_signatures table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS rider_agreement_signatures (
          id INT AUTO_INCREMENT PRIMARY KEY,
          rider_id INT NOT NULL,
          user_id INT NOT NULL,
          agreement_version INT NOT NULL,
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NOT NULL,
          device_info VARCHAR(255) NOT NULL,
          app_version VARCHAR(20) NOT NULL,
          FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      // 4. Alter orders table to add delivery fields
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN rider_id INT DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(50) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(6) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN rider_latitude DECIMAL(10, 8) DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN rider_longitude DECIMAL(11, 8) DEFAULT NULL")
      } catch (_) {}

      console.log("✅ Auto-migrated delivery rider tables and columns")
    } catch (e) {
      console.error("❌ Auto-migration of delivery rider tables failed:", e.message)
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
