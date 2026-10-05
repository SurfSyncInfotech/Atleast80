import { isSmsConfigured, sendOtpSms } from "./smsService.js"
import { isEmailConfigured, sendOtpEmail } from "./emailService.js"

const DEMO_OTP = process.env.DEMO_OTP || "1234"
const OTP_TTL_MS = 10 * 60 * 1000

/** @type {Map<string, { otp: string, expiresAt: number }>} */
const store = new Map()

function isChannelConfigured() {
  return isSmsConfigured() || isEmailConfigured()
}

function generateOtp() {
  if (isChannelConfigured()) {
    return String(Math.floor(1000 + Math.random() * 9000))
  }
  return DEMO_OTP
}

export function getDemoOtp(key = null) {
  return isChannelConfigured() ? null : DEMO_OTP
}

export function createOtp(key) {
  const otp = generateOtp()
  store.set(key, { otp, expiresAt: Date.now() + OTP_TTL_MS })
  console.log(`[OTP Generated for key: ${key}] -> OTP Code: ${otp}`)
  return otp
}

/**
 * @param {string} key
 * @param {{ phone?: string, email?: string }} contact
 */
export async function createAndSendOtp(key, contact) {
  const { phone, email } = typeof contact === "string" ? { phone: contact } : contact || {}
  const otp = createOtp(key)
  if (phone && isSmsConfigured()) {
    try {
      await sendOtpSms(phone, otp)
    } catch (err) {
      console.error(`[SMS Delivery Failed for ${phone}]:`, err.message)
    }
  } else if (email && isEmailConfigured()) {
    try {
      await sendOtpEmail(email, otp)
    } catch (err) {
      console.error(`[Email Delivery Failed for ${email}]:`, err.message)
    }
  }
  return otp
}

export function checkOtp(key, otp) {
  const entry = store.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return false
  }
  return entry.otp === otp
}

export function consumeOtp(key) {
  store.delete(key)
}
