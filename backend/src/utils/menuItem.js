import { normalizePublicUrl, normalizePublicUrls } from "./mediaUrl.js"

export function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function formatMenuItem(item) {
  const rawImages = parseJsonArray(item.images)
  if (rawImages.length === 0 && item.image) rawImages.push(item.image)

  const images = normalizePublicUrls(rawImages)
  const videos = normalizePublicUrls(parseJsonArray(item.videos))
  const image = normalizePublicUrl(item.image) || images[0] || null

  return {
    ...item,
    is_available: item.is_available === undefined || item.is_available === null ? true : Boolean(item.is_available),
    isAvailable: item.is_available === undefined || item.is_available === null ? true : Boolean(item.is_available),
    is_combo: Boolean(item.is_combo),
    isCombo: Boolean(item.is_combo),
    packaging_type: item.packaging_type || "packaged",
    packagingType: item.packaging_type || "packaged",
    gst_rate: item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.category === "grocery" ? (item.packaging_type === "loose" ? 0 : 5) : 5),
    gstRate: item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.category === "grocery" ? (item.packaging_type === "loose" ? 0 : 5) : 5),
    local_name: item.local_name || null,
    localName: item.local_name || null,
    comboItems: item.comboItems || [],
    approval_status: item.approval_status || "pending",
    approvalStatus: item.approval_status || "pending",
    review_comment: item.review_comment || null,
    reviewComment: item.review_comment || null,
    images,
    videos,
    image,
  }
}

export function normalizeMediaPayload(body) {
  const images = parseJsonArray(body.images)
  const videos = parseJsonArray(body.videos)

  if (images.length === 0 && body.image?.trim()) {
    images.push(body.image.trim())
  }

  return {
    images,
    videos,
    image: images[0] || null,
  }
}
