export function getPublicApiBase() {
  return (process.env.PUBLIC_API_URL || "https://backend.atleast80.com").replace(/\/$/, "")
}

export function normalizePublicUrl(url) {
  if (!url || typeof url !== "string") return url || null

  const base = getPublicApiBase()
  let baseOrigin
  try {
    baseOrigin = new URL(base).origin
  } catch {
    return url
  }

  if (url.startsWith("/")) {
    return `${baseOrigin}${url}`
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${baseOrigin}/${url.replace(/^\//, "")}`
  }

  try {
    const parsed = new URL(url)
    const api = new URL(base)
    if (parsed.host === api.host) {
      return `${api.origin}${parsed.pathname}${parsed.search}`
    }
  } catch {
    // keep original
  }

  return url
}

export function normalizePublicUrls(urls) {
  return (urls || []).map(normalizePublicUrl).filter(Boolean)
}

export function formatKitchen(kitchen) {
  if (!kitchen) return kitchen
  return {
    ...kitchen,
    image: normalizePublicUrl(kitchen.image),
    cover_image: normalizePublicUrl(kitchen.cover_image),
    fssai_license: normalizePublicUrl(kitchen.fssai_license),
  }
}

export function formatKitchens(kitchens) {
  return (kitchens || []).map(formatKitchen)
}
