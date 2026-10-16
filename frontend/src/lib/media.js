const API_URL = (import.meta.env.VITE_API_URL || "https://backend.atleast80.com").replace(/\/$/, "")

export function resolveMediaUrl(url) {
  if (!url) return null

  if (url.startsWith("/uploads/")) return `${API_URL}${url}`
  if (url.startsWith("/")) return url
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${API_URL}/${url}`
  }

  // Normalize stored URLs: always map uploads to the currently active API host
  try {
    const parsed = new URL(url)
    const api = new URL(API_URL)
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${api.origin}${parsed.pathname}${parsed.search}`
    }
    if (parsed.host === api.host) {
      return `${api.origin}${parsed.pathname}${parsed.search}`
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
