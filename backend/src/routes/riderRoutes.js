import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { sendPushToUser, broadcastRescueNotification } from "../utils/pushNotifications.js"

const router = Router()
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;
  const R = 6371;
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(numLat1 * (Math.PI / 180)) * Math.cos(numLat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.25).toFixed(1));
}

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

// Public: Get Rider Agreement (fetched during signup)
router.get("/rider-agreement", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT rider_agreement_url, rider_agreement_version, rider_agreement_updated_at FROM site_settings WHERE id = 1"
    )
    const row = rows[0] || {}
    res.json({
      url: row.rider_agreement_url || null,
      version: row.rider_agreement_version || 0,
      updatedAt: row.rider_agreement_updated_at || null,
    })
  } catch (error) {
    console.error("Fetch rider agreement error:", error)
    res.status(500).json({ message: "Failed to fetch rider agreement" })
  }
})

// Get Rider Payout Settings
router.get("/me/payout-settings", authRequired, requireRole("rider"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT payout_mode, bank_account_name, bank_name, bank_account_number, bank_ifsc, upi_id
       FROM riders WHERE user_id = ? OR id = ?`,
      [req.user.id, req.user.riderId || 0]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Rider not found" })
    }
    const r = rows[0]
    res.json({
      payoutMode: r.payout_mode || "upi",
      bankAccountName: r.bank_account_name || "",
      bankName: r.bank_name || "",
      bankAccountNumber: r.bank_account_number || "",
      bankIfsc: r.bank_ifsc || "",
      upiId: r.upi_id || "",
    })
  } catch (error) {
    console.error("Fetch rider payout settings error:", error)
    res.status(500).json({ message: "Failed to fetch payout settings" })
  }
})

// Update Rider Payout Settings
router.put("/me/payout-settings", authRequired, requireRole("rider"), async (req, res) => {
  try {
    const { payoutMode, bankAccountName, bankName, bankAccountNumber, bankIfsc, upiId } = req.body

    const mode = payoutMode === "bank" ? "bank" : "upi"

    if (mode === "bank") {
      if (!bankAccountName || !bankAccountName.trim()) {
        return res.status(400).json({ message: "Account Holder Name is required for Bank Payout" })
      }
      if (!bankName || !bankName.trim()) {
        return res.status(400).json({ message: "Bank Name is required for Bank Payout" })
      }
      if (!bankAccountNumber || !bankAccountNumber.trim()) {
        return res.status(400).json({ message: "Account Number is required for Bank Payout" })
      }
      if (!bankIfsc || !bankIfsc.trim() || bankIfsc.trim().length !== 11) {
        return res.status(400).json({ message: "Valid 11-character IFSC Code is required" })
      }
    } else {
      if (!upiId || !upiId.trim() || !upiId.includes("@")) {
        return res.status(400).json({ message: "Valid UPI ID / VPA is required (e.g. name@upi)" })
      }
    }

    await pool.query(
      `UPDATE riders SET 
        payout_mode = ?,
        bank_account_name = ?,
        bank_name = ?,
        bank_account_number = ?,
        bank_ifsc = ?,
        upi_id = ?
       WHERE user_id = ? OR id = ?`,
      [
        mode,
        bankAccountName ? bankAccountName.trim() : null,
        bankName ? bankName.trim() : null,
        bankAccountNumber ? bankAccountNumber.trim() : null,
        bankIfsc ? bankIfsc.trim().toUpperCase() : null,
        upiId ? upiId.trim().toLowerCase() : null,
        req.user.id,
        req.user.riderId || 0,
      ]
    )

    res.json({ message: "Payout settings saved successfully" })
  } catch (error) {
    console.error("Update rider payout settings error:", error)
    res.status(500).json({ message: "Failed to update payout settings" })
  }
})

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
  const { latitude, longitude, isManual } = req.body

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: "Latitude and longitude are required" })
  }

  try {
    let finalLat = latitude
    let finalLng = longitude

    // Check if rider has a set city or active order
    const [userRows] = await pool.query("SELECT city FROM users WHERE id = ?", [req.user.id])
    const currentCity = userRows[0]?.city?.toString().trim() || ""

    const [activeOrderRows] = await pool.query(
      `SELECT k.latitude AS kitchen_latitude, k.longitude AS kitchen_longitude
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       WHERE o.rider_id = ? AND o.delivery_status IN ('accepted', 'arrived_kitchen', 'picked_up', 'arrived_customer')
       LIMIT 1`,
      [req.user.riderId]
    )
    const activeKitchen = activeOrderRows[0] || null

    // If coordinates are not explicitly manual, and incoming coords are > 35km away from active city/kitchen (e.g. Pune IP vs Roha)
    if (!isManual && (currentCity || activeKitchen)) {
      let refLat = activeKitchen?.kitchen_latitude
      let refLng = activeKitchen?.kitchen_longitude
      if (!refLat && currentCity) {
        const cLower = currentCity.toLowerCase()
        if (cLower === "roha") { refLat = 18.4372; refLng = 73.1084 }
        else if (cLower === "kolad") { refLat = 18.4144; refLng = 73.2174 }
        else if (cLower === "mangaon") { refLat = 18.2520; refLng = 73.2878 }
      }
      if (refLat && refLng) {
        const dLat = (Number(refLat) - Number(finalLat)) * Math.PI / 180
        const dLng = (Number(refLng) - Number(finalLng)) * Math.PI / 180
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(Number(finalLat)*Math.PI/180)*Math.cos(Number(refLat)*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2)
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        if (distKm > 35) {
          // Keep anchored to city / active kitchen
          finalLat = refLat
          finalLng = refLng
        }
      }
    }

    await pool.query(
      "UPDATE riders SET latitude = ?, longitude = ? WHERE id = ?",
      [finalLat, finalLng, req.user.riderId]
    )

    // If rider is currently delivering an active order, update rider location in orders table too
    await pool.query(
      `UPDATE orders SET rider_latitude = ?, rider_longitude = ?
       WHERE rider_id = ? AND delivery_status IN ('accepted', 'arrived_kitchen', 'picked_up', 'arrived_customer')`,
      [finalLat, finalLng, req.user.riderId]
    )

    // Only auto-detect and set city if rider has NO city set yet (null/empty).
    // Never overwrite a manually selected city from the location picker.
    if (!currentCity) {
      let detectedCity = null
      const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDdkmLpJjLrOLBkqceMQ63ZZodNgksd1Uc"
      if (googleMapsKey) {
        try {
          const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsKey}`
          const gRes = await fetch(gUrl)
          if (gRes.ok) {
            const gData = await gRes.json()
            if (gData.status === "OK" && gData.results?.[0]) {
              const comps = gData.results[0].address_components || []
              let loc = comps.find(c => c.types.includes("locality"))?.long_name
              let adm3 = comps.find(c => c.types.includes("administrative_area_level_3"))?.long_name
              let adm2 = comps.find(c => c.types.includes("administrative_area_level_2"))?.long_name
              let sub = comps.find(c => c.types.includes("sublocality_level_1"))?.long_name
              detectedCity = loc || adm3 || adm2 || sub || null
            }
          }
        } catch (gErr) {
          console.warn("Google Maps rider geocoding failed, trying fallback:", gErr.message)
        }
      }

      if (!detectedCity) {
        try {
          const surfSyncBase = process.env.SURFSYNC_API_BASE || "http://backend.surfsyncinfotech.in/api/surfsync/v1"
          const surfSyncKey = process.env.SURFSYNC_API_KEY || "ssx_641e42540bd2ce19d5457e5344650250e7a34d96e632338a"
          const geoUrl = `${surfSyncBase}/reverse?lat=${latitude}&lng=${longitude}`
          const geoRes = await fetch(geoUrl, {
            headers: { "X-API-Key": surfSyncKey }
          })
          const geoData = await geoRes.json()
          if (geoData) {
            detectedCity = geoData.city || geoData.suburb || geoData.district || null
          }
        } catch (geoErr) {
          console.warn("Rider location reverse geocoding failed:", geoErr.message)
        }
      }

      if (detectedCity) {
        await pool.query(
          "UPDATE users SET city = ? WHERE id = ?",
          [detectedCity, req.user.id]
        )
      }
    }

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

    // Calculate total and today's earnings from completed deliveries and cancelled orders where doorstep cancel fee was paid
    const [earningRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(delivery_fee + 20), 0) AS total_earnings, 
         COUNT(id) AS total_deliveries,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN delivery_fee + 20 ELSE 0 END), 0) AS today_earnings,
         COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN id ELSE NULL END) AS today_deliveries
       FROM orders WHERE rider_id = ? AND (status = 'delivered' OR cancel_fee_paid = 1)`,
      [req.user.riderId]
    )
    const stats = earningRows[0]

    // Fetch settled payouts total for rider to calculate Next Payout (unsettled / current cycle earnings)
    const [settledRows] = await pool.query(
      `SELECT COALESCE(SUM(s.gross_amount), 0) AS settled_gross,
              COUNT(s.id) AS total_payouts_count,
              MAX(s.id) AS latest_payout_id
       FROM settlements s
       WHERE s.entity_type = 'rider' AND (s.entity_id = ? OR s.entity_id = ?) AND s.status = 'paid'`,
      [req.user.riderId, req.user.id]
    )
    const settledGross = Number(Number(settledRows[0]?.settled_gross || 0).toFixed(2))
    const totalEarnings = Number(Number(stats.total_earnings || 0).toFixed(2))
    const nextPayout = Number(Math.max(0, totalEarnings - settledGross).toFixed(2))
    const latestPayoutId = settledRows[0]?.latest_payout_id || 0
    const totalPayoutsCount = Number(settledRows[0]?.total_payouts_count || 0)

    // Auto-expire any rescue_active orders whose 3-minute (180s) window has passed in database
    await pool.query(
      `UPDATE orders 
       SET delivery_status = 'rescue_timeout' 
       WHERE status = 'cancelled' 
         AND delivery_status = 'rescue_active' 
         AND TIMESTAMPDIFF(SECOND, updated_at, NOW()) >= 180`
    )

    // Fetch active order if any
    const [activeOrders] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone, k.city AS kitchen_city, k.state AS kitchen_state, k.pincode AS kitchen_pincode,
              k.latitude AS kitchen_latitude, k.longitude AS kitchen_longitude,
              o.delivery_latitude, o.delivery_longitude,
              u.name AS customer_name, u.phone AS customer_phone, u.city AS customer_city, u.pincode AS customer_pincode
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       JOIN users u ON o.user_id = u.id
       WHERE o.rider_id = ? AND (
         o.status IN ('preparing', 'out_for_delivery') OR 
         (o.status = 'delivered' AND o.delivery_status = 'handover_pending') OR
         (o.status = 'cancelled' AND o.delivery_status IN ('rescue_active', 'rescue_timeout', 'cancelled_unreachable'))
       )`,
      [req.user.riderId]
    )

    // Fetch latest pending or rejected cash deposit remittance status, fallback to latest overall
    const [pendingRemittance] = await pool.query(
      `SELECT id, amount, utr_number, status, rejection_reason, created_at
       FROM rider_cash_remittances
       WHERE rider_id = ? AND status IN ('pending', 'rejected')
       ORDER BY id DESC LIMIT 1`,
      [req.user.riderId]
    )

    let remittanceObj = pendingRemittance[0] || null
    if (!remittanceObj) {
      const [latestRemittance] = await pool.query(
        `SELECT id, amount, utr_number, status, rejection_reason, created_at
         FROM rider_cash_remittances
         WHERE rider_id = ?
         ORDER BY id DESC LIMIT 1`,
        [req.user.riderId]
      )
      remittanceObj = latestRemittance[0] || null
    }

    let formattedActiveOrder = null
    if (activeOrders[0]) {
      const ao = activeOrders[0]
      const isOnline = ['online', 'upi', 'razorpay'].includes(ao.payment_method)
      const grandTotal = Number(ao.grand_total)
      const advanceAmount = isOnline ? grandTotal : (Number(ao.advance_amount) > 0 ? Number(ao.advance_amount) : 30.00)
      const remainingAmount = isOnline ? 0.00 : Math.max(0, grandTotal - advanceAmount)

      formattedActiveOrder = {
        ...ao,
        grand_total: isOnline ? grandTotal : remainingAmount,
        original_grand_total: grandTotal,
        advance_amount: advanceAmount,
        remaining_amount: remainingAmount,
        collect_amount: remainingAmount,
      }
    }

    res.json({
      status: rider.status,
      isOnline: Boolean(rider.is_online),
      cashCollected: Number(rider.cash_collected),
      totalEarnings: totalEarnings,
      nextPayout: nextPayout,
      unsettledEarnings: nextPayout,
      totalSettledEarnings: settledGross,
      latestPayoutId: latestPayoutId,
      totalPayoutsCount: totalPayoutsCount,
      totalDeliveries: Number(stats.total_deliveries),
      todayEarnings: Number(stats.today_earnings),
      todayDeliveries: Number(stats.today_deliveries),
      activeOrder: formattedActiveOrder,
      remittanceStatus: remittanceObj,
    })
  } catch (error) {
    console.error("Rider dashboard error:", error)
    res.status(500).json({ message: "Failed to load dashboard metrics" })
  }
})

// 4. Get Available Delivery Broadcasts in Rider's City
router.get("/deliveries/available", authRequired, requireRole("rider"), requireActiveRider, async (req, res) => {
  try {
    // Get rider's city from users table
    const [riders] = await pool.query(
      `SELECT r.is_online, u.city AS rider_city
       FROM riders r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [req.user.riderId]
    )

    const rider = riders[0]
    if (!rider || !rider.is_online) {
      return res.json({ deliveries: [] })
    }

    const riderCity = rider.rider_city?.toString().trim() || null

    // Fetch orders ready for pickup in the same city (kitchen city or customer city matches rider city)
    let query = `
      SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone, k.city AS kitchen_city, k.state AS kitchen_state, k.pincode AS kitchen_pincode,
             k.latitude AS kitchen_latitude, k.longitude AS kitchen_longitude,
             o.delivery_latitude, o.delivery_longitude,
             u.name AS customer_name, u.phone AS customer_phone, u.city AS customer_city, u.pincode AS customer_pincode
      FROM orders o
      JOIN kitchens k ON o.kitchen_id = k.id
      JOIN users u ON o.user_id = u.id
      WHERE o.delivery_status = 'pending_assignment' AND o.rider_id IS NULL AND (o.delivery_method IS NULL OR o.delivery_method != 'self')
    `
    const params = []
    if (riderCity) {
      query += ` AND (LOWER(TRIM(k.city)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.city)) = LOWER(TRIM(?)))`
      params.push(riderCity, riderCity)
    }
    query += ` ORDER BY o.created_at DESC`

    const [orders] = await pool.query(query, params)

    res.json({ deliveries: orders })
  } catch (error) {
    console.error("Rider fetch available deliveries error:", error)
    res.status(500).json({ message: "Failed to fetch available deliveries" })
  }
})

// 4.1. Compute exact road distance, duration, encoded polyline, and turn-by-turn navigation steps
router.get("/route-details", authRequired, requireRole("rider"), async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query
  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ message: "Origin and Destination coordinates are required" })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDdkmLpJjLrOLBkqceMQ63ZZodNgksd1Uc"

  try {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    const body = {
      origin: { location: { latLng: { latitude: Number(originLat), longitude: Number(originLng) } } },
      destination: { location: { latLng: { latitude: Number(destLat), longitude: Number(destLng) } } },
      travelMode: "TWO_WHEELER",
      languageCode: "en-US"
    }

    const fieldMask = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters"

    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(body)
    })

    let data = await response.json()
    if (!data?.routes?.[0]) {
      // Fallback to DRIVE
      body.travelMode = "DRIVE"
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask
        },
        body: JSON.stringify(body)
      })
      data = await response.json()
    }

    if (data?.routes?.[0]) {
      const route = data.routes[0]
      const distanceMeters = route.distanceMeters || 0
      const distanceKm = (distanceMeters / 1000).toFixed(1)
      const durationSeconds = parseInt(route.duration?.replace("s", "") || "0", 10)
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60))

      const rawSteps = route.legs?.[0]?.steps || []
      const steps = rawSteps.map((s, idx) => ({
        id: idx + 1,
        distanceMeters: s.distanceMeters || 0,
        distanceText: (s.distanceMeters || 0) >= 1000 ? `${((s.distanceMeters || 0)/1000).toFixed(1)} km` : `${s.distanceMeters || 0} m`,
        maneuver: s.navigationInstruction?.maneuver || "STRAIGHT",
        instruction: (s.navigationInstruction?.instructions || "Continue along route").replace(/\n/g, " ")
      }))

      return res.json({
        distanceMeters,
        distanceKm: Number(distanceKm) < 0.1 ? "0.1" : distanceKm,
        durationMinutes,
        durationText: `${durationMinutes} mins`,
        encodedPolyline: route.polyline?.encodedPolyline || null,
        steps
      })
    }
  } catch (err) {
    console.error("Google Routes API error in /route-details:", err.message)
  }

  // Haversine fallback with 1.25 road multiplier
  const R = 6371
  const dLat = (Number(destLat) - Number(originLat)) * (Math.PI / 180)
  const dLon = (Number(destLng) - Number(originLng)) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Number(originLat) * (Math.PI / 180)) *
      Math.cos(Number(destLat) * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const roadKm = Math.max(0.1, Number((R * c * 1.25).toFixed(1)))
  const estimatedMins = Math.max(1, Math.round((roadKm / 25) * 60))

  return res.json({
    distanceMeters: Math.round(roadKm * 1000),
    distanceKm: roadKm.toFixed(1),
    durationMinutes: estimatedMins,
    durationText: `${estimatedMins} mins`,
    encodedPolyline: null,
    steps: [
      { id: 1, distanceText: `${roadKm} km`, maneuver: "STRAIGHT", instruction: "Proceed along main road toward destination" }
    ]
  })
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
      let deliveryFeeVal = Number(order.delivery_fee) || 0
      if (deliveryFeeVal <= 0) {
        const dist = calculateDistanceKm(order.kitchen_latitude, order.kitchen_longitude, order.delivery_latitude, order.delivery_longitude)
        deliveryFeeVal = dist !== null ? calculateDeliveryCharge(dist) : 30.00
      }

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
        "UPDATE orders SET delivery_status = 'arrived_customer', arrived_at_customer_at = COALESCE(arrived_at_customer_at, NOW()) WHERE id = ?",
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

      const isCodOrder = order.payment_method === "cod" || Number(order.remaining_amount || 0) > 0 || (Number(order.grand_total) - Number(order.advance_amount || 0)) > 5
      if (isCodOrder) {
        const doorstepMethod = (req.body.paymentType === "qr" || req.body.doorstepPaymentMethod === "admin_qr_online") ? "admin_qr_online" : "cash"
        const remainingAmount = Math.max(0, Number(order.grand_total) - Number(order.advance_amount || 30))

        if (doorstepMethod === "admin_qr_online") {
          // For COD paid online via rider's Admin QR:
          // Immediately mark complete; full grand total goes directly to admin gross revenue
          await connection.query(
            "UPDATE orders SET status = 'delivered', delivery_status = 'delivered', doorstep_payment_method = 'admin_qr_online' WHERE id = ?",
            [orderId]
          )
        } else {
          // For COD cash: immediately mark complete, rider holds remaining cash (e.g. ₹370) for EOD admin deposit
          await connection.query(
            "UPDATE orders SET status = 'delivered', delivery_status = 'delivered', doorstep_payment_method = 'cash' WHERE id = ?",
            [orderId]
          )
          // Add remaining cash amount to rider's cash collected balance
          await connection.query(
            "UPDATE riders SET cash_collected = cash_collected + ? WHERE id = ?",
            [remainingAmount, req.user.riderId]
          )
        }
      } else {
        // For Prepaid: immediately mark complete
        await connection.query(
          "UPDATE orders SET status = 'delivered', delivery_status = 'delivered' WHERE id = ?",
          [orderId]
        )
      }
    } else if (action === "cancel_doorstep") {
      if (order.rider_id !== req.user.riderId || ["delivered", "cancelled"].includes(order.status)) {
        await connection.rollback()
        return res.status(400).json({ message: "Invalid order status for this action" })
      }

      const { cancellationOtp, isUnreachable, note } = req.body || {}

      if (isUnreachable) {
        // Enforce 10-minute wait from arrival
        const arrivedAtStr = order.arrived_at_customer_at || (order.delivery_status === "arrived_customer" ? order.updated_at : null)
        const arrivedAt = arrivedAtStr ? new Date(arrivedAtStr).getTime() : 0
        const now = Date.now()
        const waitMs = 10 * 60 * 1000 // 10 minutes
        if (arrivedAt > 0 && (now - arrivedAt) < waitMs) {
          const remainingSec = Math.ceil((waitMs - (now - arrivedAt)) / 1000)
          const mins = Math.floor(remainingSec / 60)
          const secs = remainingSec % 60
          await connection.rollback()
          return res.status(400).json({
            message: `Please wait ${mins}m ${secs}s more before reporting customer as unreachable. Minimum 10 minutes wait required at customer doorstep.`
          })
        }
      } else {
        const validOtp = order.cancellation_otp || order.delivery_otp

        if (!cancellationOtp || !validOtp || String(cancellationOtp).trim() !== String(validOtp).trim()) {
          await connection.rollback()
          return res.status(400).json({ message: "Invalid Cancellation OTP. Please ask the customer for their 4-digit Cancellation OTP." })
        }
      }

      const isSecondLevelRescue = Boolean(order.is_rescue === 1 || (order.original_order_id && Number(order.original_order_id) > 0) || order.delivery_status === "rescue_claimed")
      const cancellationReason = isUnreachable ? (note?.trim() || "Customer unreachable at doorstep") : "Customer cancelled at doorstep"
      const isPrepaid = ["online", "upi", "razorpay"].includes(order.payment_method)

      // Skip food rescue if second-level rescue OR if it's an unreachable prepaid order (already fully paid)
      const shouldTriggerRescue = !isSecondLevelRescue && (!isUnreachable || !isPrepaid)

      if (!shouldTriggerRescue) {
        // Direct return to kitchen / call kitchen: NO rescue broadcast
        const targetStatus = isUnreachable ? "cancelled_unreachable" : "rescue_timeout"
        await connection.query(
          `UPDATE orders 
           SET status = 'cancelled', 
               delivery_status = ?, 
               cancel_fee_paid = 1,
               cancellation_reason = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [targetStatus, cancellationReason, orderId]
        )
      } else {
        // First-level rescue cancellation for COD: Start 3-minute live rescue timer & broadcast!
        await connection.query(
          `UPDATE orders 
           SET status = 'cancelled', 
               delivery_status = 'rescue_active', 
               cancel_fee_paid = 1,
               cancellation_reason = ?,
               updated_at = NOW() 
           WHERE id = ?`,
          [cancellationReason, orderId]
        )


        // Start the 3 minutes rescue timeout
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
        }, 3 * 60 * 1000)

        // Broadcast food rescue notification to nearby users in same city
        try {
          broadcastRescueNotification(order.kitchen_id, order.order_number, order.grand_total, orderId, order.user_id)
        } catch (broadcastErr) {
          console.error("Non-blocking error broadcasting rescue notification:", broadcastErr.message)
        }
      }
    }

    await connection.commit()

    // Trigger push notifications after successful transaction commit
    try {
      if (action === "accept") {
        sendPushToUser(order.user_id, "Rider Assigned! 🛵", `A delivery partner has been assigned to your order #${order.order_number} and is heading to the kitchen.`)
      } else if (action === "arrive_kitchen") {
        sendPushToUser(order.user_id, "Rider at Kitchen 📍", `Your delivery partner has arrived at the kitchen to pick up your order.`)
      } else if (action === "pickup") {
        sendPushToUser(order.user_id, "On the Way! 🚀", `Your order #${order.order_number} has been picked up and is on the way to your doorstep!`)
      } else if (action === "arrive_customer") {
        const deliveryOtpVal = order.delivery_otp || "code"
        sendPushToUser(order.user_id, "Rider Arrived! 🔔", `Your delivery partner has arrived at your location. Please share the OTP ${deliveryOtpVal} with them to receive your food.`)
      } else if (action === "deliver") {
        sendPushToUser(order.user_id, "Delivered! 🎉", `Your delicious meal for order #${order.order_number} has been successfully delivered. Enjoy your food!`)
      } else if (action === "cancel_doorstep") {
        if (req.body?.isUnreachable) {
          const unreachableMsg = `Your order #${order.order_number} was cancelled because our delivery partner waited 10+ minutes at your doorstep and calls went unanswered. As the meal was prepared and dispatched, no refund is applicable.`
          sendPushToUser(order.user_id, "Order Cancelled — Unreachable ⚠️", unreachableMsg)
          await pool.query(
            `INSERT INTO alerts (user_id, target_role, title, body, is_system, created_at)
             VALUES (?, 'customer', ?, ?, 0, NOW())`,
            [order.user_id, "Order Cancelled — Unreachable ⚠️", unreachableMsg]
          ).catch(() => {})
        } else {
          sendPushToUser(order.user_id, "Order Cancelled 🛑", `Your order #${order.order_number} has been cancelled at the doorstep.`)
        }
      }
    } catch (pushErr) {
      console.error("Non-blocking error triggering delivery push notification:", pushErr.message)
    }

    const [updatedOrder] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone,
              k.latitude AS kitchen_latitude, k.longitude AS kitchen_longitude,
              o.delivery_latitude, o.delivery_longitude,
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

// Request Doorstep Cancellation OTP (Rider triggers OTP to customer)
router.post("/deliveries/:orderId/request-cancel-otp", authRequired, requireRole("rider"), requireActiveRider, async (req, res) => {
  const orderId = req.params.orderId
  try {
    const [rows] = await pool.query(
      "SELECT id, order_number, user_id, rider_id, status, payment_method, grand_total, delivery_fee, cancellation_otp, delivery_otp FROM orders WHERE id = ?",
      [orderId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = rows[0]
    if (order.rider_id !== req.user.riderId) {
      return res.status(403).json({ message: "Not authorized for this order" })
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Order is already completed or cancelled" })
    }

    let cancelOtp = order.cancellation_otp
    if (!cancelOtp) {
      cancelOtp = Math.floor(1000 + Math.random() * 9000).toString()
      await pool.query("UPDATE orders SET cancellation_otp = ? WHERE id = ?", [cancelOtp, orderId])
    }

    const isOnline = ["online", "upi", "razorpay"].includes(order.payment_method)
    const delFee = Number(order.delivery_fee) > 0 ? Number(order.delivery_fee) : 30
    const refundAmt = isOnline ? Math.max(0, Number(order.grand_total) - delFee) : 0
    const bodyMsg = isOnline 
      ? `Your 4-digit cancellation OTP is ${cancelOtp}. Share with rider to confirm. Note: ₹${delFee} delivery fee is non-refundable & ₹${refundAmt} will be refunded.`
      : `Your 4-digit cancellation OTP is ${cancelOtp}. Share with rider to confirm. Advance ₹30 delivery fee is non-refundable.`

    try {
      sendPushToUser(
        order.user_id,
        "Doorstep Cancellation Requested 🔑",
        bodyMsg,
        { orderId: String(orderId), cancellationOtp: cancelOtp, type: "cancellation_otp" }
      )
    } catch (pushErr) {
      console.warn("Non-blocking error sending cancellation OTP push:", pushErr.message)
    }

    res.json({
      message: "Cancellation OTP sent to customer successfully.",
      cancellationOtpSent: true,
      otp: cancelOtp
    })
  } catch (err) {
    console.error("Request cancellation OTP error:", err)
    res.status(500).json({ message: "Failed to request cancellation OTP" })
  }
})

router.post("/deposit-cash", authRequired, requireRole("rider"), async (req, res) => {
  const { utrNumber, amount } = req.body

  try {
    const [riders] = await pool.query(
      "SELECT cash_collected FROM riders WHERE id = ?",
      [req.user.riderId]
    )

    if (riders.length === 0) {
      return res.status(404).json({ message: "Rider profile not found" })
    }

    const cashHolding = Number(riders[0].cash_collected)
    const depositAmount = Number(amount) || cashHolding

    if (depositAmount <= 0) {
      return res.status(400).json({ message: "No outstanding cash balance to deposit" })
    }

    // Prevent duplicate deposit request if a deposit request is already pending
    const [pendingRemittances] = await pool.query(
      `SELECT id FROM rider_cash_remittances WHERE rider_id = ? AND status = 'pending'`,
      [req.user.riderId]
    )

    if (pendingRemittances.length > 0) {
      return res.status(400).json({
        message: "You already have a pending cash deposit request under Admin verification. Please wait for Admin approval."
      })
    }

    // Insert remittance record for admin verification
    await pool.query(
      `INSERT INTO rider_cash_remittances (rider_id, amount, utr_number, status)
       VALUES (?, ?, ?, 'pending')`,
      [req.user.riderId, depositAmount, utrNumber?.trim() || null]
    )

    res.json({
      message: `Deposit request of ₹${depositAmount} submitted for Admin verification.`,
      cashCollected: cashHolding,
    })
  } catch (error) {
    console.error("Rider deposit cash error:", error)
    res.status(500).json({ message: "Failed to process cash deposit" })
  }
})

// Get Rider Cash Deposit / Remittances History
const getRiderCashRemittances = async (req, res) => {
  try {
    const [riders] = await pool.query(
      "SELECT id FROM riders WHERE user_id = ? OR id = ?",
      [req.user.id, req.user.riderId || 0]
    )
    const riderId = riders[0]?.id || req.user.riderId

    if (!riderId) {
      return res.json({ remittances: [] })
    }

    const [remittances] = await pool.query(
      `SELECT id, amount, utr_number, status, notes, rejection_reason, verified_at, created_at
       FROM rider_cash_remittances
       WHERE rider_id = ?
       ORDER BY id DESC LIMIT 50`,
      [riderId]
    )
    res.json({ remittances })
  } catch (error) {
    console.error("Get rider cash remittances error:", error)
    res.status(500).json({ message: "Failed to fetch cash deposit history" })
  }
}

router.get("/cash-remittances", authRequired, requireRole("rider"), getRiderCashRemittances)
router.get("/me/cash-remittances", authRequired, requireRole("rider"), getRiderCashRemittances)

// Rider cancels order when customer is unreachable at doorstep
router.post("/deliveries/:id/cancel-unreachable", authRequired, requireRole("rider"), async (req, res) => {
  const orderId = req.params.id
  const { reason } = req.body

  try {
    const [orders] = await pool.query(
      "SELECT id, status, delivery_status, rider_id FROM orders WHERE id = ? AND rider_id = ?",
      [orderId, req.user.riderId]
    )

    if (orders.length === 0) {
      return res.status(404).json({ message: "Active order not found" })
    }

    const cancellationReason = reason?.trim() || "Customer unreachable at doorstep"

    await pool.query(
      `UPDATE orders 
       SET status = 'cancelled', 
           delivery_status = 'cancelled_unreachable',
           cancellation_reason = ?
       WHERE id = ?`,
      [cancellationReason, orderId]
    )

    const [updated] = await pool.query(
      `SELECT o.*, k.name AS kitchen_name, k.address AS kitchen_address, k.phone AS kitchen_phone,
              k.latitude AS kitchen_latitude, k.longitude AS kitchen_longitude,
              o.delivery_latitude, o.delivery_longitude,
              u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN kitchens k ON o.kitchen_id = k.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    )

    res.json({ message: "Order cancelled as customer unreachable", order: updated[0] })
  } catch (error) {
    console.error("Rider cancel unreachable error:", error)
    res.status(500).json({ message: "Failed to cancel order" })
  }
})

// Rider completes return to kitchen and clears active order card
router.post("/deliveries/:id/dismiss-returned", authRequired, requireRole("rider"), async (req, res) => {
  const orderId = req.params.id

  try {
    const [orders] = await pool.query(
      "SELECT id, status, delivery_status, rider_id, order_number FROM orders WHERE id = ? AND rider_id = ?",
      [orderId, req.user.riderId]
    )

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = orders[0]

    // Enforce kitchen verification: Kitchen partner must tap "Confirm Food Returned 📦" in their app
    if (order.delivery_status !== "returned" && order.delivery_status !== "returned_to_kitchen") {
      return res.status(400).json({
        message: "Food return not verified yet. Please hand over the food to the kitchen partner and ask them to tap 'Confirm Food Returned 📦' on their Orders tab."
      })
    }

    await pool.query(
      `UPDATE orders SET delivery_status = 'returned_to_kitchen' WHERE id = ? AND rider_id = ?`,
      [orderId, req.user.riderId]
    )

    res.json({ message: "Returned order dismissed successfully" })
  } catch (error) {
    console.error("Rider dismiss returned order error:", error)
    res.status(500).json({ message: "Failed to dismiss returned order" })
  }
})

// Rider Payout & Settlement History
router.get("/me/payouts", authRequired, requireRole("rider"), async (req, res) => {
  try {
    const riderId = req.user.riderId

    const [rows] = await pool.query(
      `SELECT id, period_type, period_start, period_end, gross_amount, deductions_commissions, net_payout, status, utr_number, notes, paid_at, created_at
       FROM settlements
       WHERE entity_type = 'rider' AND (entity_id = ? OR entity_id = ?)
       ORDER BY paid_at DESC, created_at DESC`,
      [riderId, req.user.id]
    )

    res.json({
      payouts: rows.map((r) => ({
        id: r.id,
        periodType: r.period_type,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        grossAmount: Number(r.gross_amount),
        commissionDeduction: Number(r.deductions_commissions),
        netPayout: Number(r.net_payout),
        status: r.status,
        utrNumber: r.utr_number,
        notes: r.notes,
        paidAt: r.paid_at,
        createdAt: r.created_at,
      }))
    })
  } catch (error) {
    console.error("Fetch rider payouts error:", error)
    res.status(500).json({ message: "Failed to fetch rider payouts" })
  }
})

export default router
