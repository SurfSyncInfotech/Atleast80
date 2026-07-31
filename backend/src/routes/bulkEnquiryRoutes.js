import { Router } from "express"
import fs from "fs"
import path from "path"
import pool from "../config/db.js"
import { authRequired, requireRole } from "../middleware/auth.js"
import { requireApprovedKitchen } from "../middleware/kitchen.js"
import { quotationUpload, getQuotationFileUrl, QUOTATION_UPLOADS_DIR } from "../middleware/upload.js"
const router = Router()
const MIN_BULK_VALUE = 2000

function deleteQuotationFile(fileUrl) {
  if (!fileUrl) return
  const marker = "/uploads/quotations/"
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return
  const filename = path.basename(fileUrl.slice(idx + marker.length).split("?")[0])
  if (!filename) return
  const filePath = path.join(QUOTATION_UPLOADS_DIR, filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
function mapEnquiryRow(row) {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    customerId: row.customer_id,
    message: row.message,
    estimatedValue: Number(row.estimated_value),
    peopleCount: row.people_count != null ? Number(row.people_count) : 1,
    status: row.status,
    quotationFile: row.quotation_file || null,
    quotationAmount: row.quotation_amount != null ? Number(row.quotation_amount) : null,
    quotationNotes: row.quotation_notes || null,
    quotedAt: row.quoted_at || null,
    createdAt: row.created_at,
    customerName: row.customer_name || null,
    customerPhone: row.customer_phone || null,
    kitchenName: row.kitchen_name || null,
    lastMessage: row.last_message || null,
    lastMessageSenderId: row.last_message_sender_id || null,
    messageCount: row.message_count || 0
  }
}

router.post("/", authRequired, requireRole("customer"), async (req, res) => {
  const kitchenId = Number(req.body.kitchenId)
  const message = req.body.message?.toString().trim()
  const estimatedValue = Number(req.body.estimatedValue)
  const peopleCount = Number(req.body.peopleCount) || 1

  if (!kitchenId || Number.isNaN(kitchenId)) {
    return res.status(400).json({ message: "Kitchen is required" })
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ message: "Describe what you need (at least 10 characters)" })
  }
  if (!estimatedValue || Number.isNaN(estimatedValue) || estimatedValue < 1) {
    return res.status(400).json({ message: "Please specify your offered price" })
  }
  if (!peopleCount || Number.isNaN(peopleCount) || peopleCount < 1) {
    return res.status(400).json({ message: "Please specify number of people" })
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
      return res.status(400).json({ message: "This kitchen is not accepting enquiries yet" })
    }

    const [result] = await pool.query(
      `INSERT INTO bulk_order_enquiries (kitchen_id, customer_id, message, estimated_value, people_count)
       VALUES (?, ?, ?, ?, ?)`,
      [kitchenId, req.user.id, message, estimatedValue, peopleCount]
    )

    res.status(201).json({
      message: "Enquiry sent to the kitchen. You'll see the quotation here once uploaded.",
      enquiry: {
        id: result.insertId,
        kitchenId,
        kitchenName: kitchens[0].name,
        message,
        estimatedValue,
        peopleCount,
        status: "pending",
      },
    })
  } catch (error) {
    console.error("Create bulk enquiry error:", error)
    res.status(500).json({ message: "Failed to submit enquiry" })
  }
})

router.get("/mine", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, k.name AS kitchen_name
       FROM bulk_order_enquiries e
       JOIN kitchens k ON k.id = e.kitchen_id
       WHERE e.customer_id = ?
       ORDER BY e.created_at DESC`,
      [req.user.id]
    )
    res.json({ enquiries: rows.map(mapEnquiryRow) })
  } catch (error) {
    console.error("List customer enquiries error:", error)
    res.status(500).json({ message: "Failed to load enquiries" })
  }
})

router.get("/kitchen/:kitchenId", authRequired, requireRole("customer"), async (req, res) => {
  const kitchenId = Number(req.params.kitchenId)
  if (!kitchenId) {
    return res.status(400).json({ message: "Invalid kitchen" })
  }

  try {
    const [rows] = await pool.query(
      `SELECT e.*, k.name AS kitchen_name
       FROM bulk_order_enquiries e
       JOIN kitchens k ON k.id = e.kitchen_id
       WHERE e.customer_id = ? AND e.kitchen_id = ?
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [req.user.id, kitchenId]
    )
    res.json({ enquiry: rows[0] ? mapEnquiryRow(rows[0]) : null })
  } catch (error) {
    console.error("Get kitchen enquiry error:", error)
    res.status(500).json({ message: "Failed to load enquiry" })
  }
})

router.get(
  "/partner",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT e.*, u.name AS customer_name, u.phone AS customer_phone,
                (SELECT message FROM bulk_order_chat_messages WHERE enquiry_id = e.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT sender_id FROM bulk_order_chat_messages WHERE enquiry_id = e.id ORDER BY created_at DESC LIMIT 1) AS last_message_sender_id,
                (SELECT COUNT(*) FROM bulk_order_chat_messages WHERE enquiry_id = e.id) AS message_count
         FROM bulk_order_enquiries e
         JOIN users u ON u.id = e.customer_id
         WHERE e.kitchen_id = ?
         ORDER BY
           CASE e.status WHEN 'pending' THEN 0 ELSE 1 END,
           e.created_at DESC`,
        [req.kitchenId]
      )
      res.json({ enquiries: rows.map(mapEnquiryRow) })
    } catch (error) {
      console.error("List kitchen enquiries error:", error)
      res.status(500).json({ message: "Failed to load enquiries" })
    }
  }
)

router.post(
  "/:id/quotation",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  (req, res) => {
    quotationUpload.single("quotation")(req, res, async (uploadErr) => {
      if (uploadErr) {
        return res.status(400).json({ message: uploadErr.message || "Quotation upload failed" })
      }

      const enquiryId = Number(req.params.id)
      const quotationAmount = Number(req.body.quotationAmount)
      const quotationNotes = req.body.quotationNotes?.toString().trim() || null

      if (!enquiryId) {
        return res.status(400).json({ message: "Invalid enquiry" })
      }
      if (!quotationAmount || Number.isNaN(quotationAmount) || quotationAmount <= 0) {
        return res.status(400).json({ message: "Enter a valid quotation amount" })
      }

      try {
        const [rows] = await pool.query(
          "SELECT id, kitchen_id, status, quotation_file FROM bulk_order_enquiries WHERE id = ?",
          [enquiryId]
        )
        if (rows.length === 0) {
          return res.status(404).json({ message: "Enquiry not found" })
        }
        if (rows[0].kitchen_id !== req.kitchenId) {
          return res.status(403).json({ message: "Not your enquiry" })
        }

        const fileUrl = req.file ? getQuotationFileUrl(req, req.file.filename) : (rows[0].quotation_file || null)

        await pool.query(
          `UPDATE bulk_order_enquiries
           SET status = 'quoted',
               quotation_file = ?,
               quotation_amount = ?,
               quotation_notes = ?,
               quoted_at = NOW()
           WHERE id = ?`,
          [fileUrl, quotationAmount, quotationNotes, enquiryId]
        )

        res.json({
          message: "Quotation updated. The customer can view it in their enquiry chat.",
          enquiryId,
        })
      } catch (error) {
        console.error("Upload quotation error:", error)
        res.status(500).json({ message: "Failed to upload quotation" })
      }
    })
  }
)

router.delete(
  "/:id/quotation",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  async (req, res) => {
    const enquiryId = Number(req.params.id)
    if (!enquiryId) {
      return res.status(400).json({ message: "Invalid enquiry" })
    }

    try {
      const [rows] = await pool.query(
        "SELECT id, kitchen_id, quotation_file, status FROM bulk_order_enquiries WHERE id = ?",
        [enquiryId]
      )
      if (rows.length === 0) {
        return res.status(404).json({ message: "Enquiry not found" })
      }
      if (rows[0].kitchen_id !== req.kitchenId) {
        return res.status(403).json({ message: "Not your enquiry" })
      }
      if (rows[0].status === "pending") {
        return res.status(400).json({ message: "No quotation to delete" })
      }

      deleteQuotationFile(rows[0].quotation_file)

      await pool.query(
        `UPDATE bulk_order_enquiries
         SET status = 'pending',
             quotation_file = NULL,
             quotation_amount = NULL,
             quotation_notes = NULL,
             quoted_at = NULL
         WHERE id = ?`,
        [enquiryId]
      )

      res.json({ message: "Quotation deleted. You can upload a new one." })
    } catch (error) {
      console.error("Delete quotation error:", error)
      res.status(500).json({ message: "Failed to delete quotation" })
    }
  }
)

router.patch(
  "/:id/quotation-price",
  authRequired,
  requireRole("kitchen"),
  requireApprovedKitchen,
  async (req, res) => {
    const enquiryId = Number(req.params.id)
    const quotationAmount = Number(req.body.quotationAmount)
    const quotationNotes = req.body.quotationNotes?.toString().trim() || null

    if (!enquiryId) {
      return res.status(400).json({ message: "Invalid enquiry" })
    }
    if (!quotationAmount || Number.isNaN(quotationAmount) || quotationAmount <= 0) {
      return res.status(400).json({ message: "Enter a valid quotation amount" })
    }

    try {
      const [rows] = await pool.query(
        "SELECT id, kitchen_id FROM bulk_order_enquiries WHERE id = ?",
        [enquiryId]
      )
      if (rows.length === 0) {
        return res.status(404).json({ message: "Enquiry not found" })
      }
      if (rows[0].kitchen_id !== req.kitchenId) {
        return res.status(403).json({ message: "Not your enquiry" })
      }

      await pool.query(
        `UPDATE bulk_order_enquiries
         SET status = 'quoted',
             quotation_amount = ?,
             quotation_notes = COALESCE(?, quotation_notes),
             quoted_at = NOW()
         WHERE id = ?`,
        [quotationAmount, quotationNotes, enquiryId]
      )

      res.json({ message: "Quotation price updated successfully." })
    } catch (error) {
      console.error("Update quotation price error:", error)
      res.status(500).json({ message: "Failed to update quotation price" })
    }
  }
)

router.post("/:id/accept", authRequired, requireRole("customer"), async (req, res) => {
  const enquiryId = Number(req.params.id)
  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, customer_id, status FROM bulk_order_enquiries WHERE id = ?",
      [enquiryId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }
    if (rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to accept this quotation" })
    }
    if (rows[0].status !== "quoted" && rows[0].status !== "rejected") {
      return res.status(400).json({ message: "No quotation to accept" })
    }

    await pool.query(
      "UPDATE bulk_order_enquiries SET status = 'accepted' WHERE id = ?",
      [enquiryId]
    )

    res.json({ message: "Quotation accepted successfully." })
  } catch (error) {
    console.error("Accept quotation error:", error)
    res.status(500).json({ message: "Failed to accept quotation" })
  }
})

router.post("/:id/reject", authRequired, requireRole("customer"), async (req, res) => {
  const enquiryId = Number(req.params.id)
  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, customer_id, status FROM bulk_order_enquiries WHERE id = ?",
      [enquiryId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }
    if (rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to reject this quotation" })
    }
    if (rows[0].status !== "quoted" && rows[0].status !== "accepted") {
      return res.status(400).json({ message: "No quotation to reject" })
    }

    await pool.query(
      "UPDATE bulk_order_enquiries SET status = 'rejected' WHERE id = ?",
      [enquiryId]
    )

    res.json({ message: "Quotation rejected successfully." })
  } catch (error) {
    console.error("Reject quotation error:", error)
    res.status(500).json({ message: "Failed to reject quotation" })
  }
})

router.post("/:id/pay", authRequired, requireRole("customer"), async (req, res) => {
  const enquiryId = Number(req.params.id)
  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, customer_id, status, kitchen_id, quotation_amount, message FROM bulk_order_enquiries WHERE id = ?",
      [enquiryId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }
    const enquiry = rows[0]
    if (enquiry.customer_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to pay for this quotation" })
    }
    if (enquiry.status !== "accepted") {
      return res.status(400).json({ message: "Quotation must be accepted before payment" })
    }

    // 1. Fetch user delivery details
    const [users] = await pool.query(
      "SELECT address, city, pincode FROM users WHERE id = ?",
      [req.user.id]
    )
    const user = users[0] || {}
    const address = [user.address, user.city, user.pincode].filter(Boolean).join(", ") || "Address not set"

    // 2. Generate a unique bulk order number
    const suffix = Date.now().toString().slice(-6)
    const rand = Math.floor(Math.random() * 90 + 10)
    const orderNumber = `AT80-BULK-${suffix}${rand}`

    // 3. Begin Transaction
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // 4. Create the main order entry
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_number, user_id, kitchen_id, status, payment_method,
          packing_type, delivery_method, item_total, packing_fee, delivery_fee,
          grand_total, delivery_address
        ) VALUES (?, ?, ?, 'pending', 'online', 'standard', 'delivery', ?, 0.00, 0.00, ?, ?)`,
        [
          orderNumber,
          req.user.id,
          enquiry.kitchen_id,
          enquiry.quotation_amount,
          enquiry.quotation_amount,
          address
        ]
      )

      const orderId = orderResult.insertId

      // 5. Create the bulk order item detail entry
      const itemName = `Bulk Order: ${enquiry.message.slice(0, 50)}${enquiry.message.length > 50 ? "..." : ""}`
      await connection.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, price, qty, image)
         VALUES (?, NULL, ?, ?, 1, NULL)`,
        [orderId, itemName, enquiry.quotation_amount]
      )

      // 6. Complete the bulk enquiry status
      await connection.query(
        "UPDATE bulk_order_enquiries SET status = 'completed' WHERE id = ?",
        [enquiryId]
      )

      await connection.commit()
    } catch (txError) {
      await connection.rollback()
      throw txError;
    } finally {
      connection.release()
    }

    res.json({ message: "Payment successful. Order placed." })
  } catch (error) {
    console.error("Pay quotation error:", error)
    res.status(500).json({ message: "Failed to process payment" })
  }
})

router.delete("/:id", authRequired, requireRole("customer"), async (req, res) => {
  const enquiryId = Number(req.params.id)
  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry" })
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, customer_id, quotation_file FROM bulk_order_enquiries WHERE id = ?",
      [enquiryId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }
    if (rows[0].customer_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this enquiry" })
    }

    // Delete quotation file if any
    deleteQuotationFile(rows[0].quotation_file)

    // Delete enquiry
    await pool.query("DELETE FROM bulk_order_enquiries WHERE id = ?", [enquiryId])

    res.json({ message: "Enquiry deleted successfully." })
  } catch (error) {
    console.error("Delete enquiry error:", error)
    res.status(500).json({ message: "Failed to delete enquiry" })
  }
})

// GET chat history for an enquiry
router.get("/:id/chat", authRequired, async (req, res) => {
  const enquiryId = Number(req.params.id)
  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry ID" })
  }

  try {
    // Verify that the user is either the customer or the kitchen owner of this enquiry
    const [enquiries] = await pool.query(
      `SELECT e.id, e.customer_id, k.user_id AS kitchen_user_id
       FROM bulk_order_enquiries e
       JOIN kitchens k ON k.id = e.kitchen_id
       WHERE e.id = ?`,
      [enquiryId]
    )

    if (enquiries.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }

    const enq = enquiries[0]
    if (req.user.id !== enq.customer_id && req.user.id !== enq.kitchen_user_id) {
      return res.status(403).json({ message: "Not authorized to access this chat" })
    }

    const [messages] = await pool.query(
      `SELECT m.id, m.enquiry_id, m.sender_id, m.message, m.created_at, u.name AS sender_name, u.role AS sender_role
       FROM bulk_order_chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.enquiry_id = ?
       ORDER BY m.created_at ASC`,
      [enquiryId]
    )

    res.json({ messages })
  } catch (error) {
    console.error("Get enquiry chat error:", error)
    res.status(500).json({ message: "Failed to fetch chat messages" })
  }
})

// POST a chat message for an enquiry
router.post("/:id/chat", authRequired, async (req, res) => {
  const enquiryId = Number(req.params.id)
  const message = req.body.message?.toString().trim()

  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry ID" })
  }
  if (!message) {
    return res.status(400).json({ message: "Message is required" })
  }

  try {
    // Verify auth permission
    const [enquiries] = await pool.query(
      `SELECT e.id, e.customer_id, k.user_id AS kitchen_user_id
       FROM bulk_order_enquiries e
       JOIN kitchens k ON k.id = e.kitchen_id
       WHERE e.id = ?`,
      [enquiryId]
    )

    if (enquiries.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" })
    }

    const enq = enquiries[0]
    if (req.user.id !== enq.customer_id && req.user.id !== enq.kitchen_user_id) {
      return res.status(403).json({ message: "Not authorized to post to this chat" })
    }

    const [result] = await pool.query(
      "INSERT INTO bulk_order_chat_messages (enquiry_id, sender_id, message) VALUES (?, ?, ?)",
      [enquiryId, req.user.id, message]
    )

    res.status(201).json({
      message: "Message sent",
      chatMessage: {
        id: result.insertId,
        enquiry_id: enquiryId,
        sender_id: req.user.id,
        message,
        created_at: new Date().toISOString(),
        sender_name: req.user.name,
        sender_role: req.user.role,
      },
    })
  } catch (error) {
    console.error("Post enquiry chat error:", error)
    res.status(500).json({ message: "Failed to send chat message" })
  }
})

export default router
