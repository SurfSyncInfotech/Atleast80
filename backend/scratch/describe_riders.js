import pool from "../src/config/db.js"

async function run() {
  try {
    const [rows] = await pool.query(`SELECT * FROM riders LIMIT 1`)
    console.log("=== Columns in riders table ===")
    if (rows.length > 0) {
      console.log(Object.keys(rows[0]))
    } else {
      console.log("No riders found!")
    }
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
