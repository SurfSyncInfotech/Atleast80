import pool from "../src/config/db.js"

async function run() {
  try {
    const [kitchens] = await pool.query(
      `SELECT id, name, status, is_approved, city, state, is_active FROM kitchens`
    )
    console.log("=== Database Kitchens ===")
    kitchens.forEach(k => {
      console.log(`ID: ${k.id} | Name: ${k.name} | Status: "${k.status}" | Approved: ${k.is_approved} | Active: ${k.is_active} | City: "${k.city}" | State: "${k.state}"`)
    })
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
