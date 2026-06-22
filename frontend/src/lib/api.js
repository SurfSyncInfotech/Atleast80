import { getStoredToken } from "./authStorage"

const API_URL = import.meta.env.VITE_API_URL || "https://backend.atleast80.com"

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
  return uploadFormData("/api/menu/upload", formData)
}

export async function uploadStoryFiles(files) {
  if (!files?.length) return { stories: [] }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
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
  return uploadFormData("/api/kitchens/me/logo", formData)
}

export async function uploadKitchenCover(file) {
  const formData = new FormData()
  formData.append("cover", file)
  return uploadFormData("/api/kitchens/me/cover", formData)
}

export async function registerKitchen(form, fssaiLicenseFile) {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  formData.append("fssaiLicense", fssaiLicenseFile)
  return uploadFormData("/api/auth/kitchen/register", formData)
}

export async function uploadFiles(path, files) {
  if (!files?.length) return { images: [], videos: [] }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  return uploadFormData(path, formData)
}
