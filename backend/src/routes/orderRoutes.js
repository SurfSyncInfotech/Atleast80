import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { requireApprovedKitchen } from "../middleware/kitchen.js"
import { MIN_RATINGS_TO_SHOW } from "../utils/kitchenRating.js"
import { sendPushToUser, broadcastNewOrderToRiders } from "../utils/pushNotifications.js"

const router = Router()

const KITCHEN_ORDER_FIELDS = `
  k.name AS kitchen_name,
  k.image AS kitchen_image,
  k.address AS kitchen_address,
  k.city AS kitchen_city,
  k.state AS kitchen_state,
  k.pincode AS kitchen_pincode
`

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"]

const STATUS_FLOW = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
}

function generateOrderNumber() {
  const suffix = Date.now().toString().slice(-6)
  const rand = Math.floor(Math.random() * 90 + 10)
  return `AT80-${suffix}${rand}`
}

function formatKitchenAddress(row) {
  const cityState = [row.kitchen_city, row.kitchen_state].filter(Boolean).join(", ")
  const parts = [row.kitchen_address, cityState, row.kitchen_pincode].filter((p) => p && String(p).trim())
  return parts.length ? parts.join(" · ") : null
}

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    kitchenId: row.kitchen_id,
    kitchenName: row.kitchen_name,
    kitchenImage: row.kitchen_image,
    kitchenAddress: formatKitchenAddress(row),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
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
    pickupCode: row.pickup_code || null,
    deliveryOtp: row.delivery_otp || null,
    deliveryStatus: row.delivery_status || null,
    riderId: row.rider_id || null,
  }
}

function mapReview(row) {
  if (!row) return null
  return {
    id: row.id,
    rating: row.rating,
    review: row.review,
    createdAt: row.created_at,
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

async function fetchOrderReview(orderId) {
  const [rows] = await pool.query(
    "SELECT id, rating, review, created_at FROM order_reviews WHERE order_id = ?",
    [orderId]
  )
  return mapReview(rows[0])
}

async function updateKitchenRating(kitchenId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS avg_rating
     FROM order_reviews WHERE kitchen_id = ?`,
    [kitchenId]
  )
  const count = Number(rows[0].count)
  const avg = rows[0].avg_rating
  const rating = count >= MIN_RATINGS_TO_SHOW ? Number(avg) || 0 : 0

  try {
    await pool.query(
      `UPDATE kitchens SET rating_count = ?, rating = ? WHERE id = ?`,
      [count, rating, kitchenId]
    )
  } catch (error) {
    if (error.code === "ER_BAD_FIELD_ERROR") {
      await pool.query(`UPDATE kitchens SET rating = ? WHERE id = ?`, [rating, kitchenId])
    } else {
      throw error
    }
  }
}

async function attachReview(order) {
  const review = await fetchOrderReview(order.id)
  return { ...order, review }
}

// ─── Kitchen routes (must be before /:id) ───────────────────────────────────

router.get("/kitchen", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.kitchen_id = ?
    `
    const params = [req.kitchenId]

    if (status && status !== "all") {
      sql += " AND o.status = ?"
      params.push(status)
    }

    sql += " ORDER BY o.created_at DESC"

    const [rows] = await pool.query(sql, params)

    const orders = await Promise.all(
      rows.map(async (row) => ({
        ...mapOrder(row),
        items: await fetchOrderItems(row.id),
        review: await fetchOrderReview(row.id),
      }))
    )

    res.json({ orders })
  } catch (error) {
    console.error("Kitchen list orders error:", error)
    res.status(500).json({ message: "Failed to load orders" })
  }
})

router.get("/kitchen/stats", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const [todayRows] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS revenue
       FROM orders
       WHERE kitchen_id = ? AND DATE(created_at) = CURDATE() AND status != 'cancelled'`,
      [req.kitchenId]
    )
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS revenue
       FROM orders
       WHERE kitchen_id = ? AND status != 'cancelled'`,
      [req.kitchenId]
    )
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders
       WHERE kitchen_id = ? AND (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery') OR (status = 'delivered' AND delivery_status = 'handover_pending'))`,
      [req.kitchenId]
    )

    res.json({
      todayOrders: Number(todayRows[0].count),
      todayRevenue: Number(todayRows[0].revenue),
      totalRevenue: Number(totalRows[0].revenue),
      totalOrders: Number(totalRows[0].count),
      activeOrders: Number(pendingRows[0].count),
    })
  } catch (error) {
    console.error("Kitchen order stats error:", error)
    res.status(500).json({ message: "Failed to load stats" })
  }
})

router.get("/kitchen/:id", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.kitchen_id = ?`,
      [req.params.id, req.kitchenId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = {
      ...mapOrder(rows[0]),
      items: await fetchOrderItems(rows[0].id),
      review: await fetchOrderReview(rows[0].id),
    }

    res.json({ order })
  } catch (error) {
    console.error("Kitchen get order error:", error)
    res.status(500).json({ message: "Failed to load order" })
  }
})

router.patch("/kitchen/:id/status", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  const { status: newStatus } = req.body
  if (!newStatus) {
    return res.status(400).json({ message: "Status is required" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, status, kitchen_id FROM orders WHERE id = ? AND kitchen_id = ?",
      [req.params.id, req.kitchenId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const currentStatus = rows[0].status
    const allowed = STATUS_FLOW[currentStatus] || []

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        message: `Cannot change status from "${currentStatus}" to "${newStatus}"`,
      })
    }

    if (newStatus === "out_for_delivery") {
      const pickupCode = String(Math.floor(1000 + Math.random() * 9000))
      const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000))
      await pool.query(
        `UPDATE orders 
         SET status = 'out_for_delivery',
             delivery_status = 'pending_assignment', 
             pickup_code = ?, 
             delivery_otp = ?, 
             delivery_fee = 30.00 
         WHERE id = ?`,
        [pickupCode, deliveryOtp, req.params.id]
      )
    } else {
      await pool.query("UPDATE orders SET status = ? WHERE id = ?", [newStatus, req.params.id])
    }

    const [updated] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
      [req.params.id]
    )

    const order = {
      ...mapOrder(updated[0]),
      items: await fetchOrderItems(updated[0].id),
      review: await fetchOrderReview(updated[0].id),
    }

    // Trigger push notifications on kitchen status change
    try {
      if (newStatus === "confirmed") {
        sendPushToUser(updated[0].user_id, "Order Confirmed! 👨‍🍳", `Your order #${order.orderNumber} has been confirmed by the kitchen and is being prepared.`)
      } else if (newStatus === "preparing") {
        sendPushToUser(updated[0].user_id, "Food is Preparing! 🍲", `The kitchen has started preparing your fresh food for order #${order.orderNumber}.`)
      } else if (newStatus === "out_for_delivery") {
        sendPushToUser(updated[0].user_id, "Out for Delivery! 🛵", `Your order #${order.orderNumber} is ready! A rider is being assigned to deliver it to you.`)
        try {
          const [kitchens] = await pool.query("SELECT name, city FROM kitchens WHERE id = ?", [updated[0].kitchen_id])
          if (kitchens.length > 0 && kitchens[0].city) {
            broadcastNewOrderToRiders(kitchens[0].city, order.orderNumber, order.id)
          }
        } catch (riderPushErr) {
          console.error("Failed to broadcast new delivery alert to riders:", riderPushErr.message)
        }
      } else if (newStatus === "cancelled") {
        sendPushToUser(updated[0].user_id, "Order Cancelled 🛑", `Your order #${order.orderNumber} has been cancelled by the kitchen.`)
      }
    } catch (pushErr) {
      console.error("Non-blocking error triggering kitchen order push notification:", pushErr.message)
    }

    res.json({ message: "Order status updated", order })
  } catch (error) {
    console.error("Kitchen update status error:", error)
    res.status(500).json({ message: "Failed to update order status" })
  }
})

router.patch("/kitchen/:id/confirm-handover", authRequired, requireRole("kitchen"), requireApprovedKitchen, async (req, res) => {
  const orderId = req.params.id

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // 1. Fetch order and make sure it belongs to this kitchen
    const [orders] = await connection.query(
      "SELECT * FROM orders WHERE id = ? AND kitchen_id = ?",
      [orderId, req.kitchenId]
    )

    if (orders.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: "Order not found" })
    }

    const order = orders[0]

    // 2. Verify order is in valid state for handover/return confirmation
    const isValidDelivered = order.status === "delivered" && order.delivery_status === "handover_pending"
    const isValidReturned = order.status === "cancelled" && order.delivery_status === "rescue_timeout"
    if (!isValidDelivered && !isValidReturned) {
      await connection.rollback()
      return res.status(400).json({ message: "Order status is not valid for cash handover or food return confirmation" })
    }

    // 3. Update order delivery status
    const targetDeliveryStatus = isValidReturned ? "returned" : "delivered"
    await connection.query(
      "UPDATE orders SET delivery_status = ? WHERE id = ?",
      [targetDeliveryStatus, orderId]
    )

    // 4. If there's a rider assigned and it was a delivery, deduct the grand_total from their cash_collected balance
    if (order.rider_id && isValidDelivered) {
      await connection.query(
        "UPDATE riders SET cash_collected = GREATEST(0.00, cash_collected - ?) WHERE id = ?",
        [order.grand_total, order.rider_id]
      )
    }

    await connection.commit()

    // Fetch the updated order object to return
    const [updated] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
      [orderId]
    )

    const mappedOrder = {
      ...mapOrder(updated[0]),
      items: await fetchOrderItems(updated[0].id),
      review: await fetchOrderReview(updated[0].id),
    }

    res.json({ message: "Cash handover confirmed successfully. Order delivery complete.", order: mappedOrder })
  } catch (error) {
    await connection.rollback()
    console.error("Kitchen confirm handover error:", error)
    res.status(500).json({ message: "Failed to confirm cash handover" })
  } finally {
    connection.release()
  }
})


// ─── Customer routes ────────────────────────────────────────────────────────

router.post("/", authRequired, requireRole("customer"), async (req, res) => {
  const {
    kitchenId,
    items,
    paymentMethod = "cod",
    packingType = "standard",
    deliveryMethod = "free",
    packingFee = 0,
    deliveryFee = 0,
    deliveryAddress,
  } = req.body

  if (!kitchenId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Kitchen and items are required" })
  }

  try {
    const [kitchens] = await pool.query(
      "SELECT id, name, status, user_id FROM kitchens WHERE id = ?",
      [kitchenId]
    )
    if (kitchens.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }
    if (kitchens[0].status !== "approved") {
      return res.status(400).json({ message: "This kitchen is not accepting orders right now" })
    }

    const itemTotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)
    const grandTotal = itemTotal + Number(packingFee) + Number(deliveryFee)

    const [users] = await pool.query(
      "SELECT address, city, pincode FROM users WHERE id = ?",
      [req.user.id]
    )
    const user = users[0] || {}
    const address =
      deliveryAddress ||
      [user.address, user.city, user.pincode].filter(Boolean).join(", ") ||
      "Address not set"

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const orderNumber = generateOrderNumber()
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_number, user_id, kitchen_id, status, payment_method,
          packing_type, delivery_method, item_total, packing_fee, delivery_fee,
          grand_total, delivery_address
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          req.user.id,
          kitchenId,
          paymentMethod,
          packingType,
          deliveryMethod,
          itemTotal,
          packingFee,
          deliveryFee,
          grandTotal,
          address,
        ]
      )

      const orderId = orderResult.insertId

      for (const item of items) {
        const menuItemId = (item.menuItemId || item.id)
        const safeMenuItemId = (menuItemId && !isNaN(menuItemId) && Number.isInteger(Number(menuItemId))) ? Number(menuItemId) : null

        await connection.query(
          `INSERT INTO order_items (order_id, menu_item_id, name, price, qty, image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            safeMenuItemId,
            item.name,
            item.price,
            item.qty,
            item.image || null,
          ]
        )

        // If this order item is from a bulk order quotation checkout, auto-complete the enquiry status
        if (item.id && typeof item.id === "string" && item.id.startsWith("bulk_")) {
          const bulkEnquiryId = Number(item.id.replace("bulk_", ""))
          if (bulkEnquiryId && !isNaN(bulkEnquiryId)) {
            await connection.query(
              "UPDATE bulk_order_enquiries SET status = 'completed' WHERE id = ?",
              [bulkEnquiryId]
            )
          }
        }
      }

      await connection.commit()

      // Send push notification to the kitchen owner about the new order
      try {
        sendPushToUser(
          kitchens[0].user_id,
          "New Order Received! 🔔",
          `You have received a new order #${orderNumber} for ₹${grandTotal.toFixed(2)}. Tap to view details and confirm.`
        )
      } catch (pushErr) {
        console.error("Non-blocking error triggering kitchen new order push:", pushErr.message)
      }

      const order = mapOrder({
        id: orderId,
        order_number: orderNumber,
        kitchen_id: kitchenId,
        kitchen_name: kitchens[0].name,
        kitchen_image: null,
        status: "pending",
        payment_method: paymentMethod,
        packing_type: packingType,
        delivery_method: deliveryMethod,
        item_total: itemTotal,
        packing_fee: packingFee,
        delivery_fee: deliveryFee,
        grand_total: grandTotal,
        delivery_address: address,
        created_at: new Date(),
        updated_at: new Date(),
      })

      const orderItems = await fetchOrderItems(orderId)

      res.status(201).json({
        message: "Order placed successfully",
        order: { ...order, items: orderItems, review: null },
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({ message: "Failed to place order" })
  }
})

router.get("/", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )

    const orders = await Promise.all(
      rows.map(async (row) => attachReview({
        ...mapOrder(row),
        items: await fetchOrderItems(row.id),
      }))
    )

    res.json({ orders })
  } catch (error) {
    console.error("List orders error:", error)
    res.status(500).json({ message: "Failed to load orders" })
  }
})

router.get("/current", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(", ")
    const [rows] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.user_id = ? AND o.status IN (${placeholders})
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [req.user.id, ...ACTIVE_STATUSES]
    )

    if (rows.length === 0) {
      return res.json({ order: null })
    }

    const order = await attachReview({
      ...mapOrder(rows[0]),
      items: await fetchOrderItems(rows[0].id),
    })

    res.json({ order })
  } catch (error) {
    console.error("Current order error:", error)
    res.status(500).json({ message: "Failed to load current order" })
  }
})

router.post("/:id/review", authRequired, requireRole("customer"), async (req, res) => {
  const { rating, review } = req.body
  const orderId = req.params.id

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" })
  }

  try {
    const [orders] = await pool.query(
      "SELECT id, user_id, kitchen_id, status FROM orders WHERE id = ? AND user_id = ?",
      [orderId, req.user.id]
    )

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (orders[0].status !== "delivered") {
      return res.status(400).json({ message: "You can only review delivered orders" })
    }

    const [existing] = await pool.query(
      "SELECT id FROM order_reviews WHERE order_id = ?",
      [orderId]
    )
    if (existing.length > 0) {
      return res.status(400).json({ message: "You have already reviewed this order" })
    }

    await pool.query(
      "INSERT INTO order_reviews (order_id, user_id, kitchen_id, rating, review) VALUES (?, ?, ?, ?, ?)",
      [orderId, req.user.id, orders[0].kitchen_id, rating, review?.trim() || null]
    )

    await updateKitchenRating(orders[0].kitchen_id)

    const savedReview = await fetchOrderReview(orderId)

    res.status(201).json({ message: "Review submitted", review: savedReview })
  } catch (error) {
    console.error("Submit review error:", error)
    res.status(500).json({ message: "Failed to submit review" })
  }
})

function startRescueTimeout(orderId) {
  setTimeout(async () => {
    try {
      const [rows] = await pool.query(
        "SELECT id, status, delivery_status FROM orders WHERE id = ?",
        [orderId]
      )
      if (rows.length > 0 && rows[0].status === "cancelled" && rows[0].delivery_status === "rescue_active") {
        await pool.query(
          "UPDATE orders SET delivery_status = 'rescue_timeout' WHERE id = ?",
          [orderId]
        )
        console.log(`⏰ Food rescue timeout reached for order #${orderId}. Rider instructed to return to kitchen.`)
      }
    } catch (err) {
      console.error("Error in rescue timeout handler:", err)
    }
  }, 3 * 60 * 1000) // 3 minutes
}

router.patch("/:id/cancel", authRequired, requireRole("customer"), async (req, res) => {
  const orderId = req.params.id
  const { payOnline } = req.body || {}

  try {
    const [rows] = await pool.query(
      "SELECT id, status, user_id, delivery_fee FROM orders WHERE id = ? AND user_id = ?",
      [orderId, req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const currentStatus = rows[0].status
    const deliveryFee = Number(rows[0].delivery_fee)

    if (currentStatus === "out_for_delivery") {
      // Doorstep / Post-dispatch cancellation requires paying the delivery charge
      if (payOnline === true) {
        await pool.query(
          `UPDATE orders 
           SET status = 'cancelled', 
               delivery_status = 'rescue_active', 
               cancel_fee_paid = 1 
           WHERE id = ?`,
          [orderId]
        )
        startRescueTimeout(orderId)
      } else {
        return res.status(402).json({
          requirePayment: true,
          deliveryFee,
          message: `To cancel after dispatch, you must pay the delivery fee of ₹${deliveryFee}.`,
        })
      }
    } else {
      const allowedToCancel = ["pending", "confirmed", "preparing"]
      if (!allowedToCancel.includes(currentStatus)) {
        return res.status(400).json({
          message: `Cannot cancel order at "${currentStatus}" stage.`,
        })
      }
      await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId])
    }

    const [updated] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}, k.phone AS kitchen_phone
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.id = ?`,
      [orderId]
    )

    const order = await attachReview({
      ...mapOrder(updated[0]),
      kitchenPhone: updated[0].kitchen_phone,
      items: await fetchOrderItems(orderId),
    })

    res.json({ message: "Order cancelled successfully", order })
  } catch (error) {
    console.error("Customer cancel order error:", error)
    res.status(500).json({ message: "Failed to cancel order" })
  }
})

router.get("/:id", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}, k.phone AS kitchen_phone
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.id = ? AND o.user_id = ?`,
      [req.params.id, req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = await attachReview({
      ...mapOrder(rows[0]),
      kitchenPhone: rows[0].kitchen_phone,
      items: await fetchOrderItems(rows[0].id),
    })

    res.json({ order })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({ message: "Failed to load order" })
  }
})

// ─── Rescue food routes ──────────────────────────────────────────────────────

router.get("/rescue/available", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.status = 'cancelled' AND o.delivery_status = 'rescue_active'
       ORDER BY o.updated_at DESC`
    )

    const orders = await Promise.all(
      rows.map(async (row) => ({
        ...mapOrder(row),
        items: await fetchOrderItems(row.id),
      }))
    )

    res.json({ orders })
  } catch (error) {
    console.error("Fetch available rescue orders error:", error)
    res.status(500).json({ message: "Failed to load rescue orders" })
  }
})

router.get("/rescue/:id", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.id = ? AND o.status = 'cancelled' AND o.delivery_status = 'rescue_active'`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Rescue order is no longer available or has already been claimed" })
    }

    const order = {
      ...mapOrder(rows[0]),
      items: await fetchOrderItems(rows[0].id),
    }

    res.json({ order })
  } catch (error) {
    console.error("Get rescue order error:", error)
    res.status(500).json({ message: "Failed to load rescue order" })
  }
})

router.post("/rescue/:id/claim", authRequired, requireRole("customer"), async (req, res) => {
  const originalOrderId = req.params.id

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // 1. Fetch the original cancelled order
    const [orders] = await connection.query(
      "SELECT * FROM orders WHERE id = ? AND status = 'cancelled' AND delivery_status = 'rescue_active'",
      [originalOrderId]
    )

    if (orders.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: "Rescue order not found or already claimed" })
    }

    const originalOrder = orders[0]

    // 2. Fetch claiming user's address details
    const [users] = await connection.query(
      "SELECT name, address, city, pincode FROM users WHERE id = ?",
      [req.user.id]
    )
    const user = users[0] || {}
    const newAddress = [user.address, user.city, user.pincode].filter(Boolean).join(", ") || "Address not set"

    // 3. Create a cloned order for the new user (free delivery!)
    const orderNumber = generateOrderNumber()
    const itemTotal = Number(originalOrder.item_total)
    const packingFee = Number(originalOrder.packing_fee)
    const grandTotal = itemTotal + packingFee // Delivery fee is 0.00

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        order_number, user_id, kitchen_id, status, payment_method,
        packing_type, delivery_method, item_total, packing_fee, delivery_fee,
        grand_total, delivery_address, rider_id, delivery_status, pickup_code, delivery_otp
      ) VALUES (?, ?, ?, 'out_for_delivery', 'cod', ?, ?, ?, ?, 0.00, ?, ?, ?, 'picked_up', ?, ?)`,
      [
        orderNumber,
        req.user.id,
        originalOrder.kitchen_id,
        originalOrder.packing_type,
        originalOrder.delivery_method,
        itemTotal,
        packingFee,
        grandTotal,
        newAddress,
        originalOrder.rider_id,
        originalOrder.pickup_code,
        originalOrder.delivery_otp,
      ]
    )

    const newOrderId = orderResult.insertId

    // 4. Fetch and copy order items
    const originalItems = await fetchOrderItems(originalOrderId)
    for (const item of originalItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, price, qty, image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newOrderId,
          item.menuItemId,
          item.name,
          item.price,
          item.qty,
          item.image || null,
        ]
      )
    }

    // 5. Update original order's delivery_status to 'rescued'
    await connection.query(
      "UPDATE orders SET delivery_status = 'rescued' WHERE id = ?",
      [originalOrderId]
    )

    await connection.commit()

    // Fetch and return the new claimed order object
    const [newOrderRow] = await pool.query(
      `SELECT o.*, ${KITCHEN_ORDER_FIELDS}
       FROM orders o JOIN kitchens k ON k.id = o.kitchen_id WHERE o.id = ?`,
      [newOrderId]
    )

    const claimedOrder = {
      ...mapOrder(newOrderRow[0]),
      items: await fetchOrderItems(newOrderId),
      review: null,
    }

    res.status(201).json({
      message: "Rescue order claimed successfully with Free Delivery!",
      order: claimedOrder,
    })
  } catch (error) {
    await connection.rollback()
    console.error("Claim rescue order error:", error)
    res.status(500).json({ message: "Failed to claim rescue order" })
  } finally {
    connection.release()
  }
})

export default router

