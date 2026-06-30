export function normalizeIndianPhone(raw) {
  const digits = raw?.toString().replace(/\D/g, "") || ""
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }
  return digits.slice(0, 10)
}

export function validateIndianPhone(phone) {
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return "Enter a valid 10-digit Indian mobile number"
  }
  return null
}
