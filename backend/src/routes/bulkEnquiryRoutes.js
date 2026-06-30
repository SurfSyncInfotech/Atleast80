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
    status: row.status,
    quotationFile: row.quotation_file || null,
    quotationAmount: row.quotation_amount != null ? Number(row.quotation_amount) : null,
    quotationNotes: row.quotation_notes || null,
    quotedAt: row.quoted_at || null,
    createdAt: row.created_at,
    customerName: row.customer_name || null,
    customerPhone: row.customer_phone || null,
    kitchenName: row.kitchen_name || null,
  }
}

router.post("/", authRequired, requireRole("customer"), async (req, res) => {
  const kitchenId = Number(req.body.kitchenId)
  const message = req.body.message?.toString().trim()
  const estimatedValue = Number(req.body.estimatedValue)

  if (!kitchenId || Number.isNaN(kitchenId)) {
    return res.status(400).json({ message: "Kitchen is required" })
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ message: "Describe your bulk order (at least 10 characters)" })
  }
  if (!estimatedValue || Number.isNaN(estimatedValue) || estimatedValue < MIN_BULK_VALUE) {
    return res.status(400).json({ message: `Minimum bulk order value is ₹${MIN_BULK_VALUE}` })
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
      `INSERT INTO bulk_order_enquiries (kitchen_id, customer_id, message, estimated_value)
       VALUES (?, ?, ?, ?)`,
      [kitchenId, req.user.id, message, estimatedValue]
    )

    res.status(201).json({
      message: "Enquiry sent to the kitchen. You'll see the quotation here once uploaded.",
      enquiry: {
        id: result.insertId,
        kitchenId,
        kitchenName: kitchens[0].name,
        message,
        estimatedValue,
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
        `SELECT e.*, u.name AS customer_name, u.phone AS customer_phone
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
      if (!req.file) {
        return res.status(400).json({ message: "Quotation file is required" })
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
          "SELECT id, kitchen_id, status FROM bulk_order_enquiries WHERE id = ?",
          [enquiryId]
        )
        if (rows.length === 0) {
          return res.status(404).json({ message: "Enquiry not found" })
        }
        if (rows[0].kitchen_id !== req.kitchenId) {
          return res.status(403).json({ message: "Not your enquiry" })
        }

        const fileUrl = getQuotationFileUrl(req, req.file.filename)

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
          message: "Quotation uploaded. The customer can view it in their enquiry chat.",
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
      if (rows[0].status !== "quoted") {
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

export default router
