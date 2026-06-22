import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"

const router = Router()

router.use(authRequired, requireRole("admin"))

const SORT_COLUMNS = {
  submitted_at: "k.submitted_at",
  name: "k.name",
  city: "k.city",
  status: "k.status",
}

router.get("/stats", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'pending') AS pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
      FROM kitchens
    `)
    res.json({ stats: rows[0] })
  } catch (error) {
    console.error("Admin stats error:", error)
    res.status(500).json({ message: "Failed to fetch stats" })
  }
})

router.get("/kitchens", async (req, res) => {
  const { status, search, page = 1, limit = 10, sort = "submitted_at", order = "desc" } = req.query
  const allowed = ["pending", "approved", "rejected"]
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(50, Math.max(5, Number(limit) || 10))
  const offset = (pageNum - 1) * limitNum
  const sortCol = SORT_COLUMNS[sort] || SORT_COLUMNS.submitted_at
  const sortOrder = order === "asc" ? "ASC" : "DESC"

  try {
    const where = []
    const params = []

    if (status && allowed.includes(status)) {
      where.push("k.status = ?")
      params.push(status)
    }

    if (req.query.city?.trim()) {
      where.push("k.city = ?")
      params.push(req.query.city.trim())
    }

    if (search?.trim()) {
      where.push(
        "(k.name LIKE ? OR k.owner_name LIKE ? OR k.city LIKE ? OR k.state LIKE ? OR k.email LIKE ? OR k.phone LIKE ? OR k.fssai_number LIKE ?)"
      )
      const q = `%${search.trim()}%`
      params.push(q, q, q, q, q, q, q)
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM kitchens k JOIN users u ON u.id = k.user_id ${whereClause}`,
      params
    )
    const total = countRows[0].total

    const [rows] = await pool.query(
      `SELECT k.*, u.email AS user_email
       FROM kitchens k
       JOIN users u ON u.id = k.user_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({
      kitchens: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    })
  } catch (error) {
    console.error("Admin kitchens list error:", error)
    res.status(500).json({ message: "Failed to fetch kitchens" })
  }
})

router.get("/kitchens/cities", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT city FROM kitchens WHERE city IS NOT NULL AND city != '' ORDER BY city"
    )
    res.json({ cities: rows.map((r) => r.city) })
  } catch (error) {
    console.error("Admin cities error:", error)
    res.status(500).json({ message: "Failed to fetch cities" })
  }
})

router.get("/kitchens/:id/stories", async (req, res) => {
  try {
    const [kitchen] = await pool.query("SELECT id FROM kitchens WHERE id = ?", [req.params.id])
    if (kitchen.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const [rows] = await pool.query(
      `SELECT id, media_url AS mediaUrl, media_type AS mediaType, created_at AS createdAt
       FROM kitchen_stories
       WHERE kitchen_id = ? AND purpose = 'verification'
       ORDER BY created_at DESC`,
      [req.params.id]
    )

    res.json({
      stories: rows.map((s) => ({
        ...s,
        mediaUrl: normalizePublicUrl(s.mediaUrl),
      })),
    })
  } catch (error) {
    console.error("Admin kitchen stories error:", error)
    res.status(500).json({ message: "Failed to fetch hygiene media" })
  }
})

router.patch("/kitchens/:id/approve", async (req, res) => {
  const { id } = req.params
  const hygieneScore = Number(req.body.hygieneScore)

  if (!Number.isFinite(hygieneScore) || hygieneScore < 1 || hygieneScore > 100) {
    return res.status(400).json({ message: "Hygiene score between 1 and 100 is required" })
  }

  try {
    const [existing] = await pool.query("SELECT id, status, cover_image FROM kitchens WHERE id = ?", [id])
    if (existing.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    if (!existing[0].cover_image?.trim()) {
      return res.status(400).json({
        message: "Kitchen has not uploaded a home card image yet",
      })
    }

    const [media] = await pool.query(
      "SELECT COUNT(*) AS count FROM kitchen_stories WHERE kitchen_id = ? AND purpose = 'verification'",
      [id]
    )
    if (media[0].count === 0) {
      return res.status(400).json({
        message: "Kitchen has not uploaded hygiene photos/videos yet",
      })
    }

    await pool.query(
      `UPDATE kitchens
       SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?,
           hygiene_score = ?, rating = 4.5
       WHERE id = ?`,
      [req.user.id, Math.round(hygieneScore), id]
    )

    const [updated] = await pool.query(
      `SELECT k.*, u.email AS user_email FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.id = ?`,
      [id]
    )
    res.json({ message: "Kitchen approved successfully", kitchen: updated[0] })
  } catch (error) {
    console.error("Approve kitchen error:", error)
    res.status(500).json({ message: "Failed to approve kitchen" })
  }
})

router.get("/kitchens/featured", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.*, u.email AS user_email
       FROM kitchens k
       JOIN users u ON u.id = k.user_id
       WHERE k.status = 'approved'
       ORDER BY k.is_featured DESC, k.featured_order ASC, k.name ASC`
    )
    res.json({ kitchens: rows })
  } catch (error) {
    console.error("Admin featured kitchens error:", error)
    res.status(500).json({ message: "Failed to fetch kitchens" })
  }
})

router.patch("/kitchens/:id/feature", async (req, res) => {
  const { id } = req.params
  const featured = Boolean(req.body.featured)

  try {
    const [existing] = await pool.query(
      "SELECT id, status, is_featured FROM kitchens WHERE id = ?",
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    if (existing[0].status !== "approved") {
      return res.status(400).json({ message: "Only approved kitchens can be featured" })
    }

    let featuredOrder = 0
    if (featured) {
      const [maxRow] = await pool.query(
        "SELECT COALESCE(MAX(featured_order), 0) AS max_order FROM kitchens WHERE is_featured = 1"
      )
      featuredOrder = maxRow[0].max_order + 1
    }

    await pool.query(
      "UPDATE kitchens SET is_featured = ?, featured_order = ? WHERE id = ?",
      [featured ? 1 : 0, featuredOrder, id]
    )

    const [updated] = await pool.query(
      `SELECT k.*, u.email AS user_email FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.id = ?`,
      [id]
    )

    res.json({
      message: featured ? "Kitchen added to featured" : "Kitchen removed from featured",
      kitchen: updated[0],
    })
  } catch (error) {
    console.error("Feature kitchen error:", error)
    res.status(500).json({ message: "Failed to update featured status" })
  }
})

router.patch("/kitchens/:id/reject", async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  if (!reason?.trim()) {
    return res.status(400).json({ message: "Rejection reason is required" })
  }

  try {
    const [existing] = await pool.query("SELECT id FROM kitchens WHERE id = ?", [id])
    if (existing.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    await pool.query(
      `UPDATE kitchens
       SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [reason.trim(), req.user.id, id]
    )

    const [updated] = await pool.query(
      `SELECT k.*, u.email AS user_email FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.id = ?`,
      [id]
    )
    res.json({ message: "Kitchen rejected", kitchen: updated[0] })
  } catch (error) {
    console.error("Reject kitchen error:", error)
    res.status(500).json({ message: "Failed to reject kitchen" })
  }
})

router.delete("/kitchens/:id", async (req, res) => {
  const { id } = req.params
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query(
      "SELECT k.id, k.user_id FROM kitchens k WHERE k.id = ?",
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const { user_id: userId } = rows[0]

    await connection.beginTransaction()

    await connection.query(
      `DELETE oi FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.kitchen_id = ?`,
      [id]
    )
    await connection.query("DELETE FROM orders WHERE kitchen_id = ?", [id])
    await connection.query("DELETE FROM kitchens WHERE id = ?", [id])
    await connection.query("DELETE FROM users WHERE id = ? AND role = 'kitchen'", [userId])

    await connection.commit()
    res.json({ message: "Kitchen deleted successfully" })
  } catch (error) {
    await connection.rollback()
    console.error("Delete kitchen error:", error)
    res.status(500).json({ message: "Failed to delete kitchen" })
  } finally {
    connection.release()
  }
})

export default router
