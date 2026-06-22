/**
 * One-time fix: upgrade http:// media URLs to https:// in the database.
 * Run on server: node scripts/fixHttpMediaUrls.js
 */
import dotenv from "dotenv"
import pool from "../src/config/db.js"
import { normalizePublicUrl } from "../src/utils/mediaUrl.js"
import { parseJsonArray } from "../src/utils/menuItem.js"

dotenv.config()

function fixUrl(url) {
  return normalizePublicUrl(url)
}

async function fixKitchens() {
  const [rows] = await pool.query(
    "SELECT id, image, cover_image FROM kitchens WHERE image LIKE 'http://%' OR cover_image LIKE 'http://%'"
  )
  for (const row of rows) {
    await pool.query("UPDATE kitchens SET image = ?, cover_image = ? WHERE id = ?", [
      fixUrl(row.image),
      fixUrl(row.cover_image),
      row.id,
    ])
  }
  console.log(`kitchens image/cover: ${rows.length} row(s) updated`)
}

async function fixMenuItems() {
  const [rows] = await pool.query("SELECT id, image, images, videos FROM menu_items")
  let updated = 0
  for (const row of rows) {
    const image = fixUrl(row.image)
    const images = parseJsonArray(row.images).map(fixUrl).filter(Boolean)
    const videos = parseJsonArray(row.videos).map(fixUrl).filter(Boolean)
    const nextImage = image || images[0] || null

    const changed =
      nextImage !== row.image ||
      JSON.stringify(images) !== JSON.stringify(parseJsonArray(row.images)) ||
      JSON.stringify(videos) !== JSON.stringify(parseJsonArray(row.videos))

    if (changed) {
      await pool.query("UPDATE menu_items SET image = ?, images = ?, videos = ? WHERE id = ?", [
        nextImage,
        JSON.stringify(images),
        JSON.stringify(videos),
        row.id,
      ])
      updated++
    }
  }
  console.log(`menu_items: ${updated} row(s) updated`)
}

async function fixStories() {
  const [rows] = await pool.query("SELECT id, media_url FROM kitchen_stories WHERE media_url LIKE 'http://%'")
  for (const row of rows) {
    await pool.query("UPDATE kitchen_stories SET media_url = ? WHERE id = ?", [
      fixUrl(row.media_url),
      row.id,
    ])
  }
  console.log(`kitchen_stories.media_url: ${rows.length} row(s) updated`)
}

async function main() {
  await fixKitchens()
  await fixMenuItems()
  await fixStories()
  await pool.end()
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
