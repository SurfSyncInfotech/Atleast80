import { Router } from "express"

import pool from "../config/db.js"

import { authRequired, requireRole } from "../middleware/auth.js"

import { requireApprovedKitchen } from "../middleware/kitchen.js"

import { menuUpload, getPublicFileUrl, isImageMime, isVideoMime } from "../middleware/upload.js"

import { formatMenuItem, normalizeMediaPayload } from "../utils/menuItem.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"



const router = Router()



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

      res.json({ items: items.map(formatMenuItem) })

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

    const { name, description, price, category, itemType, offer } = req.body

    const media = normalizeMediaPayload(req.body)



    if (!name?.trim() || price === undefined || price === "") {

      return res.status(400).json({ message: "Name and price are required" })

    }



    if (Number(price) <= 0) {

      return res.status(400).json({ message: "Price must be greater than 0" })

    }



    try {

      const [result] = await pool.query(

        `INSERT INTO menu_items (kitchen_id, name, description, price, offer, category, item_type, image, images, videos)

         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

        [

          req.kitchenId,

          name.trim(),

          description?.trim() || null,

          Number(price),

          offer?.trim() || null,

          category === "grocery" ? "grocery" : "food",

          itemType === "non_veg" ? "non_veg" : "veg",

          media.image,

          JSON.stringify(media.images),

          JSON.stringify(media.videos),

        ]

      )



      const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [result.insertId])

      res.status(201).json({ message: "Menu item added", item: formatMenuItem(items[0]) })

    } catch (error) {

      console.error("Add menu item error:", error)

      res.status(500).json({ message: "Failed to add menu item" })

    }

  }

)



router.put(

  "/:id",

  authRequired,

  requireRole("kitchen"),

  requireApprovedKitchen,

  async (req, res) => {

    const { name, description, price, category, itemType, isAvailable, offer } = req.body



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

      const contentChanged =
        (name !== undefined && name?.trim() !== current.name) ||
        (description !== undefined && (description?.trim() || null) !== (current.description || null)) ||
        (price !== undefined && Number(price) !== Number(current.price)) ||
        (category !== undefined && category !== current.category) ||
        (itemType !== undefined && itemType !== current.item_type) ||
        hasMediaUpdate

      const resetApproval =
        contentChanged && (existing[0].approval_status === "approved" || existing[0].approval_status === "rejected")

      await pool.query(

        `UPDATE menu_items SET

          name = COALESCE(?, name),

          description = COALESCE(?, description),

          price = COALESCE(?, price),

          offer = ?,

          category = COALESCE(?, category),

          item_type = COALESCE(?, item_type),

          image = ?,

          images = ?,

          videos = ?,

          is_available = COALESCE(?, is_available)${resetApproval ? ", approval_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, review_comment = NULL" : ""}

         WHERE id = ? AND kitchen_id = ?`,

        [

          name?.trim(),

          description?.trim(),

          price !== undefined ? Number(price) : null,

          nextOffer,

          category,

          itemType,

          media.image,

          JSON.stringify(media.images),

          JSON.stringify(media.videos),

          isAvailable !== undefined ? Boolean(isAvailable) : null,

          req.params.id,

          req.kitchenId,

        ]

      )



      const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [req.params.id])

      res.json({ message: "Menu item updated", item: formatMenuItem(items[0]) })

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

      "SELECT id FROM kitchens WHERE id = ? AND status = 'approved'",

      [req.params.kitchenId]

    )



    if (kitchen.length === 0) {

      return res.status(404).json({ message: "Kitchen not found" })

    }



    const [items] = await pool.query(

      "SELECT * FROM menu_items WHERE kitchen_id = ? AND is_available = TRUE AND approval_status = 'approved' ORDER BY category, name",

      [req.params.kitchenId]

    )



    res.json({ items: items.map(formatMenuItem) })

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
       INNER JOIN kitchens k ON k.id = m.kitchen_id AND k.status = 'approved'
       WHERE m.approval_status = 'approved' AND m.is_available = TRUE
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit]
    )

    res.json({
      items: items.map((row) => ({
        ...formatMenuItem(row),
        kitchen_name: row.kitchen_name,
      })),
    })
  } catch (error) {
    console.error("Popular menu error:", error)
    res.status(500).json({ message: "Failed to fetch popular items" })
  }
})

export default router


