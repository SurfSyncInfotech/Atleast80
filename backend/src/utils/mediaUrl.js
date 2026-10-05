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

function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getActiveFestivalOffer(kitchen) {
  if (!kitchen) return null
  const enabled = Boolean(kitchen.festival_offer_enabled)
  const percent = Number(kitchen.festival_offer_discount_percent || 0)
  if (!enabled || percent <= 0) {
    return null
  }

  const now = new Date()
  if (kitchen.festival_offer_start_date) {
    const start = new Date(kitchen.festival_offer_start_date)
    if (!isNaN(start.getTime()) && now < start) {
      return null // Not started yet
    }
  }

  if (kitchen.festival_offer_end_date) {
    const end = new Date(kitchen.festival_offer_end_date)
    if (!isNaN(end.getTime()) && now > end) {
      return null // Expired
    }
  }

  const img1 = normalizePublicUrl(kitchen.festival_offer_image) || null
  const img2 = normalizePublicUrl(kitchen.festival_offer_image_2) || null
  const images = [img1, img2].filter(Boolean)

  return {
    active: true,
    title: kitchen.festival_offer_title || "Festival Special",
    category: kitchen.festival_offer_category || "both",
    discountPercent: percent,
    startDate: kitchen.festival_offer_start_date || null,
    endDate: kitchen.festival_offer_end_date || null,
    description: kitchen.festival_offer_description || null,
    image: img1 || img2 || null,
    image2: img2,
    images: images.length > 0 ? images : ["/festival_offer_default.jpg"],
  }
}

export function formatKitchen(kitchen) {
  if (!kitchen) return kitchen
  const activeOffer = getActiveFestivalOffer(kitchen)
  const img1 = normalizePublicUrl(kitchen.festival_offer_image) || null
  const img2 = normalizePublicUrl(kitchen.festival_offer_image_2) || null
  const images = [img1, img2].filter(Boolean)

  return {
    ...kitchen,
    image: normalizePublicUrl(kitchen.image),
    cover_image: normalizePublicUrl(kitchen.cover_image),
    fssai_license: normalizePublicUrl(kitchen.fssai_license),
    kitchenImages: normalizePublicUrls(parseJsonArray(kitchen.kitchen_images)),
    festivalOffer: activeOffer,
    festival_offer_enabled: Boolean(kitchen.festival_offer_enabled),
    festival_offer_title: kitchen.festival_offer_title || null,
    festival_offer_category: kitchen.festival_offer_category || "both",
    festival_offer_discount_percent: Number(kitchen.festival_offer_discount_percent || 0),
    festival_offer_start_date: kitchen.festival_offer_start_date || null,
    festival_offer_end_date: kitchen.festival_offer_end_date || null,
    festival_offer_description: kitchen.festival_offer_description || null,
    festival_offer_image: img1,
    festival_offer_image_2: img2,
    festival_offer_images: images,
  }
}

export function formatKitchens(kitchens) {
  return (kitchens || []).map(formatKitchen)
}
