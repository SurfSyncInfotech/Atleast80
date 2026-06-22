import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"

const router = Router()

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"]

function generateOrderNumber() {
  const suffix = Date.now().toString().slice(-6)
  const rand = Math.floor(Math.random() * 90 + 10)
  return `AT80-${suffix}${rand}`
}

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    kitchenId: row.kitchen_id,
    kitchenName: row.kitchen_name,
    kitchenImage: row.kitchen_image,
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
      "SELECT id, name, status FROM kitchens WHERE id = ?",
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
        ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        await connection.query(
          `INSERT INTO order_items (order_id, menu_item_id, name, price, qty, image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.menuItemId || item.id || null,
            item.name,
            item.price,
            item.qty,
            item.image || null,
          ]
        )
      }

      await connection.commit()

      const order = mapOrder({
        ...orderResult,
        id: orderId,
        order_number: orderNumber,
        kitchen_id: kitchenId,
        kitchen_name: kitchens[0].name,
        kitchen_image: null,
        status: "confirmed",
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
        order: { ...order, items: orderItems },
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
      `SELECT o.*, k.name AS kitchen_name, k.image AS kitchen_image
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )

    const orders = await Promise.all(
      rows.map(async (row) => ({
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
      `SELECT o.*, k.name AS kitchen_name, k.image AS kitchen_image
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

    const order = {
      ...mapOrder(rows[0]),
      items: await fetchOrderItems(rows[0].id),
    }

    res.json({ order })
  } catch (error) {
    console.error("Current order error:", error)
    res.status(500).json({ message: "Failed to load current order" })
  }
})

router.get("/:id", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.image AS kitchen_image, k.phone AS kitchen_phone
       FROM orders o
       JOIN kitchens k ON k.id = o.kitchen_id
       WHERE o.id = ? AND o.user_id = ?`,
      [req.params.id, req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = {
      ...mapOrder(rows[0]),
      kitchenPhone: rows[0].kitchen_phone,
      items: await fetchOrderItems(rows[0].id),
    }

    res.json({ order })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({ message: "Failed to load order" })
  }
})

export default router
