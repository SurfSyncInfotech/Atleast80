import express from "express"
import Razorpay from "razorpay"
import crypto from "crypto"
import { authRequired } from "../middleware/auth.js"
import pool from "../config/db.js"
import { getActiveFestivalOffer } from "../utils/mediaUrl.js"

const router = express.Router()

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_TYikytpWqRGtGh"
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "FULmVqBI3Vb8umNybrhZd6kw"
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

// 1. Create Razorpay Order
router.post("/razorpay/create-order", authRequired, async (req, res) => {
  try {
    const { amount, receiptNotes, kitchenId, deliveryMethod, festivalDiscount, hasOffer } = req.body
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" })
    }

    // Validate active festival offer if discount was applied
    if (kitchenId && (Number(festivalDiscount || 0) > 0 || hasOffer)) {
      const [kRows] = await pool.query("SELECT * FROM kitchens WHERE id = ?", [kitchenId])
      const activeOffer = getActiveFestivalOffer(kRows[0])
      if (!activeOffer || activeOffer.discountPercent <= 0) {
        return res.status(400).json({
          error: "The festival offer from this kitchen is closed or expired. Please review your updated cart.",
          offerClosed: true,
        })
      }
    }

    // Validate delivery availability before taking payment
    if (kitchenId && deliveryMethod !== "self") {
      const [kitchens] = await pool.query("SELECT id, name, city FROM kitchens WHERE id = ?", [kitchenId])
      const [users] = await pool.query("SELECT city FROM users WHERE id = ?", [req.user.id])
      const kitchen = kitchens[0]
      const user = users[0]
      if (kitchen && user) {
        const custCity = (user.city || "").trim().toLowerCase()
        const kitCity = (kitchen.city || "").trim().toLowerCase()
        if (custCity && kitCity && custCity !== kitCity) {
          return res.status(400).json({
            error: `Delivery unavailable. ${kitchen.name} only delivers within ${kitchen.city}. Please select a kitchen near ${user.city || 'your city'}!`
          })
        }
      }
    }

    const instance = getRazorpayInstance()
    const amountInPaise = Math.round(Number(amount) * 100)

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 10000)}`.slice(0, 40),
      notes: typeof receiptNotes === "object" && receiptNotes !== null ? receiptNotes : {},
    }

    const rzpOrder = await instance.orders.create(options)

    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TYikytpWqRGtGh",
      rzpOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
    })
  } catch (err) {
    console.error("Razorpay create-order error:", err?.message || err)
    res.status(500).json({ error: err?.message || "Failed to create Razorpay order" })
  }
})

// 2. Verify Razorpay Payment Signature
router.post("/razorpay/verify", authRequired, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay payment parameters" })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "FULmVqBI3Vb8umNybrhZd6kw"
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature verification failed" })
    }

    // Update order in DB if orderId provided (do NOT overwrite COD orders)
    if (orderId) {
      const isNum = typeof orderId === "number" || (!isNaN(Number(orderId)) && !String(orderId).startsWith("AT80"))
      const sql = isNum
        ? "UPDATE orders SET payment_method = 'online', payment_ref = ? WHERE id = ? AND payment_method != 'cod'"
        : "UPDATE orders SET payment_method = 'online', payment_ref = ? WHERE order_number = ? AND payment_method != 'cod'"
      await pool.query(sql, [razorpay_payment_id, orderId]).catch((err) => console.warn("Failed to update order payment status:", err))
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    })
  } catch (err) {
    console.error("Razorpay verify error:", err?.message || err)
    res.status(500).json({ error: err?.message || "Failed to verify Razorpay payment" })
  }
})

// 3. Webhook for background payment notifications
router.post("/razorpay/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "FULmVqBI3Vb8umNybrhZd6kw"
    const signature = req.headers["x-razorpay-signature"]

    if (signature) {
      const shasum = crypto.createHmac("sha256", secret)
      shasum.update(JSON.stringify(req.body))
      const digest = shasum.digest("hex")

      if (digest !== signature) {
        return res.status(400).json({ error: "Invalid webhook signature" })
      }
    }

    const event = req.body.event
    const payload = req.body.payload

    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = payload?.payment?.entity
      if (paymentEntity) {
        const paymentId = paymentEntity.id
        const orderId = paymentEntity.order_id
        const notesOrderId = paymentEntity.notes?.order_id || paymentEntity.notes?.order_number
        console.log(`[Razorpay Webhook] Payment captured: ${paymentId} for RZP Order: ${orderId}`)
        if (notesOrderId) {
          const isNum = typeof notesOrderId === "number" || (!isNaN(Number(notesOrderId)) && !String(notesOrderId).startsWith("AT80"))
          const sql = isNum
            ? "UPDATE orders SET payment_ref = ? WHERE id = ?"
            : "UPDATE orders SET payment_ref = ? WHERE order_number = ?"
          await pool.query(sql, [paymentId, notesOrderId]).catch(() => {})
        }
      }
    }

    res.json({ status: "ok" })
  } catch (err) {
    console.error("Razorpay webhook error:", err)
    res.status(500).json({ error: "Webhook processing error" })
  }
})

export default router
