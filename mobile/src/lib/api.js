import { Platform } from "react-native"
import Constants from "expo-constants"
import { getStoredToken } from "./authStorage"

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }
  if (Platform.OS === "web") {
    return "http://localhost:5000"
  }
  // Dynamically detect local dev machine IP from Expo host URI
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const ip = hostUri.split(":")[0]
    return `http://${ip}:5000`
  }
  return "http://10.0.2.2:5000" // Fallback for android emulators
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

export async function uploadMenuFiles(files) {
  if (!files?.length) return { images: [], videos: [] }

  const formData = new FormData()
  for (const file of files) {
    const uploadFile = await getUploadFile(file)
    formData.append("files", uploadFile)
  }
  return uploadFormData("/api/menu/upload", formData)
}

export async function uploadStoryFiles(files) {
  if (!files?.length) return { stories: [] }

  const formData = new FormData()
  for (const file of files) {
    const uploadFile = await getUploadFile(file)
    formData.append("files", uploadFile)
  }
  return uploadFormData("/api/stories", formData)
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

export async function uploadKitchenLogo(file) {
  const formData = new FormData()
  const uploadFile = await getUploadFile(file)
  formData.append("logo", uploadFile)
  return uploadFormData("/api/kitchens/me/logo", formData)
}

export async function uploadKitchenCover(file) {
  const formData = new FormData()
  const uploadFile = await getUploadFile(file)
  formData.append("cover", uploadFile)
  return uploadFormData("/api/kitchens/me/cover", formData)
}

export async function registerKitchen(form, fssaiLicenseFile, aadhaarCardFile, aadhaarCardBackFile, panCardFile) {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })
  formData.append("appVersion", "1.0.0")
  
  const fssaiUploadFile = await getUploadFile(fssaiLicenseFile)
  formData.append("fssaiLicense", fssaiUploadFile)

  const aadhaarUploadFile = await getUploadFile(aadhaarCardFile)
  formData.append("aadhaarCard", aadhaarUploadFile)

  const aadhaarBackUploadFile = await getUploadFile(aadhaarCardBackFile)
  formData.append("aadhaarCardBack", aadhaarBackUploadFile)

  const panUploadFile = await getUploadFile(panCardFile)
  formData.append("panCard", panUploadFile)

  return uploadFormData("/api/auth/kitchen/register", formData)
}

export async function verifyRegisterOtp(userId, otp) {
  return api("/api/auth/kitchen/register/verify-otp", {
    method: "POST",
    body: JSON.stringify({ userId, otp }),
  })
}

export async function getPartnerAgreement() {
  return api("/api/kitchens/partner-agreement")
}

export async function uploadFiles(path, files) {
  if (!files?.length) return { images: [], videos: [] }

  const formData = new FormData()
  for (const file of files) {
    const uploadFile = await getUploadFile(file)
    formData.append("files", uploadFile)
  }
  return uploadFormData(path, formData)
}

export async function uploadHygieneVideo(file) {
  const formData = new FormData()
  const uploadFile = await getUploadFile(file)
  formData.append("video", uploadFile)
  return uploadFormData("/api/hygiene/me", formData)
}

export async function deleteHygieneVideo() {
  const token = getStoredToken()
  const headers = {
    "Content-Type": "application/json",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  
  const res = await fetch(`${API_URL}/api/hygiene/me`, {
    method: "DELETE",
    headers,
  })
  
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.message || "Failed to delete hygiene video", res.status)
  }
  return data
}

export async function uploadQuotation(enquiryId, amount, notes, file) {
  const formData = new FormData()
  const uploadFile = await getUploadFile(file)
  formData.append("quotation", uploadFile)
  formData.append("quotationAmount", String(amount))
  if (notes?.trim()) {
    formData.append("quotationNotes", notes.trim())
  }
  return uploadFormData(`/api/bulk-enquiries/${enquiryId}/quotation`, formData)
}


