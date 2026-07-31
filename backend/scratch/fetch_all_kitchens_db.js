import pool from "../src/config/db.js"

async function run() {
  try {
    const [kitchens] = await pool.query(
      `SELECT id, name, status, is_active, visibility_status, city, state FROM kitchens`
    )
    console.log("=== All Kitchens ===")
    kitchens.forEach(k => {
      console.log(`ID: ${k.id} | Name: "${k.name}" | Status: "${k.status}" | Active: ${k.is_active} | Visibility: "${k.visibility_status}" | City: "${k.city}" | State: "${k.state}"`)
    })
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
