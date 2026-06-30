import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"
import { formatMenuItem } from "../utils/menuItem.js"
import { getKitchenVisibilityInfo } from "../utils/hygieneCompliance.js"

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

function mapAdminOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    kitchenId: row.kitchen_id,
    kitchenName: row.kitchen_name,
    kitchenCity: row.kitchen_city,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    status: row.status,
    paymentMethod: row.payment_method,
    packingType: row.packing_type,
    deliveryMethod: row.delivery_method,
    itemTotal: Number(row.item_total),
    packingFee: Number(row.packing_fee),
    deliveryFee: Number(row.delivery_fee),
    grandTotal: Number(row.grand_total),
    deliveryAddress: row.delivery_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    review: row.review_id
      ? { id: row.review_id, rating: row.review_rating, review: row.review_text, createdAt: row.review_created_at }
      : null,
  }
}

async function fetchOrderItems(orderId) {
  const [items] = await pool.query(
    "SELECT id, menu_item_id, name, price, qty, image FROM order_items WHERE order_id = ?",
    [orderId]
  )
  return items.map((item) => ({
    id: item.id,
    menuItemId: item.menu_item_id,
    name: item.name,
    price: Number(item.price),
    qty: item.qty,
    image: item.image,
  }))
}

router.get("/orders", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*,
              k.name AS kitchen_name, k.city AS kitchen_city,
              u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              r.id AS review_id, r.rating AS review_rating, r.review AS review_text, r.created_at AS review_created_at
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_reviews r ON r.order_id = o.id
       ORDER BY o.created_at DESC`
    )

    const orders = await Promise.all(
      rows.map(async (row) => ({
        ...mapAdminOrder(row),
        items: await fetchOrderItems(row.id),
      }))
    )

    const [kitchenRows] = await pool.query(
      `SELECT k.id, k.name, k.city, k.image,
              COUNT(o.id) AS total_orders,
              SUM(CASE WHEN o.status NOT IN ('delivered', 'cancelled') THEN 1 ELSE 0 END) AS active_orders,
              SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
              COALESCE(SUM(
                CASE WHEN o.status = 'delivered'
                  AND YEAR(o.created_at) = YEAR(CURDATE())
                  AND MONTH(o.created_at) = MONTH(CURDATE())
                THEN o.grand_total ELSE 0 END
              ), 0) AS monthly_revenue,
              SUM(
                CASE WHEN o.status = 'delivered'
                  AND YEAR(o.created_at) = YEAR(CURDATE())
                  AND MONTH(o.created_at) = MONTH(CURDATE())
                THEN 1 ELSE 0 END
              ) AS monthly_delivered
       FROM kitchens k
       LEFT JOIN orders o ON o.kitchen_id = k.id
       WHERE k.status = 'approved'
       GROUP BY k.id, k.name, k.city, k.image
       ORDER BY pending_orders DESC, active_orders DESC, total_orders DESC, k.name ASC`
    )

    const kitchens = kitchenRows.map((k) => ({
      id: k.id,
      name: k.name,
      city: k.city,
      image: normalizePublicUrl(k.image),
      totalOrders: Number(k.total_orders),
      activeOrders: Number(k.active_orders),
      pendingOrders: Number(k.pending_orders),
      monthlyRevenue: Number(k.monthly_revenue),
      monthlyDelivered: Number(k.monthly_delivered),
    }))

    const monthlyRevenueTotal = kitchens.reduce((sum, k) => sum + k.monthlyRevenue, 0)
    const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })

    const summary = {
      total: orders.length,
      active: orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
      pending: orders.filter((o) => o.status === "pending").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      kitchens: kitchens.length,
      kitchensWithOrders: kitchens.filter((k) => k.totalOrders > 0).length,
      monthlyRevenue: monthlyRevenueTotal,
      monthLabel,
    }

    res.json({ orders, kitchens, summary })
  } catch (error) {
    console.error("Admin list orders error:", error)
    res.status(500).json({ message: "Failed to fetch orders" })
  }
})

router.get("/orders/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*,
              k.name AS kitchen_name, k.city AS kitchen_city,
              u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              r.id AS review_id, r.rating AS review_rating, r.review AS review_text, r.created_at AS review_created_at
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_reviews r ON r.order_id = o.id
       WHERE o.id = ?`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = {
      ...mapAdminOrder(rows[0]),
      items: await fetchOrderItems(rows[0].id),
    }

    res.json({ order })
  } catch (error) {
    console.error("Admin get order error:", error)
    res.status(500).json({ message: "Failed to fetch order" })
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

router.get("/kitchens/hygiene-status", async (req, res) => {
  const filter = req.query.filter || "all"

  try {
    const [rows] = await pool.query(
      `SELECT k.id, k.name, k.owner_name, k.city, k.status, k.reviewed_at, k.visibility_status,
              k.image, k.hygiene_score, u.email AS user_email, u.phone AS user_phone
       FROM kitchens k
       JOIN users u ON u.id = k.user_id
       WHERE k.status = 'approved'
       ORDER BY k.name ASC`
    )

    const kitchens = []
    for (const row of rows) {
      const info = await getKitchenVisibilityInfo(pool, row)
      const item = {
        id: row.id,
        name: row.name,
        ownerName: row.owner_name,
        city: row.city,
        email: row.user_email,
        phone: row.user_phone,
        image: normalizePublicUrl(row.image),
        hygieneScore: row.hygiene_score,
        reviewedAt: row.reviewed_at,
        ...info,
      }

      if (filter === "missing" && info.hygieneCompliant) continue
      if (filter === "hidden" && info.publiclyVisible) continue
      kitchens.push(item)
    }

    const summary = {
      total: rows.length,
      missingHygiene: 0,
      hiddenFromCustomers: 0,
    }
    for (const row of rows) {
      const info = await getKitchenVisibilityInfo(pool, row)
      if (!info.hygieneCompliant) summary.missingHygiene++
      if (!info.publiclyVisible) summary.hiddenFromCustomers++
    }

    res.json({ kitchens, summary })
  } catch (error) {
    console.error("Admin hygiene status error:", error)
    res.status(500).json({ message: "Failed to fetch hygiene status" })
  }
})

router.patch("/kitchens/:id/visibility", async (req, res) => {
  const { id } = req.params
  const { visibilityStatus } = req.body
  const allowed = ["auto", "visible", "hidden"]

  if (!allowed.includes(visibilityStatus)) {
    return res.status(400).json({ message: "visibilityStatus must be auto, visible, or hidden" })
  }

  try {
    const [existing] = await pool.query(
      "SELECT id, status FROM kitchens WHERE id = ?",
      [id]
    )
    if (existing.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }
    if (existing[0].status !== "approved") {
      return res.status(400).json({ message: "Only approved kitchens can have visibility changed" })
    }

    await pool.query("UPDATE kitchens SET visibility_status = ? WHERE id = ?", [visibilityStatus, id])

    const [updated] = await pool.query(
      `SELECT k.id, k.name, k.owner_name, k.city, k.status, k.reviewed_at, k.visibility_status,
              k.image, k.hygiene_score, u.email AS user_email, u.phone AS user_phone
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.id = ?`,
      [id]
    )

    const info = await getKitchenVisibilityInfo(pool, updated[0])

    res.json({
      message: "Visibility updated",
      kitchen: {
        id: updated[0].id,
        name: updated[0].name,
        ownerName: updated[0].owner_name,
        city: updated[0].city,
        email: updated[0].user_email,
        phone: updated[0].user_phone,
        image: normalizePublicUrl(updated[0].image),
        hygieneScore: updated[0].hygiene_score,
        reviewedAt: updated[0].reviewed_at,
        ...info,
      },
    })
  } catch (error) {
    console.error("Admin visibility update error:", error)
    res.status(500).json({ message: "Failed to update visibility" })
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

    try {
      await pool.query(
        `UPDATE kitchens
         SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?,
             rating = 0, rating_count = 0
         WHERE id = ?`,
        [req.user.id, id]
      )
    } catch (error) {
      if (error.code === "ER_BAD_FIELD_ERROR") {
        await pool.query(
          `UPDATE kitchens
           SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?,
               rating = 0
           WHERE id = ?`,
          [req.user.id, id]
        )
      } else {
        throw error
      }
    }

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
