import pool from "../src/config/db.js"

async function check() {
  const [kitchens] = await pool.query("SELECT id, name, city, rating, rating_count FROM kitchens WHERE name LIKE '%Spice%' OR name LIKE '%Fine%'")
  console.log("KITCHENS:", kitchens)
  const [reviews] = await pool.query("SELECT id, order_id, kitchen_id, rating, review FROM order_reviews WHERE kitchen_id IN (SELECT id FROM kitchens WHERE name LIKE '%Spice%' OR name LIKE '%Fine%')")
  console.log("REVIEWS:", reviews)
  process.exit(0)
}

check()
