const DEMO_OTP = process.env.DEMO_OTP || "1234"
const OTP_TTL_MS = 10 * 60 * 1000

/** @type {Map<string, { otp: string, expiresAt: number }>} */
const store = new Map()

export function getDemoOtp() {
  return DEMO_OTP
}

export function createOtp(phone) {
  const otp = DEMO_OTP
  store.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS })
  return otp
}

export function checkOtp(phone, otp) {
  const entry = store.get(phone)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(phone)
    return false
  }
  return entry.otp === otp
}

export function consumeOtp(phone) {
  store.delete(phone)
}
