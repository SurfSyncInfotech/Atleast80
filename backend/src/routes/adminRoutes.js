import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"
import { formatMenuItem } from "../utils/menuItem.js"

const router = Router()

router.use(authRequired, requireRole("admin"))

const SORT_COLUMNS = {
  submitted_at: "k.submitted_at",
  name: "k.name",
  city: "k.city",
  status: "k.status",
}

let phoneVerifiedColumnCache = null

async function getPhoneVerifiedSelect() {
  if (phoneVerifiedColumnCache != null) return phoneVerifiedColumnCache
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone_verified'`
  )
  phoneVerifiedColumnCache = cols.length > 0 ? "phone_verified" : "0 AS phone_verified"
  return phoneVerifiedColumnCache
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

    await pool.query(
      `UPDATE kitchens
       SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?,
           rating = 4.5
       WHERE id = ?`,
      [req.user.id, id]
    )

    await pool.query(
      `INSERT INTO alerts (target_role, kitchen_id, title, body, is_system, created_by) VALUES (?, ?, ?, ?, 1, ?)`,
      [
        "kitchen",
        id,
        "You're approved — record hygiene videos",
        "Congratulations! Your kitchen is live. Record one short daily video covering your washing area, refrigerator, and cooking area using the camera on your dashboard. Overdue kitchens are hidden from customers.",
        req.user.id,
      ]
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

router.post("/alerts", async (req, res) => {
  const { targetRole, title, body, kitchenId } = req.body
  if (!["kitchen", "customer"].includes(targetRole)) {
    return res.status(400).json({ message: "targetRole must be kitchen or customer" })
  }
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ message: "Title and body are required" })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO alerts (target_role, kitchen_id, title, body, is_system, created_by)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [targetRole, kitchenId || null, title.trim(), body.trim(), req.user.id]
    )
    res.status(201).json({ message: "Alert created", id: result.insertId })
  } catch (error) {
    console.error("Create alert error:", error)
    res.status(500).json({ message: "Failed to create alert" })
  }
})

router.get("/alerts", async (req, res) => {
  const targetRole = req.query.targetRole

  try {
    const params = []
    let where = ""

    if (targetRole === "kitchen" || targetRole === "customer") {
      where = "WHERE target_role = ?"
      params.push(targetRole)
    }

    const [rows] = await pool.query(
      `SELECT id, target_role AS targetRole, kitchen_id AS kitchenId, title, body,
              is_system AS isSystem, created_at AS createdAt
       FROM alerts
       ${where}
       ORDER BY created_at DESC
       LIMIT 100`,
      params
    )
    res.json({ alerts: rows })
  } catch (error) {
    console.error("Admin alerts list error:", error)
    res.status(500).json({ message: "Failed to fetch alerts" })
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

router.get("/menu", async (req, res) => {
  const status = req.query.status
  const allowed = ["pending", "approved", "rejected"]

  try {
    const params = []
    let where = "WHERE k.status = 'approved'"

    if (status && allowed.includes(status)) {
      where += " AND m.approval_status = ?"
      params.push(status)
    }

    const [rows] = await pool.query(
      `SELECT m.*, k.name AS kitchen_name, k.city AS kitchen_city,
              k.cover_image AS kitchen_cover_image, k.owner_name AS kitchen_owner_name
       FROM menu_items m
       INNER JOIN kitchens k ON k.id = m.kitchen_id
       ${where}
       ORDER BY k.name ASC, m.created_at DESC
       LIMIT 500`,
      params
    )

    const kitchenMap = new Map()

    for (const row of rows) {
      const kitchenId = row.kitchen_id

      if (!kitchenMap.has(kitchenId)) {
        kitchenMap.set(kitchenId, {
          id: kitchenId,
          name: row.kitchen_name,
          city: row.kitchen_city,
          ownerName: row.kitchen_owner_name,
          coverImage: normalizePublicUrl(row.kitchen_cover_image),
          items: [],
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        })
      }

      const kitchen = kitchenMap.get(kitchenId)
      const item = {
        ...formatMenuItem(row),
        kitchen_id: kitchenId,
        kitchen_name: row.kitchen_name,
        kitchen_city: row.kitchen_city,
      }

      kitchen.items.push(item)

      const itemStatus = item.approvalStatus || item.approval_status || "pending"
      if (itemStatus === "pending") kitchen.pendingCount += 1
      else if (itemStatus === "approved") kitchen.approvedCount += 1
      else if (itemStatus === "rejected") kitchen.rejectedCount += 1
    }

    const kitchens = Array.from(kitchenMap.values()).sort((a, b) => {
      if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount
      return a.name.localeCompare(b.name)
    })

    res.json({ kitchens })
  } catch (error) {
    console.error("Admin menu list error:", error)
    res.status(500).json({ message: "Failed to fetch menu items" })
  }
})

router.patch("/menu/:id/approve", async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE menu_items
       SET approval_status = 'approved', review_comment = NULL, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [req.user.id, req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Menu item not found" })
    }

    const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [req.params.id])
    res.json({ message: "Menu item approved", item: formatMenuItem(items[0]) })
  } catch (error) {
    console.error("Approve menu item error:", error)
    res.status(500).json({ message: "Failed to approve menu item" })
  }
})

router.patch("/menu/:id/reject", async (req, res) => {
  const comment = req.body?.comment?.trim()
  if (!comment) {
    return res.status(400).json({ message: "Comment is required when rejecting a menu item" })
  }

  try {
    const [result] = await pool.query(
      `UPDATE menu_items
       SET approval_status = 'rejected', review_comment = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [comment, req.user.id, req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Menu item not found" })
    }

    const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [req.params.id])
    res.json({ message: "Menu item rejected", item: formatMenuItem(items[0]) })
  } catch (error) {
    console.error("Reject menu item error:", error)
    res.status(500).json({ message: "Failed to reject menu item" })
  }
})

router.patch("/menu/:id/comment", async (req, res) => {
  const comment = req.body?.comment?.trim()
  if (!comment) {
    return res.status(400).json({ message: "Comment is required" })
  }

  try {
    const [result] = await pool.query(
      `UPDATE menu_items SET review_comment = ? WHERE id = ?`,
      [comment, req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Menu item not found" })
    }

    const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [req.params.id])
    res.json({ message: "Comment saved", item: formatMenuItem(items[0]) })
  } catch (error) {
    console.error("Menu item comment error:", error)
    res.status(500).json({ message: "Failed to save comment" })
  }
})

router.delete("/menu/:id", async (req, res) => {
  const comment = req.body?.comment?.trim()

  try {
    const [existing] = await pool.query(
      `SELECT m.id, m.name, m.kitchen_id FROM menu_items m WHERE m.id = ?`,
      [req.params.id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ message: "Menu item not found" })
    }

    const item = existing[0]
    await pool.query("DELETE FROM menu_items WHERE id = ?", [req.params.id])

    if (comment) {
      await pool.query(
        `INSERT INTO alerts (target_role, kitchen_id, title, body, is_system, created_by)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [
          "kitchen",
          item.kitchen_id,
          `Menu item removed: ${item.name}`,
          comment,
          req.user.id,
        ]
      )
    }

    res.json({ message: "Menu item deleted" })
  } catch (error) {
    console.error("Delete menu item error:", error)
    res.status(500).json({ message: "Failed to delete menu item" })
  }
})

router.get("/customers", async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(10, Number(limit) || 20))
  const offset = (pageNum - 1) * limitNum

  try {
    const where = ["role = 'customer'"]
    const params = []

    if (search?.trim()) {
      where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)")
      const q = `%${search.trim()}%`
      params.push(q, q, q)
    }

    const whereClause = `WHERE ${where.join(" AND ")}`
    const phoneVerifiedSelect = await getPhoneVerifiedSelect()

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    )
    const total = Number(countRows[0].total)

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, ${phoneVerifiedSelect}, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    res.json({
      customers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        phoneVerified: Boolean(row.phone_verified),
        createdAt: row.created_at,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    })
  } catch (error) {
    console.error("Admin customers list error:", error)
    res.status(500).json({ message: "Failed to fetch customers" })
  }
})

router.delete("/customers/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!id) {
    return res.status(400).json({ message: "Invalid customer id" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'customer'",
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }

    await pool.query("DELETE FROM users WHERE id = ? AND role = 'customer'", [id])

    res.json({ message: `Customer "${rows[0].name}" deleted` })
  } catch (error) {
    console.error("Delete customer error:", error)
    res.status(500).json({ message: "Failed to delete customer" })
  }
})

export default router
