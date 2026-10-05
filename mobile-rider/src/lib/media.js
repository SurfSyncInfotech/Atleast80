import { API_URL } from "./api"

const cleanedApiUrl = API_URL.replace(/\/$/, "")

export function resolveMediaUrl(url) {
  if (!url) return null

  if (url.startsWith("/")) return `${cleanedApiUrl}${url}`
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${cleanedApiUrl}/${url}`
  }

  try {
    if (url.includes(cleanedApiUrl)) {
      return url
    }
  } catch {
    // fall through
  }

  return url
}
