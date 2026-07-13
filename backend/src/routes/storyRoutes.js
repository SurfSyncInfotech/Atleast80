import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { requireApprovedKitchen, requireKitchen } from "../middleware/kitchen.js"
import {
  storyUpload,
  getStoryFileUrl,
  isImageMime,
  isVideoMime,
} from "../middleware/upload.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"

const router = Router()

function groupStories(rows) {
  const map = new Map()

  for (const row of rows) {
    if (!map.has(row.kitchen_id)) {
      map.set(row.kitchen_id, {
        kitchenId: row.kitchen_id,
        kitchenName: row.kitchen_name,
        kitchenImage: normalizePublicUrl(row.kitchen_image),
        stories: [],
      })
    }
    map.get(row.kitchen_id).stories.push({
      id: row.id,
      mediaUrl: normalizePublicUrl(row.media_url),
      mediaType: row.media_type,
      createdAt: row.created_at,
    })
  }

  return Array.from(map.values())
}

router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.kitchen_id, s.media_url, s.media_type, s.created_at,
              k.name AS kitchen_name, k.image AS kitchen_image
       FROM kitchen_stories s
       JOIN kitchens k ON k.id = s.kitchen_id
       WHERE k.status = 'approved' AND k.is_active = 1 AND s.purpose = 'story'
       ORDER BY s.created_at ASC`
    )
    res.json({ groups: groupStories(rows) })
  } catch (error) {
    console.error("Public stories error:", error)
    res.status(500).json({ message: "Failed to fetch stories" })
  }
})

router.get("/verification/me", authRequired, requireRole("kitchen"), requireKitchen, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, media_url AS mediaUrl, media_type AS mediaType, created_at AS createdAt
       FROM kitchen_stories
       WHERE kitchen_id = ? AND purpose = 'verification'
       ORDER BY created_at DESC`,
      [req.kitchenId]
    )
    res.json({
      stories: rows.map((s) => ({
        ...s,
        mediaUrl: normalizePublicUrl(s.mediaUrl),
      })),
    })
  } catch (error) {
    console.error("Hygiene verification list error:", error)
    res.status(500).json({ message: "Failed to fetch hygiene media" })
  }
})

router.post("/verification", authRequired, requireRole("kitchen"), requireKitchen, (req, res) => {
  if (req.kitchenStatus === "rejected") {
    return res.status(403).json({ message: "Re-submit your application before uploading hygiene media" })
  }

  storyUpload.array("files", 20)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }

    const files = req.files || []
    if (files.length === 0) {
      return res.status(400).json({ message: "Upload at least one photo or video of your kitchen and food" })
    }

    try {
      const inserted = []

      for (const file of files) {
        const mediaType = isVideoMime(file.mimetype) ? "video" : isImageMime(file.mimetype) ? "image" : null
        if (!mediaType) continue

        const mediaUrl = getStoryFileUrl(req, file.filename)
        const [result] = await pool.query(
          "INSERT INTO kitchen_stories (kitchen_id, media_url, media_type, purpose) VALUES (?, ?, ?, 'verification')",
          [req.kitchenId, mediaUrl, mediaType]
        )
        inserted.push({
          id: result.insertId,
          mediaUrl: normalizePublicUrl(mediaUrl),
          mediaType,
        })
      }

      if (inserted.length === 0) {
        return res.status(400).json({ message: "No valid image or video files uploaded" })
      }

      res.status(201).json({
        message: `${inserted.length} file(s) uploaded for hygiene verification`,
        stories: inserted,
      })
    } catch (error) {
      console.error("Hygiene verification upload error:", error)
      res.status(500).json({ message: "Failed to save hygiene media" })
    }
  })
})

router.delete("/verification/:id", authRequired, requireRole("kitchen"), requireKitchen, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM kitchen_stories WHERE id = ? AND kitchen_id = ? AND purpose = 'verification'",
      [req.params.id, req.kitchenId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Media not found" })
    }

    res.json({ message: "Media removed" })
  } catch (error) {
    console.error("Delete hygiene media error:", error)
    res.status(500).json({ message: "Failed to delete media" })
  }
})

router.get("/me", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, media_url AS mediaUrl, media_type AS mediaType, created_at AS createdAt
       FROM kitchen_stories
       WHERE kitchen_id = ? AND purpose = 'story'
       ORDER BY created_at DESC`,
      [req.kitchenId]
    )
    res.json({
      stories: rows.map((s) => ({
        ...s,
        mediaUrl: normalizePublicUrl(s.mediaUrl),
      })),
    })
  } catch (error) {
    console.error("Kitchen stories me error:", error)
    res.status(500).json({ message: "Failed to fetch your stories" })
  }
})

router.post("/", authRequired, requireRole("kitchen"), requireApprovedKitchen, (req, res) => {
  storyUpload.array("files", 20)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }

    const files = req.files || []
    if (files.length === 0) {
      return res.status(400).json({ message: "At least one photo or video is required" })
    }

    try {
      const inserted = []

      for (const file of files) {
        const mediaType = isVideoMime(file.mimetype) ? "video" : isImageMime(file.mimetype) ? "image" : null
        if (!mediaType) continue

        const mediaUrl = getStoryFileUrl(req, file.filename)
        const [result] = await pool.query(
          "INSERT INTO kitchen_stories (kitchen_id, media_url, media_type, purpose) VALUES (?, ?, ?, 'story')",
          [req.kitchenId, mediaUrl, mediaType]
        )
        inserted.push({
          id: result.insertId,
          mediaUrl: normalizePublicUrl(mediaUrl),
          mediaType,
        })
      }

      if (inserted.length === 0) {
        return res.status(400).json({ message: "No valid image or video files uploaded" })
      }

      res.status(201).json({ message: `${inserted.length} story item(s) added`, stories: inserted })
    } catch (error) {
      console.error("Story upload error:", error)
      res.status(500).json({ message: "Failed to save stories" })
    }
  })
})

router.delete("/:id", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM kitchen_stories WHERE id = ? AND kitchen_id = ? AND purpose = 'story'",
      [req.params.id, req.kitchenId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Story not found" })
    }

    res.json({ message: "Story deleted" })
  } catch (error) {
    console.error("Delete story error:", error)
    res.status(500).json({ message: "Failed to delete story" })
  }
})

export default router
