const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[6-9]\d{9}$/
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_RE = /^[\w.-]+@[\w.-]+$/
const AADHAAR_RE = /^\d{12}$/
/** Indian RTO plate (no spaces) — last part must be exactly 4 digits, e.g. UP32AB1234 */
const VEHICLE_NUMBER_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/
/** Bharat series — e.g. 22BH1234AA */
const VEHICLE_BH_RE = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/
/** Indian DL — exactly 15 chars: 2 letters + 13 alphanumeric, e.g. UP1420110012345 */
const DL_NUMBER_RE = /^[A-Z]{2}[0-9A-Z]{13}$/

export function isEmail(value) {
  return EMAIL_RE.test(String(value || "").trim())
}

export function isPhone(value) {
  return PHONE_RE.test(String(value || "").trim())
}

/**
 * Formats Indian vehicle number while typing and blocks more than 4 trailing digits.
 * Output example: "UP32 AB 1234"
 */
export function normalizeVehicleNumber(value) {
  const cleaned = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return ""

  // Bharat series: 22BH1234AA
  if (/^[0-9]/.test(cleaned)) {
    let i = 0
    let prefix = ""
    while (i < cleaned.length && prefix.length < 2 && /[0-9]/.test(cleaned[i])) prefix += cleaned[i++]
    let bh = ""
    while (i < cleaned.length && bh.length < 2 && /[A-Z]/.test(cleaned[i])) bh += cleaned[i++]
    let num = ""
    while (i < cleaned.length && num.length < 4 && /[0-9]/.test(cleaned[i])) num += cleaned[i++]
    let suffix = ""
    while (i < cleaned.length && suffix.length < 2 && /[A-Z]/.test(cleaned[i])) suffix += cleaned[i++]
    return `${prefix}${bh}${num}${suffix}`
  }

  // Standard RTO: XX + 1–2 digits + 1–3 letters + exactly up to 4 digits
  let i = 0
  let state = ""
  while (i < cleaned.length && state.length < 2 && /[A-Z]/.test(cleaned[i])) state += cleaned[i++]
  let rto = ""
  while (i < cleaned.length && rto.length < 2 && /[0-9]/.test(cleaned[i])) rto += cleaned[i++]
  let series = ""
  while (i < cleaned.length && series.length < 3 && /[A-Z]/.test(cleaned[i])) series += cleaned[i++]
  let unique = ""
  while (i < cleaned.length && unique.length < 4 && /[0-9]/.test(cleaned[i])) unique += cleaned[i++]
  // Extra digits after 4 are intentionally ignored

  const parts = []
  if (state || rto) parts.push(`${state}${rto}`)
  if (series) parts.push(series)
  if (unique) parts.push(unique)
  return parts.join(" ")
}

export function normalizeDrivingLicense(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 15)
}

export function isValidVehicleNumber(value) {
  const cleaned = String(value || "").toUpperCase().replace(/[\s-]/g, "")
  if (!cleaned) return false
  // Reject if trailing digit block is not exactly 4 (common user mistake: 5–6 digits)
  const standardMatch = cleaned.match(/^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3})([0-9]+)$/)
  if (standardMatch) {
    return standardMatch[2].length === 4 && VEHICLE_NUMBER_RE.test(cleaned)
  }
  return VEHICLE_BH_RE.test(cleaned)
}

export function isValidDrivingLicense(value) {
  const cleaned = String(value || "").toUpperCase().replace(/[\s-]/g, "")
  if (!cleaned) return false
  return cleaned.length === 15 && DL_NUMBER_RE.test(cleaned)
}

export function hasFieldErrors(errors = {}) {
  return Object.values(errors || {}).some(Boolean)
}

export function firstFieldError(errors) {
  if (!errors) return ""
  if (typeof errors === "string") return errors.trim()
  if (Array.isArray(errors)) return String(errors.find(Boolean) || "").trim()
  return String(Object.values(errors).find(Boolean) || "").trim()
}

/** Live-clear helpers: return updated error map after a field changes */
export function clearFieldError(errors, field) {
  if (!errors?.[field]) return errors
  const next = { ...errors }
  delete next[field]
  return next
}

export function getLoginFieldErrors({ identifier, password }) {
  const errors = {}
  const id = String(identifier || "").trim()
  const pass = String(password || "")

  if (!id) {
    errors.identifier = "Phone number or email is required"
  } else if (id.includes("@")) {
    if (!isEmail(id)) errors.identifier = "Enter a valid email address"
  } else if (!/^\d{10}$/.test(id)) {
    errors.identifier = "Enter a valid 10-digit phone number or email"
  }

  if (!pass.trim()) {
    errors.password = "Password is required"
  } else if (pass.length < 6) {
    errors.password = "Password must be at least 6 characters"
  }

  return errors
}

export function getOtpFieldError(otpDigits) {
  const otp = Array.isArray(otpDigits) ? otpDigits.join("") : String(otpDigits || "")
  if (!otp) return "OTP is required"
  if (!/^\d{4}$/.test(otp)) return "Please enter the complete 4-digit OTP"
  return ""
}

export function getSignupStepFieldErrors(step, form, files = {}, extras = {}) {
  const errors = {}
  const name = String(form.name || "").trim()
  const email = String(form.email || "").trim()
  const phone = String(form.phone || "").trim()
  const password = String(form.password || "")

  if (step === 1) {
    if (!name) errors.name = "Full name is required"
    else if (name.length < 2) errors.name = "Full name must be at least 2 characters"

    if (!phone) {
      errors.phone = "Phone number is required"
    } else if (!/^\d{10}$/.test(phone)) {
      errors.phone = "Phone number must be exactly 10 digits"
    } else if (!isPhone(phone)) {
      errors.phone = "Enter a valid Indian mobile number"
    }

    if (!email) {
      errors.email = "Email address is required"
    } else if (!isEmail(email)) {
      errors.email = "Enter a valid email address"
    }

    if (!password.trim()) errors.password = "Password is required"
    else if (password.length < 6) errors.password = "Password must be at least 6 characters"
  }

  if (step === 2) {
    if (!form.vehicleType) {
      errors.vehicleType = "Please select a vehicle type"
    }
    if (form.vehicleType !== "bicycle") {
      const vehicleNumber = String(form.vehicleNumber || "").trim()
      const dlNumber = String(form.drivingLicenseNumber || "").trim()

      if (!vehicleNumber) {
        errors.vehicleNumber = "Vehicle number is required"
      } else if (!isValidVehicleNumber(vehicleNumber)) {
        const digitsTail = vehicleNumber.toUpperCase().replace(/[\s-]/g, "").match(/[0-9]+$/)
        if (digitsTail && digitsTail[0].length !== 4) {
          errors.vehicleNumber = "Last part of vehicle number must be exactly 4 digits"
        } else {
          errors.vehicleNumber = "Enter a valid vehicle number (e.g. UP32 AB 1234)"
        }
      }

      if (!dlNumber) {
        errors.drivingLicenseNumber = "Driving license number is required"
      } else {
        const cleanedDl = dlNumber.toUpperCase().replace(/[\s-]/g, "")
        if (cleanedDl.length !== 15) {
          errors.drivingLicenseNumber = "DL number must be exactly 15 characters"
        } else if (!isValidDrivingLicense(dlNumber)) {
          errors.drivingLicenseNumber = "Enter a valid DL number (e.g. UP1420110012345)"
        }
      }
    }
  }

  if (step === 3) {
    const aadhaar = String(form.aadhaarNumber || "").trim()
    const pan = String(form.panNumber || "").trim().toUpperCase()

    if (!aadhaar) errors.aadhaarNumber = "Aadhaar number is required"
    else if (!AADHAAR_RE.test(aadhaar)) errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits"

    if (!files.aadhaarCardFile) errors.aadhaarCardFile = "Aadhaar front document is required"
    if (!files.aadhaarCardBackFile) errors.aadhaarCardBackFile = "Aadhaar back document is required"

    if (!pan) errors.panNumber = "PAN number is required"
    else if (!PAN_RE.test(pan)) errors.panNumber = "Enter a valid PAN (e.g. ABCDE1234F)"

    if (!files.panCardFile) errors.panCardFile = "PAN card document is required"

    if (form.vehicleType !== "bicycle" && !files.drivingLicenseFile) {
      errors.drivingLicenseFile = "Driving license document is required"
    }

    if (form.payoutMode === "bank") {
      if (!String(form.bankAccountName || "").trim()) {
        errors.bankAccountName = "Account holder name is required"
      }
      if (!String(form.bankName || "").trim()) {
        errors.bankName = "Bank name is required"
      }
      if (!String(form.bankAccountNumber || "").trim()) {
        errors.bankAccountNumber = "Account number is required"
      } else if (!/^\d{9,18}$/.test(String(form.bankAccountNumber).trim())) {
        errors.bankAccountNumber = "Account number must be 9–18 digits"
      }
      if (!String(form.confirmBankAccountNumber || "").trim()) {
        errors.confirmBankAccountNumber = "Please confirm your account number"
      } else if (
        String(form.bankAccountNumber || "").trim() !==
        String(form.confirmBankAccountNumber || "").trim()
      ) {
        errors.confirmBankAccountNumber = "Account numbers do not match"
      }
      const ifsc = String(form.bankIfsc || "").trim().toUpperCase()
      if (!ifsc) errors.bankIfsc = "IFSC code is required"
      else if (!IFSC_RE.test(ifsc)) errors.bankIfsc = "Enter a valid 11-character IFSC code"
    } else {
      const upi = String(form.upiId || "").trim()
      if (!upi) errors.upiId = "UPI ID is required"
      else if (!UPI_RE.test(upi)) errors.upiId = "Enter a valid UPI ID (e.g. name@ybl)"
    }
  }

  if (step === 4) {
    if (!extras.agreementRead) {
      errors.agreementRead = "Please open and read the Rider Agreement before continuing"
    }
    if (!extras.termsAccepted) {
      errors.termsAccepted = "Please accept the terms of partnership to continue"
    }
  }

  return errors
}

/** Re-validate a single signup field for live clearing */
export function getSignupFieldError(field, form, files = {}, extras = {}) {
  const step =
    ["name", "phone", "email", "password"].includes(field) ? 1 :
    ["vehicleType", "vehicleNumber", "drivingLicenseNumber"].includes(field) ? 2 :
    [
      "aadhaarNumber", "aadhaarCardFile", "aadhaarCardBackFile", "panNumber", "panCardFile",
      "drivingLicenseFile", "bankAccountName", "bankName", "bankAccountNumber",
      "confirmBankAccountNumber", "bankIfsc", "upiId", "payoutMode",
    ].includes(field) ? 3 : 4

  const all = getSignupStepFieldErrors(step, form, files, extras)
  return all[field] || ""
}

export function getForgotPhoneError(phone) {
  const value = String(phone || "").trim()
  if (!value) return "Phone number is required"
  if (!/^\d{10}$/.test(value)) return "Phone number must be exactly 10 digits"
  if (!isPhone(value)) return "Enter a valid Indian mobile number"
  return ""
}

export function getForgotResetFieldErrors({ otpDigits, password }) {
  const errors = {}
  const otpError = getOtpFieldError(otpDigits)
  if (otpError) errors.otp = otpError

  const pass = String(password || "")
  if (!pass.trim()) errors.password = "Password is required"
  else if (pass.length < 6) errors.password = "Password must be at least 6 characters"

  return errors
}

export function getPayoutFieldErrors(form = {}) {
  const errors = {}
  if (form.payoutMode === "bank") {
    if (!String(form.bankAccountName || "").trim()) {
      errors.bankAccountName = "Account holder name is required"
    }
    if (!String(form.bankName || "").trim()) {
      errors.bankName = "Bank name is required"
    }
    if (!String(form.bankAccountNumber || "").trim()) {
      errors.bankAccountNumber = "Account number is required"
    } else if (!/^\d{9,18}$/.test(String(form.bankAccountNumber).trim())) {
      errors.bankAccountNumber = "Account number must be 9–18 digits"
    }
    if (!String(form.confirmBankAccountNumber || "").trim()) {
      errors.confirmBankAccountNumber = "Please confirm your account number"
    } else if (
      String(form.bankAccountNumber || "").trim() !==
      String(form.confirmBankAccountNumber || "").trim()
    ) {
      errors.confirmBankAccountNumber = "Account numbers do not match"
    }
    const ifsc = String(form.bankIfsc || "").trim().toUpperCase()
    if (!ifsc) errors.bankIfsc = "IFSC code is required"
    else if (!IFSC_RE.test(ifsc)) errors.bankIfsc = "Enter a valid 11-character IFSC code"
  } else {
    const upi = String(form.upiId || "").trim()
    if (!upi) errors.upiId = "UPI ID is required"
    else if (!UPI_RE.test(upi)) errors.upiId = "Enter a valid UPI ID (e.g. name@ybl)"
  }
  return errors
}

export function getPayoutFieldError(field, form = {}) {
  return getPayoutFieldErrors(form)[field] || ""
}
