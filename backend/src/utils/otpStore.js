import { isSmsConfigured, sendOtpSms } from "./smsService.js"

const DEMO_OTP = process.env.DEMO_OTP || "1234"
const OTP_TTL_MS = 10 * 60 * 1000

/** @type {Map<string, { otp: string, expiresAt: number }>} */
const store = new Map()

function generateOtp() {
  if (isSmsConfigured()) {
    return String(Math.floor(1000 + Math.random() * 9000))
  }
  return DEMO_OTP
}

export function getDemoOtp() {
  return isSmsConfigured() ? null : DEMO_OTP
}

export function createOtp(key) {
  const otp = generateOtp()
  store.set(key, { otp, expiresAt: Date.now() + OTP_TTL_MS })
  return otp
}

export async function createAndSendOtp(key, phone) {
  const otp = createOtp(key)
  if (isSmsConfigured()) {
    await sendOtpSms(phone, otp)
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
