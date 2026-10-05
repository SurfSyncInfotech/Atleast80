import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"

const router = Router()

function accountDeletionEmail() {
  return (process.env.ACCOUNT_DELETION_EMAIL || "liveatleast80@gmail.com").trim()
}

// Public endpoint: GET platform contact and support info
router.get("/contact", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT support_phone, support_email, support_address FROM site_settings WHERE id = 1"
    )
    if (rows.length === 0) {
      return res.json({
        supportPhone: "+91 40 3559 4439",
        supportEmail: "contact@elifelo.com",
        supportAddress: "Maharashtra, India",
        accountDeletionEmail: accountDeletionEmail(),
      })
    }
    const row = rows[0]
    res.json({
      supportPhone: row.support_phone || "+91 40 3559 4439",
      supportEmail: row.support_email || "contact@elifelo.com",
      supportAddress: row.support_address || "Maharashtra, India",
      accountDeletionEmail: accountDeletionEmail(),
    })
  } catch (error) {
    console.error("GET cms contact error:", error)
    res.status(500).json({ message: "Failed to fetch contact settings" })
  }
})

// Public endpoint: GET policy sections for privacy or terms
router.get("/policies/:type", async (req, res) => {
  try {
    const { type } = req.params
    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({ message: "Invalid policy type. Must be privacy or terms." })
    }

    const [rows] = await pool.query(
      "SELECT type, sections, updated_at FROM cms_policies WHERE type = ?",
      [type]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: `Policy type ${type} not found` })
    }

    const policy = rows[0]
    let sections = policy.sections
    if (typeof sections === "string") {
      try {
        sections = JSON.parse(sections)
      } catch (_) {}
    }

    res.json({
      type: policy.type,
      sections: sections || [],
      updatedAt: policy.updated_at,
    })
  } catch (error) {
    console.error("GET cms policy error:", error)
    res.status(500).json({ message: "Failed to fetch policy content" })
  }
})

// Admin endpoint: GET admin policy sections for privacy or terms
router.get("/admin/policies/:type", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { type } = req.params
    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({ message: "Invalid policy type. Must be privacy or terms." })
    }

    const [rows] = await pool.query(
      "SELECT type, sections, updated_at FROM cms_policies WHERE type = ?",
      [type]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: `Policy type ${type} not found` })
    }

    const policy = rows[0]
    let sections = policy.sections
    if (typeof sections === "string") {
      try {
        sections = JSON.parse(sections)
      } catch (_) {}
    }

    res.json({
      type: policy.type,
      sections: sections || [],
      updatedAt: policy.updated_at,
    })
  } catch (error) {
    console.error("GET admin cms policy error:", error)
    res.status(500).json({ message: "Failed to fetch policy content" })
  }
})

// Admin endpoint: PUT update policy sections for privacy or terms
router.put("/admin/policies/:type", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { type } = req.params
    const { sections } = req.body

    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({ message: "Invalid policy type. Must be privacy or terms." })
    }

    if (!Array.isArray(sections)) {
      return res.status(400).json({ message: "Sections must be an array" })
    }

    const jsonString = JSON.stringify(sections)

    await pool.query(
      `INSERT INTO cms_policies (type, sections) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE sections = VALUES(sections), updated_at = NOW()`,
      [type, jsonString]
    )

    const [rows] = await pool.query(
      "SELECT type, sections, updated_at FROM cms_policies WHERE type = ?",
      [type]
    )

    const updated = rows[0]
    let parsedSections = updated.sections
    if (typeof parsedSections === "string") {
      try {
        parsedSections = JSON.parse(parsedSections)
      } catch (_) {}
    }

    res.json({
      message: `${type === "privacy" ? "Privacy Policy" : "Terms of Service"} updated successfully`,
      type: updated.type,
      sections: parsedSections || [],
      updatedAt: updated.updated_at,
    })
  } catch (error) {
    console.error("PUT admin cms policy error:", error)
    res.status(500).json({ message: "Failed to update policy content" })
  }
})

export default router
