import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"

const router = Router()

// Helper: check if rider status is active
async function requireActiveRider(req, res, next) {
  try {
    const [riders] = await pool.query(
      "SELECT status FROM riders WHERE id = ?",
      [req.user.riderId]
    )
    if (riders.length === 0 || riders[0].status !== "active") {
      return res.status(403).json({ message: "Your rider account is not active or approved yet" })
    }
    next()
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
}

// 1. Toggle Online/Offline State
router.put("/status", authRequired, requireRole("rider"), async (req, res) => {
  const { isOnline } = req.body

  if (isOnline === undefined) {
    return res.status(400).json({ message: "isOnline field is required" })
  }

  try {
    const onlineVal = isOnline ? 1 : 0
    await pool.query(
      "UPDATE riders SET is_online = ? WHERE id = ?",
      [onlineVal, req.user.riderId]
    )

    res.json({ message: `Duty status updated to ${isOnline ? "Online" : "Offline"}`, isOnline })
  } catch (error) {
    console.error("Rider update status error:", error)
    res.status(500).json({ message: "Failed to update status" })
  }
})

// 2. Update Location Coordinates
router.put("/location", authRequired, requireRole("rider"), async (req, res) => {
  const { latitude, longitude } = req.body

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: "Latitude and longitude are required" })
  }

  try {
    await pool.query(
      "UPDATE riders SET latitude = ?, longitude = ? WHERE id = ?",
      [latitude, longitude, req.user.riderId]
    )

    // If rider is currently delivering an active order, update rider location in orders table too
    await pool.query(
      `UPDATE orders SET rider_latitude = ?, rider_longitude = ?
       WHERE rider_id = ? AND status = 'out_for_delivery'`,
      [latitude, longitude, req.user.riderId]
    )

    res.json({ message: "Location updated successfully" })
  } catch (error) {
    console.error("Rider update location error:", error)
    res.status(500).json({ message: "Failed to update location" })
  }
})

// 3. Get Earning Metrics & Wallet Balance
router.get("/dashboard", authRequired, requireRole("rider"), async (req, res) => {
  try {
    // Fetch rider profile
    const [riders] = await pool.query(
      "SELECT is_online, cash_collected, status FROM riders WHERE id = ?",
      [req.user.riderId]
    )

    if (riders.length === 0) {
      return res.status(404).json({ message: "Rider not found" })
    }

    const rider = riders[0]

    const fs = await import("fs")
    const path = await import("path")
    fs.appendFileSync(
      path.join(process.cwd(), "rider_debug.log"),
      `[DASHBOARD] Fetching dashboard for rider ID: ${req.user.riderId}. Status in DB: ${rider.status}\n`
    )

    // Calculate total earnings from completed deliveries
    const [earningRows] = await pool.query(
      `SELECT COALESCE(SUM(delivery_fee), 0) AS total_earnings, COUNT(id) AS total_deliveries
       FROM orders WHERE rider_id = ? AND status = 'delivered'`,
      [req.user.riderId]
    )
    const stats = earningRows[0]

    // Fetch active order if any
    const [activeOrders] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone,
              u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       JOIN users u ON o.user_id = u.id
       WHERE o.rider_id = ? AND (o.status IN ('preparing', 'out_for_delivery') OR (o.status = 'delivered' AND o.delivery_status = 'handover_pending'))`,
      [req.user.riderId]
    )

    res.json({
      status: rider.status,
      isOnline: Boolean(rider.is_online),
      cashCollected: Number(rider.cash_collected),
      totalEarnings: Number(stats.total_earnings),
      totalDeliveries: Number(stats.total_deliveries),
      activeOrder: activeOrders[0] || null,
    })
  } catch (error) {
    console.error("Rider dashboard error:", error)
    res.status(500).json({ message: "Failed to load dashboard metrics" })
  }
})

// 4. Get Available Delivery Broadcasts in Rider's City
router.get("/deliveries/available", authRequired, requireRole("rider"), requireActiveRider, async (req, res) => {
  try {
    // Get rider's city
    const [riders] = await pool.query(
      `SELECT r.is_online, k.city
       FROM riders r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN kitchens k ON k.user_id = u.id -- fallback or match city
       WHERE r.id = ?`,
      [req.user.riderId]
    )

    const rider = riders[0]
    if (!rider || !rider.is_online) {
      return res.json({ deliveries: [] })
    }

    // Fetch orders ready for pickup in the same city (or generally pending assignment)
    const [orders] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone,
              u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       JOIN users u ON o.user_id = u.id
       WHERE o.delivery_status = 'pending_assignment' AND o.rider_id IS NULL
       ORDER BY o.created_at DESC`
    )

    res.json({ deliveries: orders })
  } catch (error) {
    console.error("Rider fetch available deliveries error:", error)
    res.status(500).json({ message: "Failed to fetch available deliveries" })
  }
})

// 5. Perform Action on Delivery Order (Accept, Arrive at Kitchen, Pick Up, Arrive at Customer, Deliver)
router.post("/deliveries/:orderId/action", authRequired, requireRole("rider"), requireActiveRider, async (req, res) => {
  const { action, pickupCode, deliveryOtp } = req.body
  const orderId = req.params.orderId

  if (!action) {
    return res.status(400).json({ message: "Action is required" })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    )

    if (orders.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: "Order not found" })
    }

    const order = orders[0]

    if (action === "accept") {
      if (order.rider_id !== null || order.delivery_status !== "pending_assignment") {
        await connection.rollback()
        return res.status(400).json({ message: "This order has already been assigned to another rider" })
      }

      // Generate verification codes if not already set
      const pickupCodeVal = order.pickup_code || Math.floor(1000 + Math.random() * 9000).toString()
      const deliveryOtpVal = order.delivery_otp || Math.floor(1000 + Math.random() * 9000).toString()
      const deliveryFeeVal = order.delivery_fee > 0 ? order.delivery_fee : 30.00 // Flat 30 Rs delivery fee to rider

      await connection.query(
        `UPDATE orders
         SET rider_id = ?, delivery_status = 'accepted', pickup_code = ?, delivery_otp = ?, delivery_fee = ?
         WHERE id = ?`,
        [req.user.riderId, pickupCodeVal, deliveryOtpVal, deliveryFeeVal, orderId]
      )
    }

    else if (action === "arrive_kitchen") {
      if (order.rider_id !== req.user.riderId || order.delivery_status !== "accepted") {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid order status for this action" })
      }

      await connection.query(
        "UPDATE orders SET delivery_status = 'arrived_kitchen' WHERE id = ?",
        [orderId]
      )
    }

    else if (action === "pickup") {
      if (order.rider_id !== req.user.riderId || order.delivery_status !== "arrived_kitchen") {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid order status for this action" })
      }

      if (!pickupCode || pickupCode.trim() !== order.pickup_code) {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid Kitchen Pick Up Code" })
      }

      // Transition order status to out_for_delivery
      await connection.query(
        "UPDATE orders SET status = 'out_for_delivery', delivery_status = 'picked_up' WHERE id = ?",
        [orderId]
      )
    }

    else if (action === "arrive_customer") {
      if (order.rider_id !== req.user.riderId || order.delivery_status !== "picked_up") {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid order status for this action" })
      }

      await connection.query(
        "UPDATE orders SET delivery_status = 'arrived_customer' WHERE id = ?",
        [orderId]
      )
    }

    else if (action === "deliver") {
      if (order.rider_id !== req.user.riderId || !["picked_up", "arrived_customer"].includes(order.delivery_status)) {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid order status for this action" })
      }

      if (!deliveryOtp || deliveryOtp.trim() !== order.delivery_otp) {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid Customer Delivery OTP" })
      }

      if (order.payment_method === "cod") {
        // For COD: food is delivered to customer but cash is pending handover to kitchen
        await connection.query(
          "UPDATE orders SET status = 'delivered', delivery_status = 'handover_pending' WHERE id = ?",
          [orderId]
        )
        // Add to rider's cash collected balance
        await connection.query(
          "UPDATE riders SET cash_collected = cash_collected + ? WHERE id = ?",
          [order.grand_total, req.user.riderId]
        )
      } else {
        // For Prepaid: immediately mark complete
        await connection.query(
          "UPDATE orders SET status = 'delivered', delivery_status = 'delivered' WHERE id = ?",
          [orderId]
        )
      }
    }

    await connection.commit()

    const [updatedOrder] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone,
              u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    )

    res.json({ message: `Order action "${action}" completed`, order: updatedOrder[0] })
  } catch (error) {
    await connection.rollback()
    console.error("Rider delivery action error:", error)
    res.status(500).json({ message: "Failed to perform action" })
  } finally {
    connection.release()
  }
})

export default router
