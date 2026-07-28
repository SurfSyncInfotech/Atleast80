import pool from "../src/config/db.js"

async function run() {
  try {
    const [userCols] = await pool.query("DESCRIBE users")
    console.log("=== users columns ===")
    userCols.forEach(c => console.log(`${c.Field}: ${c.Type}`))

    const [riderCols] = await pool.query("DESCRIBE riders")
    console.log("\n=== riders columns ===")
    riderCols.forEach(c => console.log(`${c.Field}: ${c.Type}`))
  } catch (e) {
    console.error("Error inspecting schema:", e.message)
  }
  process.exit(0)
}

run()
