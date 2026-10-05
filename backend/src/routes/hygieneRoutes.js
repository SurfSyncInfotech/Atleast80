import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { requireApprovedKitchen } from "../middleware/kitchen.js"
import { hygieneVideoUpload, getHygieneFileUrl } from "../middleware/upload.js"
import { removeHygieneFile } from "../utils/hygieneFiles.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"
import {
  HYGIENE_AREA,
  HYGIENE_AREA_LABEL,
  getHygieneCompliance,
} from "../utils/hygieneCompliance.js"

const router = Router()

router.get("/me/status", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const status = await getHygieneCompliance(pool, req.kitchenId)
    if (status.video?.mediaUrl) {
      status.video.mediaUrl = normalizePublicUrl(status.video.mediaUrl)
    }
    res.json(status)
  } catch (error) {
    console.error("Hygiene status error:", error)
    res.status(500).json({ message: "Failed to fetch hygiene status" })
  }
})

router.post("/me", authRequired, requireRole("kitchen"), requireApprovedKitchen, (req, res) => {
  hygieneVideoUpload.single("video")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ message: "Video recording is required" })
    }

    try {
      const [existing] = await pool.query(
        `SELECT id, media_url AS mediaUrl
         FROM hygiene_checks
         WHERE kitchen_id = ? AND area = ?`,
        [req.kitchenId, HYGIENE_AREA]
      )

      for (const row of existing) {
        await pool.query("DELETE FROM hygiene_checks WHERE id = ?", [row.id])
        removeHygieneFile(row.mediaUrl)
      }

      const mediaUrl = getHygieneFileUrl(req, req.file.filename)
      const [result] = await pool.query(
        "INSERT INTO hygiene_checks (kitchen_id, area, media_url) VALUES (?, ?, ?)",
        [req.kitchenId, HYGIENE_AREA, mediaUrl]
      )

      const status = await getHygieneCompliance(pool, req.kitchenId)

      res.status(201).json({
        message: `${HYGIENE_AREA_LABEL} saved`,
        check: {
          id: result.insertId,
          area: HYGIENE_AREA,
          mediaUrl: normalizePublicUrl(mediaUrl),
          recordedAt: new Date().toISOString(),
        },
        ...status,
      })
    } catch (error) {
      console.error("Hygiene upload error:", error)
      res.status(500).json({ message: "Failed to save hygiene video" })
    }
  })
})

router.delete("/me", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, media_url AS mediaUrl
       FROM hygiene_checks
       WHERE kitchen_id = ? AND area = ?
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [req.kitchenId, HYGIENE_AREA]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "No hygiene video to delete" })
    }

    const video = rows[0]
    await pool.query("DELETE FROM hygiene_checks WHERE id = ? AND kitchen_id = ?", [
      video.id,
      req.kitchenId,
    ])
    removeHygieneFile(video.mediaUrl)

    const status = await getHygieneCompliance(pool, req.kitchenId)
    res.json({ message: "Hygiene video deleted", ...status })
  } catch (error) {
    console.error("Hygiene delete error:", error)
    res.status(500).json({ message: "Failed to delete hygiene video" })
  }
})

router.get("/kitchen/:kitchenId", async (req, res) => {
  try {
    const kitchenId = req.params.kitchenId
    const [kitchen] = await pool.query(
      "SELECT id, status FROM kitchens WHERE id = ? AND status = 'approved'",
      [kitchenId]
    )
    if (kitchen.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const status = await getHygieneCompliance(pool, kitchenId)

    const [rows] = await pool.query(
      `SELECT id, area, media_url AS mediaUrl, recorded_at AS recordedAt, status, rejection_reason AS rejectionReason
       FROM hygiene_checks
       WHERE kitchen_id = ? AND area = ?
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [kitchenId, HYGIENE_AREA]
    )

    const latestRow = rows[0] || null

    const formattedVideos = rows.map((r) => ({
      ...r,
      mediaUrl: normalizePublicUrl(r.mediaUrl),
      label: HYGIENE_AREA_LABEL,
    }))

    const approvedVideo = (latestRow && latestRow.status === "approved" && status.compliant)
      ? {
          id: latestRow.id,
          area: latestRow.area,
          mediaUrl: normalizePublicUrl(latestRow.mediaUrl),
          recordedAt: latestRow.recordedAt,
          status: latestRow.status,
          label: HYGIENE_AREA_LABEL,
        }
      : null

    res.json({
      approvedVideo,
      video: approvedVideo,
      videos: formattedVideos,
      compliant: status.compliant,
      areas: status.areas,
      latest: status.latest,
    })
  } catch (error) {
    console.error("Public hygiene videos error:", error)
    res.status(500).json({ message: "Failed to fetch hygiene videos" })
  }
})

export default router
