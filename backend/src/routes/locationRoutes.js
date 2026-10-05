import { Router } from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const citiesFilePath = path.join(__dirname, "../data/cities.json")

const STATE_ISO_MAP = {
  "Andaman and Nicobar Islands": "AN",
  "Andhra Pradesh": "AP",
  "Arunachal Pradesh": "AR",
  "Assam": "AS",
  "Bihar": "BR",
  "Chandigarh": "CH",
  "Chhattisgarh": "CG",
  "Dadra and Nagar Haveli": "DN",
  "Delhi": "DL",
  "Goa": "GA",
  "Gujarat": "GJ",
  "Haryana": "HR",
  "Himachal Pradesh": "HP",
  "Himachal Praddesh": "HP",
  "Jammu and Kashmir": "JK",
  "Jharkhand": "JH",
  "Karnataka": "KA",
  "Kerala": "KL",
  "Madhya Pradesh": "MP",
  "Maharashtra": "MH",
  "Manipur": "MN",
  "Meghalaya": "ML",
  "Mizoram": "MZ",
  "Nagaland": "NL",
  "Odisha": "OR",
  "Puducherry": "PY",
  "Punjab": "PB",
  "Rajasthan": "RJ",
  "Sikkim": "SK",
  "Tamil Nadu": "TN",
  "Telangana": "TG",
  "Tripura": "TR",
  "Uttar Pradesh": "UP",
  "Uttarakhand": "UK",
  "West Bengal": "WB"
}

const ISO_STATE_MAP = Object.entries(STATE_ISO_MAP).reduce((acc, [name, code]) => {
  acc[code] = name
  return acc
}, {})

const router = Router()

const SURFSYNC_BASE = process.env.SURFSYNC_API_BASE || "http://backend.surfsyncinfotech.in/api/surfsync/v1"
const SURFSYNC_API_KEY = process.env.SURFSYNC_API_KEY || "ssx_641e42540bd2ce19d5457e5344650250e7a34d96e632338a"
const STATES_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CITIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000

let statesCache = null
let statesCacheAt = 0

// Per-state cities cache: { [stateCode]: { data: [], cachedAt: timestamp } }
const citiesCache = {}

function getFallback(pathStr, stateCode = null) {
  try {
    const raw = fs.readFileSync(citiesFilePath, "utf8")
    const localData = JSON.parse(raw)

    const cityMatch = pathStr.match(/\/cities/)
    if (cityMatch) {
      let filtered = localData
      if (stateCode) {
        filtered = localData.filter((c) => (STATE_ISO_MAP[c.state] || "").toUpperCase() === stateCode.toUpperCase())
      }
      return filtered.map((c, idx) => ({
        id: c.id || `fallback-${idx}`,
        name: c.name,
        stateCode: STATE_ISO_MAP[c.state] || "MH",
        stateName: c.state
      }))
    }

    if (pathStr.includes("/states")) {
      const states = Object.entries(STATE_ISO_MAP).map(([name, code], idx) => ({
        id: 4000 + idx,
        name: name === "Himachal Praddesh" ? "Himachal Pradesh" : name,
        iso2: code
      }))
      const unique = []
      const seen = new Set()
      for (const s of states) {
        if (!seen.has(s.iso2)) {
          seen.add(s.iso2)
          unique.push(s)
        }
      }
      return unique
    }
  } catch (err) {
    console.warn("Failed to load local fallback data:", err.message)
  }
  return []
}

function normalizeStateName(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/^national capital territory of\s+/i, "")
    .replace(/^union territory of\s+/i, "")
    .replace(/\s+and\s+/g, " and ")
    .trim()
}

const FALLBACK_STATES = getFallback("/states")

async function surfSyncRequest(path, queryParams = {}) {
  const apiKey = SURFSYNC_API_KEY

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    return getFallback(path)
  }

  try {
    const url = new URL(`${SURFSYNC_BASE}${path}`)
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val)
      }
    })

    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(1500),
    })

    if (!res.ok) {
      console.warn(`SurfSync Location API error: ${res.status}. Falling back to local data.`)
      return getFallback(path, queryParams["filter[state]"])
    }

    const json = await res.json().catch(() => null)
    if (!json) return getFallback(path, queryParams["filter[state]"])

    if (json.data && Array.isArray(json.data)) {
      if (path.includes("/states")) {
        return json.data.map((s) => ({
          id: s.id || s.stateCode,
          name: s.name,
          iso2: s.stateCode || s.code
        }))
      } else {
        return json.data.map((c) => ({
          id: c.id,
          name: c.name,
          stateCode: c.stateCode || c.state,
          stateName: c.stateName || c.state
        }))
      }
    }

    return getFallback(path)
  } catch (error) {
    console.warn("SurfSync Location API request failed. Falling back to local data:", error.message)
    return getFallback(path)
  }
}

async function getStates() {
  if (statesCache && Date.now() - statesCacheAt < STATES_CACHE_TTL_MS) {
    return statesCache
  }
  try {
    const states = await surfSyncRequest("/states")
    statesCache = states
    statesCacheAt = Date.now()
    return states
  } catch (error) {
    console.warn("Failed to load states, using fallback:", error.message)
    return getFallback("/states")
  }
}

function matchState(states, rawName, rawCode) {
  const normalized = normalizeStateName(rawName)
  const code = rawCode?.replace(/^IN-/i, "")?.toUpperCase()

  return (
    states.find((s) => s.iso2?.toUpperCase() === code) ||
    states.find((s) => normalizeStateName(s.name) === normalized) ||
    states.find((s) => normalized.includes(normalizeStateName(s.name))) ||
    states.find((s) => normalizeStateName(s.name).includes(normalized))
  )
}

router.get("/states", async (req, res) => {
  try {
    const q = req.query.q?.trim().toLowerCase()
    const states = await getStates()

    res.json({
      states: states
        .filter((s) => !q || s.name?.toLowerCase().includes(q))
        .map((s) => ({ name: s.name, iso2: s.iso2, id: s.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })
  } catch (error) {
    console.error("States fetch error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch states" })
  }
})

router.get("/cities", async (req, res) => {
  const stateCode = req.query.state?.trim()
  if (!stateCode) {
    return res.status(400).json({ message: "State code is required" })
  }

  try {
    const q = req.query.q?.trim().toLowerCase()

    // Return from cache if available and fresh (skip cache if filtering by query)
    const cached = citiesCache[stateCode]
    if (!q && cached && Date.now() - cached.cachedAt < CITIES_CACHE_TTL_MS) {
      return res.json({ cities: cached.data })
    }

    const cities = await surfSyncRequest("/cities", { "filter[state]": stateCode })

    const seen = new Set()
    const list = []
    for (const city of cities) {
      const name = city.name?.trim()
      if (!name || seen.has(name.toLowerCase())) continue
      if (q && !name.toLowerCase().includes(q)) continue
      seen.add(name.toLowerCase())
      list.push({
        id: city.id,
        name,
        stateCode: city.stateCode || stateCode,
        stateName: city.stateName || null,
      })
    }

    const sorted = list.sort((a, b) => a.name.localeCompare(b.name))

    // Store in cache (only when not filtering by query)
    if (!q) {
      citiesCache[stateCode] = { data: sorted, cachedAt: Date.now() }
    }

    res.json({ cities: sorted })
  } catch (error) {
    console.error("Cities fetch error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch cities" })
  }
})

router.get("/reverse", async (req, res) => {
  const lat = req.query.lat
  const lng = req.query.lng || req.query.lon

  console.log("[BACKEND LOCATION TRACE] GET /api/locations/reverse received", { lat, lng, ip: req.ip })

  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({ message: "Valid numeric lat and lng parameters are required" })
  }

  try {
    const url = `${SURFSYNC_BASE}/reverse?lat=${lat}&lng=${lng}`
    const response = await fetch(url, {
      headers: { "X-API-Key": SURFSYNC_API_KEY }
    })

    if (!response.ok) {
      console.warn("[BACKEND LOCATION TRACE] SurfSync service returned status:", response.status)
      return res.status(response.status).json({ message: "SurfSync location service unavailable" })
    }

    const data = await response.json()
    console.log("[BACKEND LOCATION TRACE] Reverse result:", {
      city: data.city,
      address: data.formattedAddress || data.displayName,
      raw: data
    })
    res.json(data)
  } catch (error) {
    console.error("SurfSync reverse geocode error:", error)
    res.status(500).json({ message: "Failed to reverse geocode location" })
  }
})

router.get("/search", async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) {
    return res.status(400).json({ message: "Query parameter q is required" })
  }

  try {
    const url = new URL(`${SURFSYNC_BASE}/search`)
    url.searchParams.append("q", q)
    if (req.query.state) url.searchParams.append("state", req.query.state)
    if (req.query.limit) url.searchParams.append("limit", req.query.limit)

    const response = await fetch(url.toString(), {
      headers: { "X-API-Key": SURFSYNC_API_KEY }
    })

    if (!response.ok) {
      return res.status(response.status).json({ message: "Search service unavailable" })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error("SurfSync location search error:", error)
    res.status(500).json({ message: "Failed to search location" })
  }
})

router.get("/detect", async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng || req.query.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: "lat and lng are required" })
  }

  try {
    const url = `${SURFSYNC_BASE}/reverse?lat=${lat}&lng=${lng}`
    const geoRes = await fetch(url, {
      headers: { "X-API-Key": SURFSYNC_API_KEY }
    })
    const geo = await geoRes.json().catch(() => ({}))

    const city = geo.city || geo.suburb || geo.district || ""
    const state = geo.state || ""

    res.json({
      state,
      stateCode: geo.countryCode || null,
      city,
      formattedAddress: geo.formattedAddress || geo.displayName || ""
    })
  } catch (error) {
    console.error("Location detect error:", error)
    res.status(500).json({ message: "Failed to detect location" })
  }
})

export default router
