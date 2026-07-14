import { API_URL } from "./api"

const cleanedApiUrl = API_URL.replace(/\/$/, "")

export function resolveMediaUrl(url) {
  if (!url) return null

  if (url.startsWith("/")) return `${cleanedApiUrl}${url}`
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${cleanedApiUrl}/${url}`
  }

  // Normalize stored URLs: http → https when they point at our API host
  try {
    // In React Native, the global URL constructor is available or can fall back
    if (url.includes(cleanedApiUrl)) {
      return url
    }
  } catch {
    // fall through
  }

  return url
}

export function resolveMenuItemMedia(item) {
  if (!item) return item

  const rawImages = Array.isArray(item.images)
    ? item.images
    : item.image
      ? [item.image]
      : []

  const images = rawImages.map(resolveMediaUrl).filter(Boolean)
  const videos = (item.videos || []).map(resolveMediaUrl).filter(Boolean)
  const image = resolveMediaUrl(item.image) || images[0] || null

  return { ...item, image, images, videos }
}

export function resolveStoryGroups(groups) {
  return (groups || []).map((group) => ({
    ...group,
    kitchenImage: resolveMediaUrl(group.kitchenImage),
    stories: (group.stories || []).map((story) => ({
      ...story,
      mediaUrl: resolveMediaUrl(story.mediaUrl),
    })),
  }))
}
