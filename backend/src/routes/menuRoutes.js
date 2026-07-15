import { Router } from "express"

import pool from "../config/db.js"

import { authRequired, requireRole } from "../middleware/auth.js"

import { requireApprovedKitchen } from "../middleware/kitchen.js"

import { menuUpload, getPublicFileUrl, isImageMime, isVideoMime } from "../middleware/upload.js"

import { formatMenuItem, normalizeMediaPayload } from "../utils/menuItem.js"
import { normalizePublicUrl } from "../utils/mediaUrl.js"

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

    const { name, description, price, category, itemType, offer, isCombo, items } = req.body

    const media = normalizeMediaPayload(req.body)



    if (!name?.trim() || price === undefined || price === "") {

      return res.status(400).json({ message: "Name and price are required" })

    }



    if (Number(price) <= 0) {

      return res.status(400).json({ message: "Price must be greater than 0" })

    }



    const connection = await pool.getConnection()

    try {

      await connection.beginTransaction()



      const [result] = await connection.query(

        `INSERT INTO menu_items (kitchen_id, name, description, price, offer, category, item_type, image, images, videos, is_combo)

         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

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

    const { name, description, price, category, itemType, isAvailable, offer, isCombo, items } = req.body



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



      const connection = await pool.getConnection()

      try {

        await connection.beginTransaction()



        await connection.query(

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

            is_available = COALESCE(?, is_available),

            is_combo = COALESCE(?, is_combo)${resetApproval ? ", approval_status = 'pending', reviewed_at = NULL, reviewed_by = NULL, review_comment = NULL" : ""}

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

    let query = "SELECT * FROM menu_items WHERE kitchen_id = ? AND is_available = TRUE AND approval_status = 'approved'"
    if (!isFreshActive) {
      query += " AND category = 'grocery'"
    } else if (!isGroceryActive) {
      query += " AND category = 'food'"
    }
    query += " ORDER BY category, name"

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

export default router


