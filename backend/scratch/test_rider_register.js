import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import pool from "../src/config/db.js"

dotenv.config()

async function testRiderRegister() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const email = `test_rider_${Date.now()}@test.com`
    const phone = `99${Math.floor(10000000 + Math.random() * 90000000)}`
    const name = "Test Rider"
    const password = "password123"
    const vehicleType = "bicycle"
    const vehicleNumber = "MH-12-AB-1234"
    const drivingLicenseNumber = "DL123456789"
    const aadhaarNumber = "123456789012"
    const panNumber = "ABCDE1234F"
    
    const hash = await bcrypt.hash(password, 10)
    
    // 1. Insert User
    const [userResult] = await connection.query(
      "INSERT INTO users (role, name, email, phone, password_hash, account_verified) VALUES ('rider', ?, ?, ?, ?, 0)",
      [name, email, phone, hash]
    )
    const userId = userResult.insertId
    console.log("Inserted user ID:", userId)

    // 2. Insert Rider
    const [riderResult] = await connection.query(
      `INSERT INTO riders (
        user_id, vehicle_type, vehicle_number, driving_license_number,
        aadhaar_number, aadhaar_card, aadhaar_card_back, pan_number, pan_card, driving_license, status
      ) VALUES (?, ?, ?, ?, ?, 'http://test.com/aadhaar.jpg', 'http://test.com/aadhaar_back.jpg', ?, 'http://test.com/pan.jpg', null, 'pending')`,
      [
        userId, vehicleType, vehicleNumber, drivingLicenseNumber,
        aadhaarNumber, panNumber
      ]
    )
    const riderId = riderResult.insertId
    console.log("Inserted rider ID:", riderId)

    // 3. Insert Signature
    await connection.query(
      `INSERT INTO rider_agreement_signatures (
        rider_id, user_id, agreement_version, ip_address, device_info, app_version
      ) VALUES (?, ?, 1, '127.0.0.1', 'Android', '1.0.0')`,
      [riderId, userId]
    )
    console.log("Inserted signature")

    await connection.commit()
    console.log("✅ Rider registration transaction test SUCCESSFUL!")
  } catch (err) {
    await connection.rollback()
    console.error("❌ Rider registration transaction test FAILED:", err)
  } finally {
    connection.release()
  }
  process.exit(0)
}

testRiderRegister()
