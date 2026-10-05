import pool from "../src/config/db.js"

async function run() {
  const connection = await pool.getConnection()
  try {
    try {
      await connection.query("ALTER TABLE menu_items ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00")
      console.log("Added gst_rate to menu_items")
    } catch (e) {
      console.log("gst_rate already exists in menu_items or error:", e.message)
    }

    try {
      await connection.query("ALTER TABLE menu_items ADD COLUMN packaging_type ENUM('loose', 'packaged') NOT NULL DEFAULT 'packaged'")
      console.log("Added packaging_type to menu_items")
    } catch (e) {
      console.log("packaging_type already exists in menu_items or error:", e.message)
    }

    try {
      await connection.query("ALTER TABLE menu_items ADD COLUMN local_name VARCHAR(255) NULL DEFAULT NULL")
      console.log("Added local_name to menu_items")
    } catch (e) {
      console.log("local_name already exists in menu_items or error:", e.message)
    }

    try {
      await connection.query("ALTER TABLE order_items ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00")
      console.log("Added gst_rate to order_items")
    } catch (e) {
      console.log("gst_rate already exists in order_items or error:", e.message)
    }
  } finally {
    connection.release()
    process.exit(0)
  }
}

run().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
