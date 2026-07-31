import pool from "../src/config/db.js"

async function run() {
  try {
    const [users] = await pool.query(
      `SELECT id, name, role, city, fcm_token FROM users WHERE role = 'customer'`
    )
    console.log("=== All Customers in DB ===")
    users.forEach(u => {
      console.log(`ID: ${u.id} | Name: "${u.name}" | City: "${u.city}" | FCM Token: ${u.fcm_token ? u.fcm_token.substring(0, 30) + '...' : 'None'}`)
    })
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
