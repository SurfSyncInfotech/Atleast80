import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function testCheckPhone(phone) {
  try {
    const cleanPhone = phone.length === 10 ? phone : phone.slice(-10)
    console.log("Input phone:", JSON.stringify(phone))
    console.log("Cleaned phone:", JSON.stringify(cleanPhone))
    
    const [existingPhone] = await pool.query(
      "SELECT id, role, name, email, phone FROM users WHERE phone = ? OR phone = ?",
      [phone, cleanPhone]
    )
    console.log("Matching rows:", existingPhone)
  } catch (err) {
    console.error(err)
  }
}

async function run() {
  await testCheckPhone("85400 8275")
  await testCheckPhone("85400 82753")
  await testCheckPhone("854008275")
  await testCheckPhone("8540082753")
  process.exit(0)
}

run()
