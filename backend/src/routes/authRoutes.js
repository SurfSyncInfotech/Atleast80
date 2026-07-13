import { Router } from "express"
import bcrypt from "bcryptjs"
import pool from "../config/db.js"
import { signToken, authRequired, requireRole } from "../middleware/auth.js"
import { fssaiLicenseUpload, getKitchenFileUrl } from "../middleware/upload.js"
import {
  createAndSendOtp,
  getDemoOtp,
  checkOtp,
  consumeOtp,
} from "../utils/otpStore.js"
import { normalizeIndianPhone, validateIndianPhone } from "../utils/phone.js"

const router = Router()

function customerUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address || null,
    city: row.city || null,
    pincode: row.pincode || null,
    role: "customer",
  }
}

router.get("/me", authRequired, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, name, email, phone, role, address, city, pincode FROM users WHERE id = ?",
      [req.user.id]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Session expired" })
    }

    const user = users[0]
    let kitchen = null

    if (user.role === "kitchen") {
      const [rows] = await pool.query(
        "SELECT * FROM kitchens WHERE user_id = ?",
        [user.id]
      )
      kitchen = rows[0] || null
    }

    res.json({ user, kitchen })
  } catch (error) {
    console.error("Auth me error:", error)
    res.status(500).json({ message: "Failed to verify session" })
  }
})

router.post("/customer/register", async (req, res) => {
  const name = req.body.name?.toString().trim()
  const email = req.body.email?.toString().trim().toLowerCase()
  const phone = normalizeIndianPhone(req.body.phone)
  const password = req.body.password?.toString() || ""

  if (!name || name.length < 2) {
    return res.status(400).json({ message: "Enter your full name" })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" })
  }
  const phoneError = validateIndianPhone(phone)
  if (phoneError) {
    return res.status(400).json({ message: phoneError })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" })
  }

  try {
    const [existingEmail] = await pool.query("SELECT id FROM users WHERE email = ?", [email])
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: "Email already registered" })
    }

    const [existingPhone] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone])
    if (existingPhone.length > 0) {
      return res.status(409).json({ message: "Phone number already registered" })
    }

    const hash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      "INSERT INTO users (role, name, email, phone, password_hash, phone_verified) VALUES ('customer', ?, ?, ?, ?, 0)",
      [name, email, phone, hash]
    )

    const userId = result.insertId
    const token = signToken({ id: userId, role: "customer" })
    const user = { id: userId, name, email, phone, address: null, city: null, pincode: null, role: "customer" }

    res.status(201).json({
      message: "Account created successfully",
      token,
      user,
    })
  } catch (error) {
    console.error("Customer register error:", error)
    res.status(500).json({ message: "Registration failed" })
  }
})

router.post("/customer/login", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND role = 'customer'",
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]
    if (!user.password_hash) {
      return res.status(401).json({ message: "Please reset your password to continue" })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (!user.phone_verified) {
      const phone = user.phone
      const phoneError = phone ? validateIndianPhone(phone) : "No phone number on account"
      if (phoneError) {
        return res.status(400).json({ message: phoneError })
      }

      await createAndSendOtp(`login:${user.id}`, phone)

      const payload = {
        requiresOtp: true,
        message: "OTP sent to your registered phone number",
        phoneHint: `******${phone.slice(-4)}`,
      }
      const demoOtp = getDemoOtp()
      if (demoOtp) payload.demoOtp = demoOtp

      return res.json(payload)
    }

    const token = signToken({ id: user.id, role: "customer" })

    res.json({
      message: "Login successful",
      token,
      user: customerUser(user),
    })
  } catch (error) {
    console.error("Customer login error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

router.post("/customer/login/verify-otp", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""
  const otp = req.body.otp?.toString().trim()

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }
  if (!otp || otp.length !== 4) {
    return res.status(400).json({ message: "Enter the 4-digit OTP" })
  }

  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND role = 'customer'",
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]
    if (!user.password_hash) {
      return res.status(401).json({ message: "Please reset your password to continue" })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (!checkOtp(`login:${user.id}`, otp)) {
      return res.status(401).json({ message: "Invalid or expired OTP" })
    }

    consumeOtp(`login:${user.id}`)
    await pool.query("UPDATE users SET phone_verified = 1 WHERE id = ?", [user.id])
    user.phone_verified = 1

    const token = signToken({ id: user.id, role: "customer" })

    res.json({
      message: "Login successful",
      token,
      user: customerUser(user),
    })
  } catch (error) {
    console.error("Customer login verify OTP error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

router.post("/customer/forgot-password/send-otp", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()

  if (!email) {
    return res.status(400).json({ message: "Email is required" })
  }

  try {
    const [users] = await pool.query(
      "SELECT id, phone FROM users WHERE email = ? AND role = 'customer'",
      [email]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: "No customer account found with this email" })
    }

    const phone = users[0].phone
    if (!phone) {
      return res.status(400).json({ message: "No phone number linked to this account" })
    }

    await createAndSendOtp(`reset:${phone}`, phone)

    const payload = {
      message: "OTP sent to your registered phone number",
      phoneHint: `******${phone.slice(-4)}`,
    }
    const demoOtp = getDemoOtp()
    if (demoOtp) payload.demoOtp = demoOtp

    res.json(payload)
  } catch (error) {
    console.error("Forgot password OTP error:", error)
    res.status(500).json({ message: "Failed to send OTP" })
  }
})

router.post("/customer/forgot-password/reset", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()
  const otp = req.body.otp?.toString().trim()
  const password = req.body.password?.toString() || ""

  if (!email || !otp || otp.length !== 4) {
    return res.status(400).json({ message: "Email and 4-digit OTP are required" })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" })
  }

  try {
    const [users] = await pool.query(
      "SELECT id, phone FROM users WHERE email = ? AND role = 'customer'",
      [email]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: "Account not found" })
    }

    const phone = users[0].phone
    if (!checkOtp(`reset:${phone}`, otp)) {
      return res.status(401).json({ message: "Invalid or expired OTP" })
    }

    const hash = await bcrypt.hash(password, 10)
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, users[0].id])
    consumeOtp(`reset:${phone}`)

    res.json({ message: "Password updated successfully. You can log in now." })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Failed to reset password" })
  }
})

router.patch("/customer/profile", authRequired, requireRole("customer"), async (req, res) => {
  const name = req.body.name?.toString().trim()
  const email = req.body.email?.toString().trim().toLowerCase()
  const phone = normalizeIndianPhone(req.body.phone)
  const address = req.body.address?.toString().trim() || null
  const city = req.body.city?.toString().trim() || null
  const pincode = req.body.pincode?.toString().replace(/\D/g, "") || null

  if (!name || name.length < 2) {
    return res.status(400).json({ message: "Name is required" })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Valid email is required" })
  }
  const phoneError = validateIndianPhone(phone)
  if (phoneError) {
    return res.status(400).json({ message: phoneError })
  }

  try {
    const [existingEmail] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, req.user.id]
    )
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: "Email already in use" })
    }

    const [existingPhone] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [phone, req.user.id]
    )
    if (existingPhone.length > 0) {
      return res.status(409).json({ message: "Phone number already in use" })
    }

    await pool.query(
      "UPDATE users SET name = ?, email = ?, phone = ?, address = ?, city = ?, pincode = ? WHERE id = ?",
      [name, email, phone, address, city, pincode, req.user.id]
    )

    const [users] = await pool.query(
      "SELECT id, name, email, phone, role, address, city, pincode FROM users WHERE id = ?",
      [req.user.id]
    )

    res.json({ message: "Profile updated", user: customerUser(users[0]) })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Failed to update profile" })
  }
})

const REQUIRED_FIELDS = [
  "name", "ownerName", "email", "phone", "password",
  "speciality", "kitchenType", "bestItem",
  "address", "city", "state", "pincode", "openingTime", "description",
]

router.post("/kitchen/register", (req, res) => {
  fssaiLicenseUpload.single("fssaiLicense")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || "FSSAI license upload failed" })
    }

    if (!req.file) {
      return res.status(400).json({ message: "FSSAI license document is required" })
    }

    const {
      name, ownerName, email, phone, password,
      speciality, kitchenType, bestItem,
      address, city, state, pincode, openingTime, description,
    } = req.body

    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]?.toString().trim())
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    if (phone.length !== 10) {
      return res.status(400).json({ message: "Phone number must be 10 digits" })
    }

    if (pincode.length !== 6) {
      return res.status(400).json({ message: "Pincode must be 6 digits" })
    }

    const validTypes = ["veg", "non_veg", "both"]
    if (!validTypes.includes(kitchenType)) {
      return res.status(400).json({ message: "Invalid kitchen type" })
    }

    const fssaiLicenseUrl = getKitchenFileUrl(req, req.file.filename)
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [existingEmail] = await connection.query("SELECT id FROM users WHERE email = ?", [email])
      if (existingEmail.length > 0) {
        await connection.rollback()
        return res.status(409).json({ message: "Email already registered" })
      }

      const [existingPhone] = await connection.query("SELECT id FROM users WHERE phone = ?", [phone])
      if (existingPhone.length > 0) {
        await connection.rollback()
        return res.status(409).json({ message: "Phone number already registered" })
      }

      const hash = await bcrypt.hash(password, 10)
      const [userResult] = await connection.query(
        "INSERT INTO users (role, name, email, phone, password_hash, phone_verified) VALUES ('kitchen', ?, ?, ?, ?, 0)",
        [ownerName, email, phone, hash]
      )

      const userId = userResult.insertId

      const [kitchenResult] = await connection.query(
        `INSERT INTO kitchens (
          user_id, name, owner_name, email, phone, address, city, state, pincode,
          speciality, kitchen_type, fssai_license, opening_time, best_item, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId, name, ownerName, email, phone, address, city, state, pincode,
          speciality, kitchenType, fssaiLicenseUrl, openingTime, bestItem, description,
        ]
      )

      await connection.commit()

      const token = signToken({ id: userId, role: "kitchen", kitchenId: kitchenResult.insertId })

      res.status(201).json({
        message: "Kitchen registration submitted. Awaiting admin approval.",
        token,
        user: { id: userId, name: ownerName, email, phone, role: "kitchen" },
        kitchen: { id: kitchenResult.insertId, name, status: "pending" },
      })
    } catch (error) {
      await connection.rollback()
      console.error("Kitchen register error:", error)
      res.status(500).json({ message: "Registration failed" })
    } finally {
      connection.release()
    }
  })
})

router.post("/kitchen/login", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  try {
    const [users] = await pool.query(
      "SELECT u.*, k.id AS kitchen_id, k.name AS kitchen_name, k.status AS kitchen_status FROM users u LEFT JOIN kitchens k ON k.user_id = u.id WHERE u.email = ? AND u.role = 'kitchen'",
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (!user.phone_verified) {
      const phone = user.phone
      const phoneError = phone ? validateIndianPhone(phone) : "No phone number on account"
      if (phoneError) {
        return res.status(400).json({ message: phoneError })
      }

      await createAndSendOtp(`login:${user.id}`, phone)

      const payload = {
        requiresOtp: true,
        message: "OTP sent to your registered phone number",
        phoneHint: `******${phone.slice(-4)}`,
      }
      const demoOtp = getDemoOtp()
      if (demoOtp) payload.demoOtp = demoOtp

      return res.json(payload)
    }

    const token = signToken({ id: user.id, role: "kitchen", kitchenId: user.kitchen_id })

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: "kitchen" },
      kitchen: { id: user.kitchen_id, name: user.kitchen_name, status: user.kitchen_status },
    })
  } catch (error) {
    console.error("Kitchen login error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

router.post("/kitchen/login/verify-otp", async (req, res) => {
  const email = req.body.email?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""
  const otp = req.body.otp?.toString().trim()

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }
  if (!otp || otp.length !== 4) {
    return res.status(400).json({ message: "Enter the 4-digit OTP" })
  }

  try {
    const [users] = await pool.query(
      "SELECT u.*, k.id AS kitchen_id, k.name AS kitchen_name, k.status AS kitchen_status FROM users u LEFT JOIN kitchens k ON k.user_id = u.id WHERE u.email = ? AND u.role = 'kitchen'",
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (!checkOtp(`login:${user.id}`, otp)) {
      return res.status(401).json({ message: "Invalid or expired OTP" })
    }

    consumeOtp(`login:${user.id}`)
    await pool.query("UPDATE users SET phone_verified = 1 WHERE id = ?", [user.id])
    user.phone_verified = 1

    const token = signToken({ id: user.id, role: "kitchen", kitchenId: user.kitchen_id })

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: "kitchen" },
      kitchen: { id: user.kitchen_id, name: user.kitchen_name, status: user.kitchen_status },
    })
  } catch (error) {
    console.error("Kitchen login verify OTP error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email])

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = signToken({ id: user.id, role: "admin" })

    res.json({
      message: "Admin login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: "admin" },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

export default router
