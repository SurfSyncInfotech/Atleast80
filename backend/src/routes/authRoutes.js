import { Router } from "express"
import bcrypt from "bcryptjs"
import pool from "../config/db.js"
import { signToken, authRequired, requireRole } from "../middleware/auth.js"
import { fssaiLicenseUpload, onboardingDocumentsUpload, getKitchenFileUrl } from "../middleware/upload.js"
import {
  createAndSendOtp,
  getDemoOtp,
  checkOtp,
  consumeOtp,
} from "../utils/otpStore.js"
import { normalizeIndianPhone, validateIndianPhone } from "../utils/phone.js"
import { validateEmail } from "../utils/email.js"

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

    let rider = null
    if (user.role === "rider") {
      const [rows] = await pool.query(
        "SELECT * FROM riders WHERE user_id = ?",
        [user.id]
      )
      rider = rows[0] || null
    }

    res.json({ user, kitchen, rider })
  } catch (error) {
    console.error("Auth me error:", error)
    res.status(500).json({ message: "Failed to verify session" })
  }
})

router.post("/check-phone", async (req, res) => {
  const phone = req.body.phone?.toString().trim() || null
  const email = req.body.email?.toString().trim().toLowerCase() || null

  if (!phone && !email) {
    return res.status(400).json({ message: "Phone number or email is required" })
  }

  try {
    if (phone) {
      const cleanPhone = phone.length === 10 ? phone : phone.slice(-10)
      const [existingPhone] = await pool.query(
        "SELECT id FROM users WHERE phone = ? OR phone = ?",
        [phone, cleanPhone]
      )
      if (existingPhone.length > 0) {
        return res.status(409).json({ message: "This phone number is already registered. Please log in instead." })
      }
    }

    if (email) {
      const [existingEmail] = await pool.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      )
      if (existingEmail.length > 0) {
        return res.status(409).json({ message: "This email address is already registered. Please log in instead." })
      }
    }

    res.json({ available: true })
  } catch (error) {
    console.error("Check phone error:", error)
    res.status(500).json({ message: "Failed to check phone availability" })
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
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` })
    }
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
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` })
    }
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
  "name", "ownerName", "password",
  "speciality", "kitchenType", "bestItem",
  "address", "city", "state", "pincode", "openingTime", "description",
]

router.post("/kitchen/register", (req, res) => {
  onboardingDocumentsUpload.fields([
    { name: "fssaiLicense", maxCount: 1 },
    { name: "aadhaarCard", maxCount: 1 },
    { name: "aadhaarCardBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
  ])(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || "Document upload failed" })
    }

    const fssaiFile = req.files?.["fssaiLicense"]?.[0]
    const aadhaarFile = req.files?.["aadhaarCard"]?.[0]
    const aadhaarBackFile = req.files?.["aadhaarCardBack"]?.[0]
    const panFile = req.files?.["panCard"]?.[0]

    if (!fssaiFile) {
      return res.status(400).json({ message: "FSSAI license document is required" })
    }
    if (!aadhaarFile) {
      return res.status(400).json({ message: "Aadhaar Card Front document is required" })
    }
    if (!aadhaarBackFile) {
      return res.status(400).json({ message: "Aadhaar Card Back document is required" })
    }
    if (!panFile) {
      return res.status(400).json({ message: "PAN Card document is required" })
    }

    const {
      name, ownerName, password,
      speciality, kitchenType, bestItem,
      address, city, state, pincode, openingTime, description,
    } = req.body

    const email = req.body.email?.toString().trim().toLowerCase() || null
    const phone = req.body.phone?.toString().trim() || null
    const agreementVersion = Number(req.body.agreementVersion)
    const appVersion = req.body.appVersion?.toString().trim() || "1.0.0"

    const aadhaarNumber = req.body.aadhaarNumber?.toString().trim() || null
    const panNumber = req.body.panNumber?.toString().trim().toUpperCase() || null

    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]?.toString().trim())
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` })
    }

    if (!aadhaarNumber || !panNumber) {
      return res.status(400).json({ message: "Aadhaar number and PAN number are required" })
    }

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ message: "Aadhaar number must be exactly 12 digits" })
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return res.status(400).json({ message: "PAN number must be a valid 10-character alphanumeric PAN" })
    }

    if (!email && !phone) {
      return res.status(400).json({ message: "Enter a phone number or an email address" })
    }
    if (email) {
      const emailError = validateEmail(email)
      if (emailError) return res.status(400).json({ message: emailError })
    }
    if (phone && phone.length !== 10) {
      return res.status(400).json({ message: "Phone number must be 10 digits" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    if (pincode.length !== 6) {
      return res.status(400).json({ message: "Pincode must be 6 digits" })
    }

    const validTypes = ["veg", "non_veg", "both"]
    if (!validTypes.includes(kitchenType)) {
      return res.status(400).json({ message: "Invalid kitchen type" })
    }

    const [settingsRows] = await pool.query(
      "SELECT partner_agreement_version FROM site_settings WHERE id = 1"
    )
    const currentAgreementVersion = settingsRows[0]?.partner_agreement_version || 0
    if (currentAgreementVersion > 0 && agreementVersion !== currentAgreementVersion) {
      return res.status(400).json({ message: "Please review and accept the latest Partner Agreement before submitting" })
    }

    const fssaiLicenseUrl = getKitchenFileUrl(req, fssaiFile.filename)
    const aadhaarCardUrl = getKitchenFileUrl(req, aadhaarFile.filename)
    const aadhaarCardBackUrl = getKitchenFileUrl(req, aadhaarBackFile.filename)
    const panCardUrl = getKitchenFileUrl(req, panFile.filename)

    // Capture signature audit log details
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    const userAgent = req.headers["user-agent"] || ""
    let device = "Web"
    const ua = userAgent.toLowerCase()
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
      device = "iOS"
    } else if (ua.includes("android")) {
      device = "Android"
    } else if (ua.includes("postman") || ua.includes("insomnia")) {
      device = "API Client"
    }

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      if (email) {
        const [existingEmail] = await connection.query("SELECT id FROM users WHERE email = ?", [email])
        if (existingEmail.length > 0) {
          await connection.rollback()
          return res.status(409).json({ message: "Email already registered" })
        }
      }

      if (phone) {
        const [existingPhone] = await connection.query("SELECT id FROM users WHERE phone = ?", [phone])
        if (existingPhone.length > 0) {
          await connection.rollback()
          return res.status(409).json({ message: "Phone number already registered" })
        }
      }

      const hash = await bcrypt.hash(password, 10)
      const [userResult] = await connection.query(
        "INSERT INTO users (role, name, email, phone, password_hash, account_verified) VALUES ('kitchen', ?, ?, ?, ?, 0)",
        [ownerName, email, phone, hash]
      )

      const userId = userResult.insertId

      const [kitchenResult] = await connection.query(
        `INSERT INTO kitchens (
          user_id, name, owner_name, email, phone, address, city, state, pincode,
          speciality, kitchen_type, fssai_license, opening_time, best_item, description, status,
          agreement_accepted_version, agreement_accepted_at,
          aadhaar_number, aadhaar_card, aadhaar_card_back, pan_number, pan_card
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          userId, name, ownerName, email, phone, address, city, state, pincode,
          speciality, kitchenType, fssaiLicenseUrl, openingTime, bestItem, description,
          currentAgreementVersion || null,
          aadhaarNumber, aadhaarCardUrl, aadhaarCardBackUrl, panNumber, panCardUrl
        ]
      )

      const kitchenId = kitchenResult.insertId

      // Insert signature audit log
      await connection.query(
        `INSERT INTO kitchen_agreement_signatures (
          kitchen_id, user_id, agreement_version, ip_address, device_info, app_version
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          kitchenId, userId, currentAgreementVersion || 0, ipAddress, device, appVersion
        ]
      )

      await connection.commit()

      // Send register verification OTP
      const payload = {
        requiresOtp: true,
        userId: userId,
        message: "OTP sent to verify your contact information",
      }

      if (phone) {
        await createAndSendOtp(`register:${userId}`, { phone })
        payload.channel = "phone"
        payload.phoneHint = `******${phone.slice(-4)}`
      } else {
        await createAndSendOtp(`register:${userId}`, { email })
        payload.channel = "email"
        payload.emailHint = email.replace(/^(.{2}).*(@.*)$/, "$1***$2")
      }

      const demoOtp = getDemoOtp()
      if (demoOtp) payload.demoOtp = demoOtp

      res.status(201).json(payload)
    } catch (error) {
      await connection.rollback()
      console.error("Kitchen register error:", error)
      res.status(500).json({ message: "Registration failed" })
    } finally {
      connection.release()
    }
  })
})

router.post("/kitchen/register/verify-otp", async (req, res) => {
  const userId = Number(req.body.userId)
  const otp = req.body.otp?.toString().trim()

  if (!userId) {
    return res.status(400).json({ message: "Invalid user session" })
  }
  if (!otp || otp.length !== 4) {
    return res.status(400).json({ message: "Enter the 4-digit OTP" })
  }

  try {
    const cacheKey = `register:${userId}`
    if (!checkOtp(cacheKey, otp)) {
      return res.status(401).json({ message: "Invalid or expired OTP" })
    }

    consumeOtp(cacheKey)

    // Verify phone/email in db
    await pool.query("UPDATE users SET phone_verified = 1 WHERE id = ?", [userId])

    res.json({
      message: "Registration submitted successfully! Awaiting admin approval. Please log in to continue.",
    })
  } catch (error) {
    console.error("Kitchen register verify OTP error:", error)
    res.status(500).json({ message: "Verification failed" })
  }
})

router.post("/kitchen/login", async (req, res) => {
  const identifier = req.body.identifier?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""

  if (!identifier || !password) {
    return res.status(400).json({ message: "Phone/email and password are required" })
  }

  try {
    const [users] = await pool.query(
      "SELECT u.*, k.id AS kitchen_id, k.name AS kitchen_name, k.status AS kitchen_status FROM users u LEFT JOIN kitchens k ON k.user_id = u.id WHERE (LOWER(u.email) = ? OR u.phone = ?) AND u.role = 'kitchen'",
      [identifier, identifier]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = users[0]
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    if (!user.account_verified) {
      const payload = { requiresOtp: true }

      if (user.phone) {
        await createAndSendOtp(`login:${user.id}`, { phone: user.phone })
        payload.channel = "phone"
        payload.message = "OTP sent to your registered phone number"
        payload.phoneHint = `******${user.phone.slice(-4)}`
      } else {
        await createAndSendOtp(`login:${user.id}`, { email: user.email })
        payload.channel = "email"
        payload.message = "OTP sent to your registered email address"
        payload.emailHint = user.email.replace(/^(.{2}).*(@.*)$/, "$1***$2")
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
  const identifier = req.body.identifier?.toString().trim().toLowerCase()
  const password = req.body.password?.toString() || ""
  const otp = req.body.otp?.toString().trim()

  if (!identifier || !password) {
    return res.status(400).json({ message: "Phone/email and password are required" })
  }
  if (!otp || otp.length !== 4) {
    return res.status(400).json({ message: "Enter the 4-digit OTP" })
  }

  try {
    const [users] = await pool.query(
      "SELECT u.*, k.id AS kitchen_id, k.name AS kitchen_name, k.status AS kitchen_status FROM users u LEFT JOIN kitchens k ON k.user_id = u.id WHERE (LOWER(u.email) = ? OR u.phone = ?) AND u.role = 'kitchen'",
      [identifier, identifier]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = users[0]
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    if (!checkOtp(`login:${user.id}`, otp)) {
      return res.status(401).json({ message: "Invalid or expired OTP" })
    }

    consumeOtp(`login:${user.id}`)
    await pool.query("UPDATE users SET account_verified = 1 WHERE id = ?", [user.id])
    user.account_verified = 1

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

// Rider registration endpoint
router.post("/rider/register", (req, res) => {
  onboardingDocumentsUpload.fields([
    { name: "aadhaarCard", maxCount: 1 },
    { name: "aadhaarCardBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
  ])(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || "Document upload failed" })
    }

    const aadhaarFile = req.files?.["aadhaarCard"]?.[0]
    const aadhaarBackFile = req.files?.["aadhaarCardBack"]?.[0]
    const panFile = req.files?.["panCard"]?.[0]
    const dlFile = req.files?.["drivingLicense"]?.[0]

    const {
      name, password,
      vehicleType, vehicleNumber, drivingLicenseNumber,
      aadhaarNumber, panNumber,
    } = req.body

    const email = req.body.email?.toString().trim().toLowerCase() || null
    const phone = req.body.phone?.toString().trim() || null
    const appVersion = req.body.appVersion?.toString().trim() || "1.0.0"

    if (!name || !password || !vehicleType || !aadhaarNumber || !panNumber) {
      return res.status(400).json({ message: "Name, password, vehicle type, Aadhaar number, and PAN number are required" })
    }

    if (!email && !phone) {
      return res.status(400).json({ message: "Enter a phone number or an email address" })
    }

    if (phone && phone.length !== 10) {
      return res.status(400).json({ message: "Phone number must be 10 digits" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ message: "Aadhaar number must be exactly 12 digits" })
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      return res.status(400).json({ message: "PAN number must be a valid 10-character alphanumeric PAN" })
    }

    if (vehicleType !== "bicycle") {
      if (!drivingLicenseNumber || !dlFile) {
        return res.status(400).json({ message: "Driving license details and document are required for motorized vehicles" })
      }
    }

    if (!aadhaarFile || !aadhaarBackFile || !panFile) {
      return res.status(400).json({ message: "Aadhaar Front, Aadhaar Back, and PAN Card documents are required" })
    }

    // Generate public file URLs
    const { getRiderFileUrl } = await import("../middleware/upload.js")
    const aadhaarCardUrl = getRiderFileUrl(req, aadhaarFile.filename)
    const aadhaarCardBackUrl = getRiderFileUrl(req, aadhaarBackFile.filename)
    const panCardUrl = getRiderFileUrl(req, panFile.filename)
    const dlUrl = dlFile ? getRiderFileUrl(req, dlFile.filename) : null

    // Signature Auditing
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    const userAgent = req.headers["user-agent"] || ""
    let device = "Web"
    const ua = userAgent.toLowerCase()
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
      device = "iOS"
    } else if (ua.includes("android")) {
      device = "Android"
    }

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Log details to local file
      const fs = await import("fs")
      const path = await import("path")
      const logFilePath = path.join(process.cwd(), "rider_debug.log")
      
      const logMsg = `\n--- [${new Date().toISOString()}] ---\nRequest email: ${email}, phone: ${phone}\n`
      fs.appendFileSync(logFilePath, logMsg)

      if (email) {
        const [existingEmail] = await connection.query("SELECT id FROM users WHERE email = ?", [email])
        fs.appendFileSync(logFilePath, `Email check for ${email}: ${JSON.stringify(existingEmail)}\n`)
        if (existingEmail.length > 0) {
          await connection.rollback()
          return res.status(409).json({ message: "This email address is already registered. Please log in instead." })
        }
      }

      if (phone) {
        const [existingPhone] = await connection.query("SELECT id FROM users WHERE phone = ?", [phone])
        fs.appendFileSync(logFilePath, `Phone check for ${phone}: ${JSON.stringify(existingPhone)}\n`)
        if (existingPhone.length > 0) {
          await connection.rollback()
          return res.status(409).json({ message: "This phone number is already registered. Please log in instead." })
        }
      }

      const hash = await bcrypt.hash(password, 10)
      const [userResult] = await connection.query(
        "INSERT INTO users (role, name, email, phone, password_hash, account_verified) VALUES ('rider', ?, ?, ?, ?, 0)",
        [name, email, phone, hash]
      )

      const userId = userResult.insertId

      const [riderResult] = await connection.query(
        `INSERT INTO riders (
          user_id, vehicle_type, vehicle_number, driving_license_number,
          aadhaar_number, aadhaar_card, aadhaar_card_back, pan_number, pan_card, driving_license, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId, vehicleType, vehicleNumber || null, drivingLicenseNumber || null,
          aadhaarNumber, aadhaarCardUrl, aadhaarCardBackUrl, panNumber.toUpperCase(), panCardUrl, dlUrl
        ]
      )

      const riderId = riderResult.insertId

      // Audit log for rider agreement
      await connection.query(
        `INSERT INTO rider_agreement_signatures (
          rider_id, user_id, agreement_version, ip_address, device_info, app_version
        ) VALUES (?, ?, 1, ?, ?, ?)`,
        [riderId, userId, ipAddress, device, appVersion]
      )

      await connection.commit()

      // Generate verification OTP
      const otpCode = await createAndSendOtp(`register:${userId}`, phone || email)
      const demoOtp = getDemoOtp(otpCode)

      res.status(201).json({
        message: "Rider registration successful. Verification OTP sent.",
        requiresOtp: true,
        userId,
        demoOtp,
      })
    } catch (error) {
      await connection.rollback()
      console.error("Rider registration transaction error:", error)
      res.status(500).json({ message: "Registration failed. Database error." })
    } finally {
      connection.release()
    }
  })
})

// Rider verify OTP
router.post("/rider/register/verify-otp", async (req, res) => {
  const { userId, otp } = req.body

  if (!userId || !otp) {
    return res.status(400).json({ message: "User ID and OTP are required" })
  }

  try {
    const valid = checkOtp(`register:${userId}`, otp)
    if (!valid) {
      return res.status(400).json({ message: "Invalid or expired OTP" })
    }

    consumeOtp(`register:${userId}`)
    await pool.query("UPDATE users SET account_verified = 1 WHERE id = ?", [userId])

    res.json({
      message: "OTP verified successfully. Your account is submitted for Admin review.",
    })
  } catch (error) {
    console.error("Rider register verify OTP error:", error)
    res.status(500).json({ message: "OTP verification failed" })
  }
})

// Rider login
router.post("/rider/login", async (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email/Phone and password are required" })
  }

  try {
    const [users] = await pool.query(
      `SELECT u.*, r.id AS rider_id, r.status AS rider_status, r.is_online AS rider_online
       FROM users u
       JOIN riders r ON u.id = r.user_id
       WHERE (u.email = ? OR u.phone = ?) AND u.role = 'rider'`,
      [identifier.toLowerCase().trim(), identifier.trim()]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = users[0]
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.` })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    if (!user.account_verified) {
      // Send register verification OTP again
      const otpCode = await createAndSendOtp(`register:${user.id}`, user.phone || user.email)
      const demoOtp = getDemoOtp(otpCode)
      return res.json({
        requiresOtp: true,
        userId: user.id,
        demoOtp,
        message: "Account not verified. Verification OTP sent.",
      })
    }

    const token = signToken({ id: user.id, role: "rider", riderId: user.rider_id })

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: "rider" },
      rider: { id: user.rider_id, status: user.rider_status, is_online: user.rider_online },
    })
  } catch (error) {
    console.error("Rider login error:", error)
    res.status(500).json({ message: "Login failed" })
  }
})

// Update FCM push token
router.post("/push-token", authRequired, async (req, res) => {
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ message: "Push token is required" })
  }

  try {
    await pool.query(
      "UPDATE users SET fcm_token = ? WHERE id = ?",
      [token, req.user.id]
    )
    res.json({ message: "Push token updated successfully" })
  } catch (error) {
    console.error("Update push token error:", error)
    res.status(500).json({ message: "Failed to update push token" })
  }
})

export default router
