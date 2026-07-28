import { initializeApp, cert } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "../config/db.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccountPath = path.join(__dirname, "../config/firebase-service-account.json")

let isFirebaseInitialized = false

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
    initializeApp({
      credential: cert(serviceAccount),
    })
    isFirebaseInitialized = true
    console.log("🔥 Firebase Admin SDK initialized successfully.")
  } else {
    console.warn("⚠️ Firebase service account file not found at:", serviceAccountPath)
    console.warn("⚠️ Push notifications will be simulated/logged but not sent via FCM.")
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error.message)
}

/**
 * Sends a push notification to a specific user by user ID.
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const [rows] = await pool.query(
      "SELECT fcm_token FROM users WHERE id = ?",
      [userId]
    )

    if (rows.length === 0 || !rows[0].fcm_token) {
      console.log(`[Push Notification (Skipped)] User #${userId} has no active FCM token.`)
      return false
    }

    const token = rows[0].fcm_token
    return await sendPushToToken(token, title, body, data)
  } catch (error) {
    console.error(`❌ Error sending push to user #${userId}:`, error.message)
    return false
  }
}

/**
 * Sends a push notification to a specific FCM registration token.
 */
export async function sendPushToToken(token, title, body, data = {}) {
  if (!isFirebaseInitialized) {
    console.log(`[Push Notification (Simulated)] Token: ${token} | Title: "${title}" | Body: "${body}"`)
    return true
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK", // for expo / react native compatibility
      },
      token,
    }

    const response = await getMessaging().send(message)
    console.log("✉️ Successfully sent push message:", response)
    return true
  } catch (error) {
    console.error("❌ FCM delivery failed:", error.message)
    return false
  }
}

/**
 * Broadcasts a rescue notification to all customers in the same city.
 */
export async function broadcastRescueNotification(kitchenId, orderNumber, grandTotal) {
  try {
    // 1. Get kitchen city
    const [kitchens] = await pool.query(
      "SELECT name, city FROM kitchens WHERE id = ?",
      [kitchenId]
    )
    if (kitchens.length === 0) return

    const kitchenName = kitchens[0].name
    const city = kitchens[0].city

    if (!city) {
      console.log(`[Push Broadcast (Skipped)] Kitchen #${kitchenId} has no city specified.`)
      return
    }

    // 2. Fetch all customers in that city with active FCM tokens
    const [customers] = await pool.query(
      "SELECT id, fcm_token FROM users WHERE role = 'customer' AND city = ? AND fcm_token IS NOT NULL",
      [city]
    )

    if (customers.length === 0) {
      console.log(`[Push Broadcast] No customers found in city "${city}" with FCM tokens.`)
      return
    }

    const tokens = customers.map(c => c.fcm_token)
    console.log(`[Push Broadcast] Found ${tokens.length} users in ${city} for food rescue broadcast.`)

    if (!isFirebaseInitialized) {
      console.log(`[Push Broadcast (Simulated)] City: ${city} | Title: "🍕 Food Rescue Alert!" | Body: "Rescue food available from ${kitchenName} with FREE Delivery!"`)
      return
    }

    const message = {
      notification: {
        title: "🍕 Food Rescue Alert!",
        body: `Fresh food available from ${kitchenName} near you with FREE Delivery! Claim now.`,
      },
      data: {
        type: "rescue",
        orderNumber: String(orderNumber),
      },
      tokens: tokens,
    }

    const response = await getMessaging().sendEachForMulticast(message)
    console.log(`✉️ Multicast push sent. Success: ${response.successCount}, Fail: ${response.failureCount}`)
  } catch (error) {
    console.error("❌ Error broadcasting rescue notification:", error.message)
  }
}

/**
 * Broadcasts a new delivery alert to all active, online riders in the specified city.
 */
export async function broadcastNewOrderToRiders(kitchenCity, orderNumber, orderId) {
  try {
    if (!kitchenCity) return

    // Fetch all active, online riders in that city with active FCM tokens
    const [riders] = await pool.query(
      `SELECT u.id, u.fcm_token 
       FROM users u
       JOIN riders r ON r.user_id = u.id
       WHERE u.role = 'rider' 
         AND u.city = ? 
         AND u.fcm_token IS NOT NULL 
         AND r.is_online = 1 
         AND r.status = 'active'`,
      [kitchenCity]
    )

    if (riders.length === 0) {
      console.log(`[Rider Broadcast] No active online riders found in city "${kitchenCity}" with FCM tokens.`)
      return
    }

    const tokens = riders.map(r => r.fcm_token)
    console.log(`[Rider Broadcast] Found ${tokens.length} online riders in "${kitchenCity}" for new delivery alert.`)

    if (!isFirebaseInitialized) {
      console.log(`[Rider Broadcast (Simulated)] City: ${kitchenCity} | Title: "New Delivery Available! 🛵" | Body: "Order #${orderNumber} is ready for pickup. Claim now!"`)
      return
    }

    const message = {
      notification: {
        title: "New Delivery Available! 🛵",
        body: `Order #${orderNumber} is ready for pickup. Claim now!`,
      },
      data: {
        type: "new_delivery",
        orderId: String(orderId),
      },
      tokens: tokens,
    }

    const response = await getMessaging().sendEachForMulticast(message)
    console.log(`✉️ Multicast rider push sent. Success: ${response.successCount}, Fail: ${response.failureCount}`)
  } catch (error) {
    console.error("❌ Error broadcasting new order alert to riders:", error.message)
  }
}
