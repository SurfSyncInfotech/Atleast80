import pool from "../src/config/db.js"

async function run() {
  try {
    const [riders] = await pool.query(
      `SELECT r.id, r.user_id, u.name, u.city, r.is_online, r.status, u.fcm_token 
       FROM riders r
       JOIN users u ON u.id = r.user_id`
    )
    console.log("=== All Riders in DB ===")
    riders.forEach(r => {
      console.log(`ID: ${r.id} | Name: "${r.name}" | City: "${r.city}" | Online: ${r.is_online} | Status: "${r.status}" | FCM: ${r.fcm_token ? 'Yes' : 'No'}`)
    })
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
