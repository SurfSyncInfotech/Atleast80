import pool from "../config/db.js"

export async function requireKitchen(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, status FROM kitchens WHERE user_id = ?",
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    req.kitchenId = rows[0].id
    req.kitchenStatus = rows[0].status
    next()
  } catch (error) {
    console.error("Kitchen lookup error:", error)
    res.status(500).json({ message: "Failed to verify kitchen" })
  }
}

export async function requireApprovedKitchen(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, status FROM kitchens WHERE user_id = ?",
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    if (rows[0].status !== "approved") {
      return res.status(403).json({
        message: "Your kitchen must be approved by admin before managing menu",
      })
    }

    req.kitchenId = rows[0].id
    next()
  } catch (error) {
    console.error("Kitchen approval check error:", error)
    res.status(500).json({ message: "Failed to verify kitchen status" })
  }
}
