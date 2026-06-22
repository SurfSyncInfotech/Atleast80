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
