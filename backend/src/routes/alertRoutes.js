import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"

const router = Router()

router.use(authRequired)

async function resolveKitchenId(req) {
  if (req.user.kitchenId) return req.user.kitchenId
  if (req.user.role !== "kitchen") return null
  const [rows] = await pool.query("SELECT id FROM kitchens WHERE user_id = ?", [req.user.id])
  return rows[0]?.id || null
}

router.get("/", async (req, res) => {
  const role = req.user.role
  if (!["kitchen", "customer", "admin"].includes(role)) {
    return res.status(403).json({ message: "Access denied" })
  }

  try {
    const targetRole = role === "customer" ? "customer" : "kitchen"
    const kitchenId = targetRole === "kitchen" ? await resolveKitchenId(req) : null

    const params = [req.user.id, targetRole]
    let kitchenClause = "AND a.kitchen_id IS NULL"
    if (kitchenId) {
      kitchenClause = "AND (a.kitchen_id IS NULL OR a.kitchen_id = ?)"
      params.push(kitchenId)
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.body, a.is_system AS isSystem, a.created_at AS createdAt,
              a.kitchen_id AS kitchenId
       FROM alerts a
       LEFT JOIN alert_dismissals d ON d.alert_id = a.id AND d.user_id = ?
       WHERE d.id IS NULL
         AND a.target_role = ?
         ${kitchenClause}
       ORDER BY a.is_system DESC, a.created_at DESC`,
      params
    )

    res.json({ alerts: rows })
  } catch (error) {
    console.error("Alerts list error:", error)
    res.status(500).json({ message: "Failed to fetch alerts" })
  }
})

router.post("/:id/dismiss", async (req, res) => {
  try {
    await pool.query(
      "INSERT IGNORE INTO alert_dismissals (alert_id, user_id) VALUES (?, ?)",
      [req.params.id, req.user.id]
    )
    res.json({ message: "Alert dismissed" })
  } catch (error) {
    console.error("Dismiss alert error:", error)
    res.status(500).json({ message: "Failed to dismiss alert" })
  }
})

export default router
