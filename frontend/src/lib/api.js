import { getStoredToken } from "./authStorage"

const API_URL = import.meta.env.VITE_API_URL || "https://backend.atleast80.com"

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function getToken(role) {
  return getStoredToken(role)
}

export async function api(path, options = {}, role) {
  const token = getToken(role)
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  const headers = {
    "X-Client": "web",
    ...options.headers,
  }

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  } else if (isFormData) {
    delete headers["Content-Type"]
  }

  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.message || "Something went wrong", res.status)
  }

  return data
}

export async function uploadMenuFiles(files) {
  if (!files?.length) return { images: [], videos: [] }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  return uploadFormData("/api/menu/upload", formData, "kitchen")
}

export async function uploadStoryFiles(files) {
  if (!files?.length) return { stories: [] }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  return uploadFormData("/api/stories", formData, "kitchen")
}

async function uploadFormData(path, formData, role) {
  const token = getToken(role)
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    })
  } catch {
    throw new ApiError(
      "Upload failed — the server may have rejected the file before it reached the API (check nginx client_max_body_size)",
      0
    )
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 413) {
    throw new ApiError(
      "Upload rejected: server body-size limit too small. Increase nginx client_max_body_size on backend.atleast80.com",
      413
    )
  }

  if (!res.ok) {
    throw new ApiError(data.message || "Upload failed", res.status)
  }

  return data
}

export async function uploadKitchenLogo(file) {
  const formData = new FormData()
  formData.append("logo", file)
  return uploadFormData("/api/kitchens/me/logo", formData, "kitchen")
}

export async function uploadKitchenCover(file) {
  const formData = new FormData()
  formData.append("cover", file)
  return uploadFormData("/api/kitchens/me/cover", formData, "kitchen")
}

export async function uploadKitchenFestivalOfferImage(file, slot = 1) {
  const formData = new FormData()
  formData.append("image", file)
  return uploadFormData(`/api/kitchens/me/festival-offer/image?slot=${slot}`, formData, "kitchen")
}

export async function uploadKitchenImages(files) {
  if (!files?.length) return { kitchenImages: [] }
  const formData = new FormData()
  files.forEach((file) => formData.append("images", file))
  return uploadFormData("/api/kitchens/me/images", formData, "kitchen")
}

export async function uploadHygieneVideo(blob) {
  const formData = new FormData()
  formData.append("video", blob, "hygiene-daily.webm")
  return uploadFormData("/api/hygiene/me", formData, "kitchen")
}

export async function deleteHygieneVideo() {
  return api("/api/hygiene/me", { method: "DELETE" }, "kitchen")
}

export async function uploadKitchenFssaiLicense(file) {
  const formData = new FormData()
  formData.append("fssaiLicense", file)
  return uploadFormData("/api/kitchens/me/fssai-license", formData, "kitchen")
}

export async function registerKitchen(form, fssaiLicenseFile, aadhaarCardFile, aadhaarCardBackFile, panCardFile) {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  formData.append("appVersion", "1.0.0")
  formData.append("fssaiLicense", fssaiLicenseFile)
  formData.append("aadhaarCard", aadhaarCardFile)
  formData.append("aadhaarCardBack", aadhaarCardBackFile)
  formData.append("panCard", panCardFile)
  return uploadFormData("/api/auth/kitchen/register", formData, "kitchen")
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

export async function uploadPartnerAgreementPdf(file) {
  const formData = new FormData()
  formData.append("agreement", file)
  return uploadFormData("/api/admin/settings/partner-agreement", formData, "admin")
}

export async function uploadTrainingVideo(file) {
  const formData = new FormData()
  formData.append("video", file)
  return uploadFormData("/api/admin/settings/training-video", formData, "admin")
}

export async function uploadFiles(path, files) {
  if (!files?.length) return { images: [], videos: [] }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  return uploadFormData(path, formData)
}

export async function deletePartnerAgreementPdf() {
  return api("/api/admin/settings/partner-agreement", { method: "DELETE" }, "admin")
}

export async function deleteTrainingVideo() {
  return api("/api/admin/settings/training-video", { method: "DELETE" }, "admin")
}

// Rider Agreement
export async function getRiderAgreement() {
  return api("/api/rider/rider-agreement")
}

export async function uploadRiderAgreementPdf(file) {
  const formData = new FormData()
  formData.append("agreement", file)
  return uploadFormData("/api/admin/settings/rider-agreement", formData, "admin")
}

export async function deleteRiderAgreementPdf() {
  return api("/api/admin/settings/rider-agreement", { method: "DELETE" }, "admin")
}

// User Agreement & Terms
export async function getUserAgreement() {
  return api("/api/auth/user-agreement")
}

export async function uploadUserAgreementPdf(file) {
  const formData = new FormData()
  formData.append("agreement", file)
  return uploadFormData("/api/admin/settings/user-agreement", formData, "admin")
}

export async function deleteUserAgreementPdf() {
  return api("/api/admin/settings/user-agreement", { method: "DELETE" }, "admin")
}

// CMS Policies (Privacy Policy & Terms of Service)
export async function getCmsPolicy(type) {
  return api(`/api/cms/policies/${type}`)
}

export async function getAdminCmsPolicy(type) {
  return api(`/api/cms/admin/policies/${type}`, {}, "admin")
}

export async function updateAdminCmsPolicy(type, sections) {
  return api(`/api/cms/admin/policies/${type}`, {
    method: "PUT",
    body: JSON.stringify({ sections }),
  }, "admin")
}

// Support Contact Settings
export async function getAdminContactSettings() {
  return api("/api/admin/settings/contact", {}, "admin")
}

export async function updateAdminContactSettings(data) {
  return api("/api/admin/settings/contact", {
    method: "PUT",
    body: JSON.stringify(data),
  }, "admin")
}

export async function getPublicContactSettings() {
  return api("/api/cms/contact")
}


