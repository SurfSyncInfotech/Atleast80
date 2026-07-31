import pool from "../src/config/db.js"

async function run() {
  try {
    const [users] = await pool.query(
      `SELECT id, role, name, city, fcm_token, status 
       FROM users 
       WHERE fcm_token IS NOT NULL`
    )
    console.log("=== Users with FCM tokens ===")
    if (users.length === 0) {
      console.log("No users found with active FCM tokens in the database!")
    } else {
      users.forEach(u => {
        console.log(`User ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | City: "${u.city || ''}" | FCM Token: ${u.fcm_token ? 'Present' : 'None'} | Status: ${u.status}`)
      })
    }

    const [kitchens] = await pool.query(
      `SELECT id, name, city FROM kitchens`
    )
    console.log("\n=== Kitchens ===")
    kitchens.forEach(k => {
      console.log(`Kitchen ID: ${k.id} | Name: ${k.name} | City: "${k.city || ''}"`)
    })

  } catch (e) {
    console.error("Error checking database:", e.message)
  }
  process.exit(0)
}

run()
