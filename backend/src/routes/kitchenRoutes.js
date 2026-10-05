import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import {
  kitchenLogoUpload,
  kitchenCoverUpload,
  kitchenImagesUpload,
  fssaiLicenseUpload,
  getKitchenLogoUrl,
  getKitchenFileUrl,
} from "../middleware/upload.js"
import { formatKitchen, formatKitchens } from "../utils/mediaUrl.js"
import { getHygieneCompliance, isKitchenPubliclyVisible } from "../utils/hygieneCompliance.js"
import { getKitchenRatingStats, withPublicRating, withPublicRatings, SQL_RATING_COUNT } from "../utils/kitchenRating.js"

const router = Router()

router.get("/partner-agreement", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT partner_agreement_url, partner_agreement_version, partner_agreement_updated_at,
              training_video_url, training_video_version, training_video_updated_at
       FROM site_settings WHERE id = 1`
    )
    const row = rows[0] || {}
    res.json({
      url: row.partner_agreement_url || null,
      version: row.partner_agreement_version || 0,
      updatedAt: row.partner_agreement_updated_at || null,
      videoUrl: row.training_video_url || null,
      videoVersion: row.training_video_version || 0,
      videoUpdatedAt: row.training_video_updated_at || null,
    })
  } catch (error) {
    console.error("Fetch partner agreement error:", error)
    res.status(500).json({ message: "Failed to fetch partner agreement assets" })
  }
})

router.post("/me/logo", authRequired, requireRole("kitchen"), (req, res) => {
  kitchenLogoUpload.single("logo")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ message: "Logo image is required" })
    }

    try {
      const logoUrl = getKitchenLogoUrl(req, req.file.filename)
      await pool.query("UPDATE kitchens SET image = ? WHERE user_id = ?", [logoUrl, req.user.id])

      const [rows] = await pool.query(
        `SELECT k.*, u.name AS user_name, u.email AS user_email
         FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.user.id]
      )

      res.json({ message: "Logo updated", kitchen: formatKitchen(rows[0]) })
    } catch (error) {
      console.error("Kitchen logo upload error:", error)
      res.status(500).json({ message: "Failed to update logo" })
    }
  })
})

router.post("/me/cover", authRequired, requireRole("kitchen"), (req, res) => {
  kitchenCoverUpload.single("cover")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ message: "Cover image is required" })
    }

    try {
      const coverUrl = getKitchenFileUrl(req, req.file.filename)
      await pool.query("UPDATE kitchens SET cover_image = ? WHERE user_id = ?", [
        coverUrl,
        req.user.id,
      ])

      const [rows] = await pool.query(
        `SELECT k.*, u.name AS user_name, u.email AS user_email
         FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.user.id]
      )

      res.json({ message: "Home card image updated", kitchen: formatKitchen(rows[0]) })
    } catch (error) {
      console.error("Kitchen cover upload error:", error)
      res.status(500).json({ message: "Failed to update home card image" })
    }
  })
})

router.post("/me/images", authRequired, requireRole("kitchen"), (req, res) => {
  kitchenImagesUpload.array("images", 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Kitchen images are required" })
    }

    try {
      const [rows] = await pool.query(
        "SELECT kitchen_images FROM kitchens WHERE user_id = ?",
        [req.user.id]
      )
      const existing = []
      if (rows[0]?.kitchen_images) {
        try {
          const parsed = typeof rows[0].kitchen_images === "string" ? JSON.parse(rows[0].kitchen_images) : rows[0].kitchen_images
          if (Array.isArray(parsed)) existing.push(...parsed)
        } catch {
          // ignore invalid JSON
        }
      }

      const totalCount = existing.length + req.files.length
      if (totalCount > 5) {
        return res.status(400).json({ message: "You can upload at most 5 kitchen images" })
      }

      const imageUrls = req.files.map((file) => getKitchenFileUrl(req, file.filename))
      const nextImages = [...existing, ...imageUrls]

      await pool.query(
        "UPDATE kitchens SET kitchen_images = ? WHERE user_id = ?",
        [JSON.stringify(nextImages), req.user.id]
      )

      const [updatedRows] = await pool.query(
        `SELECT k.*, u.name AS user_name, u.email AS user_email
         FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.user.id]
      )

      res.json({ message: "Kitchen images uploaded", kitchen: formatKitchen(updatedRows[0]) })
    } catch (error) {
      console.error("Kitchen images upload error:", error)
      res.status(500).json({ message: "Failed to upload kitchen images" })
    }
  })
})

router.delete("/me/images", authRequired, requireRole("kitchen"), async (req, res) => {
  const { imageUrl } = req.body
  if (!imageUrl) {
    return res.status(400).json({ message: "imageUrl is required" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT kitchen_images FROM kitchens WHERE user_id = ?",
      [req.user.id]
    )

    let existing = []
    if (rows[0]?.kitchen_images) {
      try {
        const parsed = typeof rows[0].kitchen_images === "string" ? JSON.parse(rows[0].kitchen_images) : rows[0].kitchen_images
        if (Array.isArray(parsed)) existing = parsed
      } catch {
        existing = []
      }
    }

    const targetUrl = imageUrl.trim()
    const nextImages = existing.filter((url) => {
      return url !== targetUrl && !targetUrl.endsWith(url) && !url.endsWith(targetUrl)
    })

    await pool.query(
      "UPDATE kitchens SET kitchen_images = ? WHERE user_id = ?",
      [JSON.stringify(nextImages), req.user.id]
    )

    const [updatedRows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
      [req.user.id]
    )

    res.json({ message: "Kitchen image deleted", kitchen: formatKitchen(updatedRows[0]) })
  } catch (error) {
    console.error("Delete kitchen image error:", error)
    res.status(500).json({ message: "Failed to delete kitchen image" })
  }
})

router.post("/me/resubmit", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const [kitchenRows] = await pool.query(
      "SELECT id, name, cover_image, status FROM kitchens WHERE user_id = ?",
      [req.user.id]
    )
    if (kitchenRows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const kitchen = kitchenRows[0]

    await pool.query(
      `UPDATE kitchens 
       SET status = 'pending', rejection_reason = NULL, submitted_at = NOW() 
       WHERE id = ?`,
      [kitchen.id]
    )

    // Notify Admin
    await pool.query(
      `INSERT INTO alerts (target_role, kitchen_id, title, body, is_system, created_by) 
       VALUES ('admin', ?, 'Kitchen Re-Submitted Application', ?, 1, ?)`,
      [kitchen.id, `Kitchen "${kitchen.name}" has re-submitted their application with updated details/photos for review.`, req.user.id]
    )

    const [updated] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.id = ?`,
      [kitchen.id]
    )

    res.json({
      message: "Application re-submitted successfully for Admin review",
      kitchen: formatKitchen(updated[0]),
    })
  } catch (error) {
    console.error("Resubmit application error:", error)
    res.status(500).json({ message: "Failed to re-submit application" })
  }
})

router.get("/me", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email, ${SQL_RATING_COUNT}
       FROM kitchens k
       JOIN users u ON u.id = k.user_id
       WHERE k.user_id = ?`,
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const kitchen = formatKitchen(rows[0])
    const stats = getKitchenRatingStats(rows[0])
    res.json({
      kitchen: {
        ...kitchen,
        rating_count: stats.ratingCount,
        ratingsNeeded: stats.ratingsNeeded,
        ratingVisible: stats.ratingVisible,
      },
    })
  } catch (error) {
    console.error("Kitchen me error:", error)
    res.status(500).json({ message: "Failed to fetch kitchen" })
  }
})

// Get Kitchen Payout Settings
router.get("/me/payout-settings", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT payout_mode, bank_account_name, bank_name, bank_account_number, bank_ifsc, upi_id
       FROM kitchens WHERE user_id = ?`,
      [req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
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
    console.error("Fetch kitchen payout settings error:", error)
    res.status(500).json({ message: "Failed to fetch payout settings" })
  }
})

// Update Kitchen Payout Settings
router.put("/me/payout-settings", authRequired, requireRole("kitchen"), async (req, res) => {
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
      `UPDATE kitchens SET 
        payout_mode = ?,
        bank_account_name = ?,
        bank_name = ?,
        bank_account_number = ?,
        bank_ifsc = ?,
        upi_id = ?
       WHERE user_id = ?`,
      [
        mode,
        bankAccountName ? bankAccountName.trim() : null,
        bankName ? bankName.trim() : null,
        bankAccountNumber ? bankAccountNumber.trim() : null,
        bankIfsc ? bankIfsc.trim().toUpperCase() : null,
        upiId ? upiId.trim().toLowerCase() : null,
        req.user.id,
      ]
    )

    res.json({ message: "Payout settings saved successfully" })
  } catch (error) {
    console.error("Update kitchen payout settings error:", error)
    res.status(500).json({ message: "Failed to update payout settings" })
  }
})

// Kitchen Payout Settlement History
router.get("/me/payouts", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const [kitchenRows] = await pool.query(
      "SELECT id FROM kitchens WHERE user_id = ?",
      [req.user.id]
    )
    if (kitchenRows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }
    const kitchenId = kitchenRows[0].id

    const [rows] = await pool.query(
      `SELECT id, period_type, period_start, period_end, gross_amount, deductions_commissions, deductions_rider_fees, deductions_gst, net_payout, status, utr_number, notes, paid_at, created_at
       FROM settlements
       WHERE entity_type = 'kitchen' AND (entity_id = ? OR entity_id = ?)
       ORDER BY paid_at DESC, created_at DESC`,
      [kitchenId, req.user.id]
    )

    res.json({
      payouts: rows.map((r) => {
        const gross = Number(Number(r.gross_amount).toFixed(2))
        const comm = Number(Number(r.deductions_commissions).toFixed(2))
        const gst = Number(Number(r.deductions_gst || 0).toFixed(2))
        const net = Number(Number(r.net_payout).toFixed(2))
        const storedRiderFee = Number(Number(r.deductions_rider_fees || 0).toFixed(2))
        const riderFee = storedRiderFee > 0 ? storedRiderFee : Number(Math.max(0, gross - comm - gst - net).toFixed(2))

        return {
          id: r.id,
          periodType: r.period_type,
          periodStart: r.period_start,
          periodEnd: r.period_end,
          grossAmount: gross,
          commissionDeduction: comm,
          gstDeduction: gst,
          riderFeeDeduction: riderFee,
          netPayout: net,
          status: r.status,
          utrNumber: r.utr_number,
          notes: r.notes,
          paidAt: r.paid_at,
          createdAt: r.created_at,
        }
      })
    })
  } catch (error) {
    console.error("Fetch kitchen payouts error:", error)
    res.status(500).json({ message: "Failed to fetch payouts" })
  }
})

router.post("/me/fssai-license", authRequired, requireRole("kitchen"), (req, res) => {
  fssaiLicenseUpload.single("fssaiLicense")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ message: "FSSAI license file is required" })
    }

    try {
      const licenseUrl = getKitchenFileUrl(req, req.file.filename)
      await pool.query("UPDATE kitchens SET fssai_license = ? WHERE user_id = ?", [
        licenseUrl,
        req.user.id,
      ])

      const [rows] = await pool.query(
        `SELECT k.*, u.name AS user_name, u.email AS user_email
         FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.user.id]
      )

      res.json({ message: "FSSAI license updated", kitchen: formatKitchen(rows[0]) })
    } catch (error) {
      console.error("FSSAI license upload error:", error)
      res.status(500).json({ message: "Failed to upload FSSAI license" })
    }
  })
})

router.patch("/me/offer", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const offer =
      req.body.offer === undefined || req.body.offer === null
        ? null
        : String(req.body.offer).trim() || null

    const [result] = await pool.query("UPDATE kitchens SET offer = ? WHERE user_id = ?", [
      offer,
      req.user.id,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
      [req.user.id]
    )

    res.json({ message: "Kitchen offer updated", kitchen: formatKitchen(rows[0]) })
  } catch (error) {
    console.error("Kitchen offer update error:", error)
    res.status(500).json({ message: "Failed to update offer" })
  }
})

router.put("/me/festival-offer", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const {
      enabled,
      title,
      category,
      discountPercent,
      startDate,
      endDate,
      description,
      image,
      image2,
      festival_offer_image,
      festival_offer_image_2,
    } = req.body

    const isEnabled = enabled !== undefined ? (enabled ? 1 : 0) : 0
    const validCategory = ["food", "grocery", "both"].includes(category) ? category : "both"
    const parsedPercent = discountPercent !== undefined ? Math.max(0, Math.min(100, Number(discountPercent) || 0)) : 0
    const offerImg1 = image !== undefined ? image : (festival_offer_image !== undefined ? festival_offer_image : null)
    const offerImg2 = image2 !== undefined ? image2 : (festival_offer_image_2 !== undefined ? festival_offer_image_2 : null)

    let parsedStart = null
    let parsedEnd = null
    if (startDate) {
      const s = new Date(startDate)
      if (!isNaN(s.getTime())) {
        parsedStart = s.toISOString().slice(0, 19).replace("T", " ")
      }
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) {
        parsedEnd = e.toISOString().slice(0, 19).replace("T", " ")
      }
    }

    const [result] = await pool.query(
      `UPDATE kitchens SET
        festival_offer_enabled = ?,
        festival_offer_title = ?,
        festival_offer_category = ?,
        festival_offer_discount_percent = ?,
        festival_offer_start_date = ?,
        festival_offer_end_date = ?,
        festival_offer_description = ?,
        festival_offer_image = ?,
        festival_offer_image_2 = ?
       WHERE user_id = ?`,
      [
        isEnabled,
        title ? String(title).trim() : null,
        validCategory,
        parsedPercent,
        parsedStart,
        parsedEnd,
        description ? String(description).trim() : null,
        offerImg1,
        offerImg2,
        req.user.id,
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
      [req.user.id]
    )

    res.json({ message: "Festival offer updated successfully", kitchen: formatKitchen(rows[0]) })
  } catch (error) {
    console.error("Festival offer update error:", error)
    res.status(500).json({ message: "Failed to update festival offer" })
  }
})

router.post("/me/festival-offer/image", authRequired, requireRole("kitchen"), (req, res) => {
  kitchenCoverUpload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" })
    }

    try {
      const imageUrl = getKitchenFileUrl(req, req.file.filename)
      const slot = String(req.query.slot || req.body.slot || "1")

      if (slot === "2") {
        await pool.query(
          "UPDATE kitchens SET festival_offer_image_2 = ? WHERE user_id = ?",
          [imageUrl, req.user.id]
        )
      } else {
        await pool.query(
          "UPDATE kitchens SET festival_offer_image = ? WHERE user_id = ?",
          [imageUrl, req.user.id]
        )
      }

      const [rows] = await pool.query(
        `SELECT k.*, u.name AS user_name, u.email AS user_email
         FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.user.id]
      )

      res.json({ message: `Festival offer image ${slot} uploaded`, imageUrl, slot, kitchen: formatKitchen(rows[0]) })
    } catch (error) {
      console.error("Festival offer image upload error:", error)
      res.status(500).json({ message: "Failed to save festival offer image" })
    }
  })
})

router.patch("/me", authRequired, requireRole("kitchen"), async (req, res) => {
  const {
    name,
    ownerName,
    phone,
    speciality,
    kitchenType,
    bestItem,
    fssaiNumber,
    address,
    city,
    state,
    pincode,
    openingTime,
    description,
    offer,
  } = req.body

  if (!name?.trim() || !ownerName?.trim() || !speciality?.trim() || !bestItem?.trim()) {
    return res.status(400).json({ message: "Kitchen name, owner name, speciality, and signature dish are required" })
  }

  if (!phone?.trim() || phone.trim().length !== 10) {
    return res.status(400).json({ message: "Phone number must be 10 digits" })
  }

  if (!address?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
    return res.status(400).json({ message: "Full address is required" })
  }

  if (pincode.trim().length !== 6) {
    return res.status(400).json({ message: "Pincode must be 6 digits" })
  }

  const [kitchenRows] = await pool.query(
    "SELECT fssai_license FROM kitchens WHERE user_id = ?",
    [req.user.id]
  )
  const hasFssaiLicense = Boolean(kitchenRows[0]?.fssai_license)
  if (
    !hasFssaiLicense &&
    (!fssaiNumber?.trim() || fssaiNumber.trim().length < 10)
  ) {
    return res.status(400).json({ message: "Upload a valid FSSAI license or enter license number" })
  }

  if (!openingTime?.trim() || !description?.trim()) {
    return res.status(400).json({ message: "Operating hours and description are required" })
  }

  const validTypes = ["veg", "non_veg", "both"]
  if (!validTypes.includes(kitchenType)) {
    return res.status(400).json({ message: "Invalid kitchen type" })
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [existing] = await connection.query("SELECT id FROM kitchens WHERE user_id = ?", [req.user.id])
    if (existing.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const [phoneConflict] = await connection.query(
      "SELECT id FROM users WHERE phone = ? AND role = 'kitchen' AND id != ?",
      [phone.trim(), req.user.id]
    )
    if (phoneConflict.length > 0) {
      await connection.rollback()
      return res.status(409).json({ message: "Phone number already registered for another kitchen" })
    }

    await connection.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [ownerName.trim(), phone.trim(), req.user.id]
    )

    await connection.query(
      `UPDATE kitchens SET
        name = ?, owner_name = ?, phone = ?, speciality = ?, kitchen_type = ?,
        best_item = ?, fssai_number = ?, address = ?, city = ?, state = ?,
        pincode = ?, opening_time = ?, description = ?, offer = ?
       WHERE user_id = ?`,
      [
        name.trim(),
        ownerName.trim(),
        phone.trim(),
        speciality.trim(),
        kitchenType,
        bestItem.trim(),
        fssaiNumber?.trim() || null,
        address.trim(),
        city.trim(),
        state.trim(),
        pincode.trim(),
        openingTime.trim(),
        description.trim(),
        offer?.trim() || null,
        req.user.id,
      ]
    )

    await connection.commit()

    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
      [req.user.id]
    )

    const [users] = await pool.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [req.user.id]
    )

    res.json({
      message: "Profile updated successfully",
      kitchen: formatKitchen(rows[0]),
      user: users[0],
    })
  } catch (error) {
    await connection.rollback()
    console.error("Kitchen profile update error:", error)
    res.status(500).json({ message: "Failed to update profile" })
  } finally {
    connection.release()
  }
})

router.patch("/me/status", authRequired, requireRole("kitchen"), async (req, res) => {
  const { isActive, isFreshFoodActive, isGroceryActive } = req.body

  try {
    const [result] = await pool.query(
      `UPDATE kitchens 
       SET 
         is_active = COALESCE(?, is_active), 
         is_fresh_food_active = COALESCE(?, is_fresh_food_active), 
         is_grocery_active = COALESCE(?, is_grocery_active) 
       WHERE user_id = ?`,
      [
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        isFreshFoodActive !== undefined ? (isFreshFoodActive ? 1 : 0) : null,
        isGroceryActive !== undefined ? (isGroceryActive ? 1 : 0) : null,
        req.user.id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
      [req.user.id]
    )

    res.json({ message: "Status updated successfully", kitchen: formatKitchen(rows[0]) })
  } catch (error) {
    console.error("Kitchen status update error:", error)
    res.status(500).json({ message: "Failed to update status" })
  }
})

router.get("/featured", async (req, res) => {
  try {
    const city = req.query.city?.toString().trim() || null
    let query = `SELECT k.id, k.name, k.owner_name, k.speciality, k.image, k.cover_image, k.rating, k.delivery_time,
              k.hygiene_score, k.offer, k.best_item, k.city, k.state, k.kitchen_type, k.status, k.is_featured, k.featured_order, k.reviewed_at, k.visibility_status, k.is_active,
              k.festival_offer_enabled, k.festival_offer_title, k.festival_offer_category, k.festival_offer_discount_percent, k.festival_offer_start_date, k.festival_offer_end_date, k.festival_offer_description, k.festival_offer_image, k.festival_offer_image_2,
              ${SQL_RATING_COUNT}
       FROM kitchens k
       WHERE k.status = 'approved' AND k.is_active = 1 AND k.is_featured = 1`
    const params = []
    if (city) {
      query += ` AND LOWER(TRIM(k.city)) = LOWER(TRIM(?))`
      params.push(city)
    }
    query += ` ORDER BY k.featured_order ASC, k.submitted_at DESC`

    const [rows] = await pool.query(query, params)
    const visible = []
    for (const row of rows) {
      if (await isKitchenPubliclyVisible(pool, row)) visible.push(row)
    }
    res.json({ kitchens: withPublicRatings(formatKitchens(visible)) })
  } catch (error) {
    console.error("Featured kitchens error:", error)
    res.status(500).json({ message: "Failed to fetch featured kitchens" })
  }
})

router.get("/", async (req, res) => {
  try {
    const city = req.query.city?.toString().trim() || null
    let query = `SELECT k.id, k.name, k.owner_name, k.speciality, k.image, k.cover_image, k.rating, k.delivery_time,
              k.hygiene_score, k.offer, k.best_item, k.city, k.state, k.kitchen_type, k.status, k.reviewed_at, k.visibility_status, k.is_active,
              k.festival_offer_enabled, k.festival_offer_title, k.festival_offer_category, k.festival_offer_discount_percent, k.festival_offer_start_date, k.festival_offer_end_date, k.festival_offer_description, k.festival_offer_image, k.festival_offer_image_2,
              ${SQL_RATING_COUNT}
       FROM kitchens k
       WHERE k.status = 'approved' AND k.is_active = 1`
    const params = []
    if (city) {
      query += ` AND LOWER(TRIM(k.city)) = LOWER(TRIM(?))`
      params.push(city)
    }
    query += ` ORDER BY k.submitted_at DESC`

    const [rows] = await pool.query(query, params)
    const visible = []
    for (const row of rows) {
      if (await isKitchenPubliclyVisible(pool, row)) visible.push(row)
    }
    res.json({ kitchens: withPublicRatings(formatKitchens(visible)) })
  } catch (error) {
    console.error("Public kitchens error:", error)
    res.status(500).json({ message: "Failed to fetch kitchens" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.id, k.name, k.owner_name, k.phone, k.speciality, k.description, k.image, k.cover_image, k.rating,
              k.delivery_time, k.hygiene_score, k.offer, k.best_item, k.city, k.state, k.address, k.pincode, k.status, k.reviewed_at, k.visibility_status, k.is_active,
              k.is_fresh_food_active, k.is_grocery_active,
              k.festival_offer_enabled, k.festival_offer_title, k.festival_offer_category, k.festival_offer_discount_percent, k.festival_offer_start_date, k.festival_offer_end_date, k.festival_offer_description, k.festival_offer_image, k.festival_offer_image_2,
              ${SQL_RATING_COUNT}
       FROM kitchens k
       WHERE k.id = ? AND k.status = 'approved' AND k.is_active = 1`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const visible = await isKitchenPubliclyVisible(pool, rows[0])
    if (!visible) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const { compliant } = await getHygieneCompliance(pool, rows[0].id)

    res.json({
      kitchen: withPublicRating(formatKitchen(rows[0])),
      hygieneCompliant: compliant,
    })
  } catch (error) {
    console.error("Kitchen detail error:", error)
    res.status(500).json({ message: "Failed to fetch kitchen" })
  }
})

export default router
