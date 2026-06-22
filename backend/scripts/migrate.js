import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@atleast80.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"
const ADMIN_NAME = process.env.ADMIN_NAME || "Atleast80 Admin"

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role ENUM('admin', 'kitchen', 'customer') NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(15) UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kitchens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(15) NOT NULL,
        address TEXT,
        city VARCHAR(100) DEFAULT 'Lucknow',
        state VARCHAR(100) DEFAULT 'Uttar Pradesh',
        pincode VARCHAR(10),
        speciality VARCHAR(255),
        kitchen_type ENUM('veg', 'non_veg', 'both') DEFAULT 'veg',
        fssai_number VARCHAR(50),
        opening_time VARCHAR(100) DEFAULT '9 AM - 9 PM',
        description TEXT,
        image VARCHAR(500),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        rejection_reason TEXT,
        hygiene_score INT DEFAULT 0,
        rating DECIMAL(2,1) DEFAULT 0.0,
        delivery_time VARCHAR(50) DEFAULT '30 min',
        offer VARCHAR(100),
        best_item VARCHAR(255),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? AND role = 'admin'", [ADMIN_EMAIL])

    if (existing.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)
      await pool.query(
        "INSERT INTO users (role, name, email, password_hash) VALUES ('admin', ?, ?, ?)",
        [ADMIN_NAME, ADMIN_EMAIL, hash]
      )
      console.log(`Admin user created: ${ADMIN_EMAIL}`)
    } else {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`)
    }

    console.log("✅ Migration completed successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error.message)
    process.exit(1)
  }
}

migrate()
