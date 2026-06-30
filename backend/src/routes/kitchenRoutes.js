import { Router } from "express"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import {
  kitchenLogoUpload,
  kitchenCoverUpload,
  fssaiLicenseUpload,
  getKitchenLogoUrl,
  getKitchenFileUrl,
} from "../middleware/upload.js"
import { formatKitchen, formatKitchens } from "../utils/mediaUrl.js"
import { getHygieneCompliance } from "../utils/hygieneCompliance.js"

const router = Router()

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

router.get("/me", authRequired, requireRole("kitchen"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kitchens k
       JOIN users u ON u.id = k.user_id
       WHERE k.user_id = ?`,
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    res.json({ kitchen: formatKitchen(rows[0]) })
  } catch (error) {
    console.error("Kitchen me error:", error)
    res.status(500).json({ message: "Failed to fetch kitchen" })
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
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [phone.trim(), req.user.id]
    )
    if (phoneConflict.length > 0) {
      await connection.rollback()
      return res.status(409).json({ message: "Phone number already registered" })
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

router.get("/featured", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, owner_name, speciality, image, cover_image, rating, delivery_time,
              hygiene_score, offer, best_item, city, state, kitchen_type, status, is_featured, featured_order, reviewed_at
       FROM kitchens
       WHERE status = 'approved' AND is_featured = 1
       ORDER BY featured_order ASC, submitted_at DESC`
    )
    res.json({ kitchens: formatKitchens(rows) })
  } catch (error) {
    console.error("Featured kitchens error:", error)
    res.status(500).json({ message: "Failed to fetch featured kitchens" })
  }
})

router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, owner_name, speciality, image, cover_image, rating, delivery_time,
              hygiene_score, offer, best_item, city, state, kitchen_type, status, reviewed_at
       FROM kitchens
       WHERE status = 'approved'
       ORDER BY submitted_at DESC`
    )
    res.json({ kitchens: formatKitchens(rows) })
  } catch (error) {
    console.error("Public kitchens error:", error)
    res.status(500).json({ message: "Failed to fetch kitchens" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, owner_name, speciality, description, image, rating,
              delivery_time, hygiene_score, offer, best_item, city, status, reviewed_at
       FROM kitchens
       WHERE id = ? AND status = 'approved'`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const { compliant } = await getHygieneCompliance(pool, rows[0].id)

    res.json({
      kitchen: formatKitchen(rows[0]),
      hygieneCompliant: compliant,
    })
  } catch (error) {
    console.error("Kitchen detail error:", error)
    res.status(500).json({ message: "Failed to fetch kitchen" })
  }
})

export default router
