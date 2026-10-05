import { Router } from "express"

import pool from "../config/db.js"

import { authRequired, requireRole } from "../middleware/auth.js"

import { requireApprovedKitchen } from "../middleware/kitchen.js"

import { menuUpload, getPublicFileUrl, isImageMime, isVideoMime } from "../middleware/upload.js"

import { formatMenuItem, normalizeMediaPayload } from "../utils/menuItem.js"
import { normalizePublicUrl, getActiveFestivalOffer } from "../utils/mediaUrl.js"

const router = Router()

async function populateComboItems(items) {
  const formattedItems = items.map(formatMenuItem)
  for (const item of formattedItems) {
    if (item.is_combo) {
      const [links] = await pool.query(
        `SELECT ci.quantity, m.* 
         FROM combo_items ci
         INNER JOIN menu_items m ON m.id = ci.item_id
         WHERE ci.combo_id = ?`,
        [item.id]
      )
      item.comboItems = links.map(formatMenuItem)
    }
  }
  return formattedItems
}



router.post(

  "/upload",

  authRequired,

  requireRole("kitchen"),

  requireApprovedKitchen,

  (req, res) => {

    menuUpload.array("files", 15)(req, res, (err) => {

      if (err) {

        return res.status(400).json({ message: err.message || "Upload failed" })

      }



      const images = []

      const videos = []



      for (const file of req.files || []) {

        const url = getPublicFileUrl(req, file.filename)

        if (isImageMime(file.mimetype)) images.push(normalizePublicUrl(url))

        else if (isVideoMime(file.mimetype)) videos.push(normalizePublicUrl(url))

      }



      res.json({ images, videos })

    })

  }

)



router.get(

  "/me",

  authRequired,

  requireRole("kitchen"),

  requireApprovedKitchen,

  async (req, res) => {

    try {

      const [items] = await pool.query(

        "SELECT * FROM menu_items WHERE kitchen_id = ? ORDER BY created_at DESC",

        [req.kitchenId]

      )

      res.json({ items: await populateComboItems(items) })

    } catch (error) {

      console.error("Menu me error:", error)

      res.status(500).json({ message: "Failed to fetch menu" })

    }

  }

)



router.post(
  "/",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  async (req, res) => {
    const { name, localName, local_name, description, price, category, itemType, offer, isCombo, items, gstRate, gst_rate, packagingType, packaging_type } = req.body
    const media = normalizeMediaPayload(req.body)

    if (!name?.trim() || price === undefined || price === "") {
      return res.status(400).json({ message: "Name and price are required" })
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" })
    }

    const assignedPackagingType = packagingType || packaging_type || (category === "grocery" ? "packaged" : "packaged")
    const defaultGst = category === "grocery" ? (assignedPackagingType === "loose" ? 0 : 5) : 5
    const assignedGstRate = gstRate !== undefined ? Number(gstRate) : (gst_rate !== undefined ? Number(gst_rate) : defaultGst)
    const assignedLocalName = (localName || local_name)?.trim() || null

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const [result] = await connection.query(
        `INSERT INTO menu_items (kitchen_id, name, local_name, description, price, offer, category, item_type, packaging_type, gst_rate, image, images, videos, is_combo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.kitchenId,
          name.trim(),
          assignedLocalName,
          description?.trim() || null,
          Number(price),
          offer?.trim() || null,
          category === "grocery" ? "grocery" : "food",
          itemType === "non_veg" ? "non_veg" : "veg",
          assignedPackagingType === "loose" ? "loose" : "packaged",
          assignedGstRate,
          media.image,
          JSON.stringify(media.images),
          JSON.stringify(media.videos),
          isCombo ? 1 : 0,
        ]
      )

      const comboId = result.insertId

      if (isCombo && Array.isArray(items)) {
        for (const item of items) {
          await connection.query(
            "INSERT INTO combo_items (combo_id, item_id, quantity) VALUES (?, ?, ?)",
            [comboId, item.id, Number(item.quantity) || 1]
          )
        }
      }

      await connection.commit()

      const [dbItems] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [comboId])
      const populated = await populateComboItems(dbItems)

      res.status(201).json({ message: "Menu item added", item: populated[0] })
    } catch (error) {
      await connection.rollback()
      console.error("Add menu item error:", error)
      res.status(500).json({ message: "Failed to add menu item" })
    } finally {
      connection.release()
    }
  }
)

router.put(
  "/:id",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  async (req, res) => {
    const { name, localName, local_name, description, price, category, itemType, isAvailable, is_available, offer, isCombo, items, gstRate, gst_rate, packagingType, packaging_type } = req.body

    try {
      const [existing] = await pool.query(
        "SELECT * FROM menu_items WHERE id = ? AND kitchen_id = ?",
        [req.params.id, req.kitchenId]
      )

      if (existing.length === 0) {
        return res.status(404).json({ message: "Menu item not found" })
      }

      const current = formatMenuItem(existing[0])
      const hasMediaUpdate = req.body.images !== undefined || req.body.videos !== undefined || req.body.image !== undefined
      const media = hasMediaUpdate ? normalizeMediaPayload(req.body) : current

      const nextOffer =
        offer !== undefined ? (offer?.trim() || null) : current.offer

      const nextPackagingType = packagingType || packaging_type || null
      let nextGstRate = gstRate !== undefined ? Number(gstRate) : (gst_rate !== undefined ? Number(gst_rate) : null)
      if (nextGstRate === null && (packagingType !== undefined || category !== undefined)) {
        const effCat = category !== undefined ? category : current.category
        const effPkg = nextPackagingType || current.packaging_type
        if (effCat === "grocery") {
          nextGstRate = effPkg === "loose" ? 0 : 5
        } else {
          nextGstRate = 5
        }
      }
      const nextLocalName = localName !== undefined ? (localName?.trim() || null) : (local_name !== undefined ? (local_name?.trim() || null) : null)

      const contentChanged =
        (name !== undefined && name?.trim() !== current.name) ||
        (localName !== undefined && (localName?.trim() || null) !== (current.local_name || null)) ||
        (description !== undefined && (description?.trim() || null) !== (current.description || null)) ||
        (price !== undefined && Number(price) !== Number(current.price)) ||
        (category !== undefined && category !== current.category) ||
        (itemType !== undefined && itemType !== current.item_type) ||
        (packagingType !== undefined && packagingType !== current.packaging_type) ||
        (gstRate !== undefined && Number(gstRate) !== Number(current.gst_rate)) ||
        hasMediaUpdate

      const resetApproval =
        contentChanged && (existing[0].approval_status === "approved" || existing[0].approval_status === "rejected")

      const reqAvail = isAvailable !== undefined ? isAvailable : is_available
      const nextAvail = reqAvail !== undefined ? (reqAvail ? 1 : 0) : null

      const connection = await pool.getConnection()
      try {
        await connection.beginTransaction()

        await connection.query(
          `UPDATE menu_items SET
            name = COALESCE(?, name),
            local_name = COALESCE(?, local_name),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            offer = ?,
            category = COALESCE(?, category),
            item_type = COALESCE(?, item_type),
            packaging_type = COALESCE(?, packaging_type),
            gst_rate = COALESCE(?, gst_rate),
            image = ?,
            images = ?,
            videos = ?,
            is_available = COALESCE(?, is_available),
            is_combo = COALESCE(?, is_combo)${resetApproval ? ", approval_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, review_comment = NULL" : ""}
           WHERE id = ? AND kitchen_id = ?`,
          [
            name?.trim(),
            nextLocalName,
            description?.trim(),
            price !== undefined ? Number(price) : null,
            nextOffer,
            category,
            itemType,
            nextPackagingType,
            nextGstRate,
            media.image,
            JSON.stringify(media.images),
            JSON.stringify(media.videos),
            nextAvail,
            isCombo !== undefined ? (isCombo ? 1 : 0) : null,
            req.params.id,
            req.kitchenId,
          ]
        )



        if (isCombo !== undefined && Array.isArray(items)) {

          await connection.query("DELETE FROM combo_items WHERE combo_id = ?", [req.params.id])

          if (isCombo) {

            for (const item of items) {

              await connection.query(

                "INSERT INTO combo_items (combo_id, item_id, quantity) VALUES (?, ?, ?)",

                [req.params.id, item.id, Number(item.quantity) || 1]

              )

            }

          }

        }



        await connection.commit()



        const [dbItems] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [req.params.id])

        const populated = await populateComboItems(dbItems)



        res.json({ message: "Menu item updated", item: populated[0] })

      } catch (err) {

        await connection.rollback()

        throw err

      } finally {

        connection.release()

      }

    } catch (error) {

      console.error("Update menu item error:", error)

      res.status(500).json({ message: "Failed to update menu item" })

    }

  }

)



router.delete(

  "/:id",

  authRequired,

  requireRole("kitchen"),

  requireApprovedKitchen,

  async (req, res) => {

    try {

      const [result] = await pool.query(

        "DELETE FROM menu_items WHERE id = ? AND kitchen_id = ?",

        [req.params.id, req.kitchenId]

      )



      if (result.affectedRows === 0) {

        return res.status(404).json({ message: "Menu item not found" })

      }



      res.json({ message: "Menu item deleted" })

    } catch (error) {

      console.error("Delete menu item error:", error)

      res.status(500).json({ message: "Failed to delete menu item" })

    }

  }

)



router.get("/kitchen/:kitchenId", async (req, res) => {
  try {
    const [kitchen] = await pool.query(
      "SELECT id, is_active, is_fresh_food_active, is_grocery_active FROM kitchens WHERE id = ? AND status = 'approved'",
      [req.params.kitchenId]
    )

    if (kitchen.length === 0 || kitchen[0].is_active === 0) {
      return res.status(404).json({ message: "Kitchen not found" })
    }

    const isFreshActive = kitchen[0].is_fresh_food_active === 1
    const isGroceryActive = kitchen[0].is_grocery_active === 1

    if (!isFreshActive && !isGroceryActive) {
      return res.json({ items: [] })
    }

    let query = "SELECT * FROM menu_items WHERE kitchen_id = ? AND approval_status = 'approved'"
    if (!isFreshActive) {
      query += " AND category = 'grocery'"
    } else if (!isGroceryActive) {
      query += " AND category = 'food'"
    }
    query += " ORDER BY is_available DESC, category, name"

    const [items] = await pool.query(query, [req.params.kitchenId])

    res.json({ items: await populateComboItems(items) })

  } catch (error) {

    console.error("Public menu error:", error)

    res.status(500).json({ message: "Failed to fetch menu" })

  }

})

router.get("/popular", async (req, res) => {
  const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 8))

  try {
    const [items] = await pool.query(
      `SELECT m.*, k.name AS kitchen_name
       FROM menu_items m
       INNER JOIN kitchens k ON k.id = m.kitchen_id AND k.status = 'approved' AND k.is_active = 1
       WHERE m.approval_status = 'approved' AND m.is_available = TRUE
         AND (
           (k.is_fresh_food_active = 1 AND m.category = 'food') OR
           (k.is_grocery_active = 1 AND m.category = 'grocery')
         )
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit]
    )

    const populated = await populateComboItems(items)
    res.json({
      items: populated.map((row, idx) => ({
        ...row,
        kitchen_name: items[idx].kitchen_name,
      })),
    })
  } catch (error) {
    console.error("Popular menu error:", error)
    res.status(500).json({ message: "Failed to fetch popular items" })
  }
})

router.post("/check-availability", async (req, res) => {
  try {
    const rawIds = req.body.itemIds || (Array.isArray(req.body.items) ? req.body.items.map((i) => i.id || i.menuItemId) : [])
    const itemIds = Array.isArray(rawIds)
      ? rawIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
      : []

    if (itemIds.length === 0) {
      return res.json({ availability: {}, kitchenOffers: {}, updatedItems: {}, items: [] })
    }

    const [rows] = await pool.query(
      `SELECT m.id, m.name, m.price, m.is_available, m.approval_status, m.kitchen_id,
              k.is_active AS kitchen_active, k.status AS kitchen_status,
              k.is_fresh_food_active, k.is_grocery_active, m.category,
              k.festival_offer_enabled, k.festival_offer_title, k.festival_offer_category,
              k.festival_offer_discount_percent, k.festival_offer_start_date, k.festival_offer_end_date,
              k.festival_offer_image, k.festival_offer_image_2, k.festival_offer_description
       FROM menu_items m
       LEFT JOIN kitchens k ON k.id = m.kitchen_id
       WHERE m.id IN (?)`,
      [itemIds]
    )

    const availability = {}
    const kitchenOffers = {}
    const updatedItems = {}

    for (const id of itemIds) {
      availability[id] = false
    }

    for (const row of rows) {
      const isKitchenApproved = row.kitchen_status === "approved"
      const isKitchenActive = row.kitchen_active === 1 || row.kitchen_active === true
      const isFreshFoodActive = row.is_fresh_food_active === 1 || row.is_fresh_food_active === true || row.is_fresh_food_active === null || row.is_fresh_food_active === undefined
      const isGroceryActive = row.is_grocery_active === 1 || row.is_grocery_active === true || row.is_grocery_active === null || row.is_grocery_active === undefined
      const isCategoryActive = row.category === "grocery" ? isGroceryActive : isFreshFoodActive
      const isKitchenOpen = isKitchenApproved && isKitchenActive && isCategoryActive

      const isItemAvailable =
        (row.is_available === 1 || row.is_available === true) &&
        row.approval_status === "approved" &&
        Boolean(isKitchenOpen)

      availability[row.id] = Boolean(isItemAvailable)

      if (row.kitchen_id && kitchenOffers[row.kitchen_id] === undefined) {
        kitchenOffers[row.kitchen_id] = getActiveFestivalOffer(row)
      }

      const activeOffer = kitchenOffers[row.kitchen_id] || null
      const percent = activeOffer ? Number(activeOffer.discountPercent || 0) : 0
      const isOfferEligible = activeOffer && percent > 0 && (
        activeOffer.category === "both" ||
        (activeOffer.category === "food" && row.category === "food") ||
        (activeOffer.category === "grocery" && row.category === "grocery")
      )

      const basePrice = Number(row.price || 0)
      const offerPrice = isOfferEligible ? Number((basePrice * (1 - percent / 100)).toFixed(2)) : null

      updatedItems[row.id] = {
        id: row.id,
        price: basePrice,
        offerPrice: offerPrice,
        discountPercent: isOfferEligible ? percent : 0,
        isOfferActive: Boolean(isOfferEligible),
        offerTitle: isOfferEligible ? activeOffer.title : null,
      }
    }

    res.json({ availability, kitchenOffers, updatedItems, items: rows })
  } catch (error) {
    console.error("Check availability error:", error)
    res.status(500).json({ message: "Failed to check availability" })
  }
})

export default router


