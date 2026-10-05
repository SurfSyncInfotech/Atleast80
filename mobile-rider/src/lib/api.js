import { Platform } from "react-native"
import Constants from "expo-constants"
import { getStoredToken } from "./authStorage"

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }
  return "https://backend.atleast80.com"
}

export const API_URL = getApiUrl()

console.log("API URL configured to:", API_URL)

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function getToken() {
  return getStoredToken()
}

export async function api(path, options = {}) {
  const token = getToken()
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new ApiError("Server returned invalid response format (not JSON). Please make sure your backend is running.", res.status)
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.message || "Something went wrong", res.status)
  }

  return data
}

async function uploadFormData(path, formData) {
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    })
  } catch (err) {
    throw new ApiError(
      "Upload failed — the server may have rejected the file before it reached the API: " + err.message,
      0
    )
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 413) {
    throw new ApiError(
      "Upload rejected: server body-size limit too small. Increase client_max_body_size on server",
      413
    )
  }

  if (!res.ok) {
    throw new ApiError(data.message || "Upload failed", res.status)
  }

  return data
}

async function getUploadFile(file) {
  if (!file) return null

  if (Platform.OS === "web") {
    if (file instanceof File) {
      return file
    }
    if (file.file instanceof File) {
      return file.file
    }
    try {
      const response = await fetch(file.uri)
      const blob = await response.blob()
      return new File([blob], file.name || "file.jpg", {
        type: file.mimeType || file.type || blob.type || "image/jpeg",
      })
    } catch (e) {
      console.error("Failed to convert URI to File:", e)
      return file
    }
  }

  // Native platforms (iOS/Android)
  return {
    uri: file.uri,
    name: file.name || "file.jpg",
    type: file.mimeType || file.type || "image/jpeg",
  }
}

export async function registerRider(form, aadhaarCardFile, aadhaarCardBackFile, panCardFile, drivingLicenseFile) {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })
  formData.append("appVersion", "1.0.0")

  const aadhaarUploadFile = await getUploadFile(aadhaarCardFile)
  formData.append("aadhaarCard", aadhaarUploadFile)

  const aadhaarBackUploadFile = await getUploadFile(aadhaarCardBackFile)
  formData.append("aadhaarCardBack", aadhaarBackUploadFile)

  const panUploadFile = await getUploadFile(panCardFile)
  formData.append("panCard", panUploadFile)

  if (drivingLicenseFile) {
    const dlUploadFile = await getUploadFile(drivingLicenseFile)
    formData.append("drivingLicense", dlUploadFile)
  }

  return uploadFormData("/api/auth/rider/register", formData)
}

export async function verifyRiderRegisterOtp(userId, otp) {
  return api("/api/auth/rider/register/verify-otp", {
    method: "POST",
    body: JSON.stringify({ userId, otp }),
  })
}

export async function toggleRiderStatus(isOnline) {
  return api("/api/rider/status", {
    method: "PUT",
    body: JSON.stringify({ isOnline }),
  })
}

export async function updateRiderLocation(latitude, longitude) {
  return api("/api/rider/location", {
    method: "PUT",
    body: JSON.stringify({ latitude, longitude }),
  })
}

export async function getRiderDashboard() {
  return api("/api/rider/dashboard")
}

export async function getAvailableRiderDeliveries() {
  return api("/api/rider/deliveries/available")
}

export async function performRiderDeliveryAction(orderId, action, extra = {}) {
  return api(`/api/rider/deliveries/${orderId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, ...extra }),
  })
}

export async function checkPhoneAvailability(phone, email, role = "rider") {
  return api("/api/auth/check-phone", {
    method: "POST",
    body: JSON.stringify({ phone, email, role }),
  })
}
