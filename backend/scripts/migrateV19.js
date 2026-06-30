import dotenv from "dotenv"
import pool from "../src/config/db.js"
import { MIN_RATINGS_TO_SHOW } from "../src/utils/kitchenRating.js"

dotenv.config()

async function migrateV19() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = 'rating_count'`
  )

  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE kitchens
      ADD COLUMN rating_count INT NOT NULL DEFAULT 0 AFTER rating
    `)
    console.log("✅ Added kitchens.rating_count")
  } else {
    console.log("ℹ️  kitchens.rating_count already exists")
  }

  await pool.query(`
    UPDATE kitchens k
    SET rating_count = (
      SELECT COUNT(*) FROM order_reviews r WHERE r.kitchen_id = k.id
    )
  `)

  await pool.query(`
    UPDATE kitchens SET rating = 0 WHERE rating_count < ?
  `, [MIN_RATINGS_TO_SHOW])

  await pool.query(`
    UPDATE kitchens k
    SET rating = COALESCE((
      SELECT ROUND(AVG(r.rating), 1) FROM order_reviews r WHERE r.kitchen_id = k.id
    ), 0)
    WHERE k.rating_count >= ?
  `, [MIN_RATINGS_TO_SHOW])

  console.log("✅ Backfilled rating_count and ratings")
  console.log("✅ Migration V19 completed")
  process.exit(0)
}

migrateV19().catch((e) => {
  console.error("❌ Migration V19 failed:", e.message)
  process.exit(1)
})
