import pool from "../src/config/db.js"

async function run() {
  try {
    const [cols] = await pool.query("DESCRIBE bulk_order_chat_messages")
    console.log("=== bulk_order_chat_messages columns ===")
    cols.forEach(c => console.log(`${c.Field}: ${c.Type}`))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
