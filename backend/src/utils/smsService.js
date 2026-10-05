const SMS_BASE_URL = process.env.SMS_API_URL || "https://smsfortius.work/V2/"

const OTP_MESSAGE_TEMPLATE =
  process.env.SMS_OTP_MESSAGE ||
  "{#var#} is your Atleast80 otp.valid for 10 minutes only don't share with anyone - ELIFELO PRIVATE LIMITED"

export function isSmsConfigured() {
  return Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER_ID && process.env.SMS_TEMPLATE_ID)
}

function buildOtpMessage(otp) {
  return OTP_MESSAGE_TEMPLATE.replace("{#var#}", otp)
}

/**
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp
 */
export async function sendOtpSms(phone, otp) {
  if (!isSmsConfigured()) {
    throw new Error("SMS service is not configured")
  }

  const message = buildOtpMessage(otp)
  const url = new URL(SMS_BASE_URL)
  url.searchParams.set("apikey", process.env.SMS_API_KEY)
  url.searchParams.set("senderid", process.env.SMS_SENDER_ID)
  url.searchParams.set("templateid", process.env.SMS_TEMPLATE_ID)
  url.searchParams.set("number", phone)
  url.searchParams.set("message", message)

  const response = await fetch(url.toString())
  const body = await response.text()

  if (!response.ok) {
    console.error("SMS API HTTP error:", response.status, body)
    throw new Error("Failed to send OTP SMS")
  }

  let parsed = null
  try {
    parsed = JSON.parse(body)
  } catch {
    // Some gateways return plain text
  }

  if (parsed && typeof parsed === "object") {
    const status = String(parsed.status ?? parsed.Status ?? parsed.type ?? "").toLowerCase()
    const success = status === "true" || status === "success" || status === "ok" || parsed.success === true
    if (!success) {
      console.error("[SMS Gateway Rejected Request]:", body)
      throw new Error(`SMS Gateway Error: ${parsed.description || body}`)
    }
  }

  console.log(`OTP SMS sent to ******${phone.slice(-4)}`)
}
