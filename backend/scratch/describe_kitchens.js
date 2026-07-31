import pool from "../src/config/db.js"

async function run() {
  try {
    const [rows] = await pool.query(`SELECT * FROM kitchens LIMIT 1`)
    console.log("=== Columns in kitchens table ===")
    if (rows.length > 0) {
      console.log(Object.keys(rows[0]))
      console.log("Sample Kitchen:", rows[0])
    } else {
      console.log("No kitchens found in database!")
    }
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
