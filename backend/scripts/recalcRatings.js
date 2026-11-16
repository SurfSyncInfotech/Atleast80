import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function recalcRatings() {
  try {
    const [reviews] = await pool.query(
      "SELECT kitchen_id, COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating FROM order_reviews GROUP BY kitchen_id"
    )
    console.log("Found reviews:", reviews)
    for (const r of reviews) {
      await pool.query(
        "UPDATE kitchens SET rating = ?, rating_count = ? WHERE id = ?",
        [Number(r.avg_rating), Number(r.count), r.kitchen_id]
      )
      console.log(`Updated kitchen ID ${r.kitchen_id}: rating=${r.avg_rating}, count=${r.count}`)
    }
    console.log("✅ Ratings recalculation completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ Ratings recalculation failed:", error.message)
    process.exit(1)
  }
}

recalcRatings()
