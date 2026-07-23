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

const CSC_BASE = process.env.CSC_API_BASE || "https://api.countrystatecity.in/v1"
const COUNTRY = "IN"
const STATES_CACHE_TTL_MS = 24 * 60 * 60 * 1000

let statesCache = null
let statesCacheAt = 0

function getFallback(pathStr) {
  try {
    const raw = fs.readFileSync(citiesFilePath, "utf8")
    const localData = JSON.parse(raw)

    const cityMatch = pathStr.match(/\/countries\/[A-Z]{2}\/states\/([A-Za-z0-9-]+)\/cities/)
    if (cityMatch) {
      const stateCode = cityMatch[1].toUpperCase()
      const stateName = ISO_STATE_MAP[stateCode]
      if (!stateName) return []

      return localData
        .filter((c) => c.state?.toLowerCase() === stateName.toLowerCase() || (stateCode === "HP" && c.state?.toLowerCase() === "himachal praddesh"))
        .map((c, idx) => ({
          id: c.id || `${stateCode}-${idx}`,
          name: c.name,
          stateCode: stateCode,
          stateName: stateName
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

async function cscRequest(path) {
  const apiKey = process.env.CSC_API_KEY

  // Fallback if API key is not set or invalid placeholder
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    return getFallback(path)
  }

  try {
    const res = await fetch(`${CSC_BASE}${path}`, {
      headers: { "X-CSCAPI-KEY": apiKey },
    })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      console.warn(`Location API error: ${res.status}. Falling back to local data.`)
      return getFallback(path)
    }

    if (Array.isArray(json)) return json
    return json?.data || json?.states || json?.cities || []
  } catch (error) {
    console.warn("Location API request failed. Falling back to local data:", error.message)
    return getFallback(path)
  }
}

async function getStates() {
  const apiKey = process.env.CSC_API_KEY
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    return getFallback("/states")
  }
  if (statesCache && Date.now() - statesCacheAt < STATES_CACHE_TTL_MS) {
    return statesCache
  }
  try {
    const states = await cscRequest(`/countries/${COUNTRY}/states`)
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
    const cities = await cscRequest(`/countries/${COUNTRY}/states/${stateCode}/cities`)

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
        stateCode: city.state_code || stateCode,
        stateName: city.state_name || null,
      })
    }

    res.json({ cities: list.sort((a, b) => a.name.localeCompare(b.name)) })
  } catch (error) {
    console.error("Cities fetch error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch cities" })
  }
})

router.get("/detect", async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: "lat and lng are required" })
  }

  try {
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
    const geo = await geoRes.json().catch(() => ({}))

    if (!geoRes.ok) {
      return res.status(502).json({ message: "Could not resolve location" })
    }

    const rawCity = geo.city || geo.locality || geo.localityInfo?.administrative?.[2]?.name || ""
    const rawState = geo.principalSubdivision || ""
    const rawStateCode = geo.principalSubdivisionCode || ""

    const states = await getStates()
    const stateMatch = matchState(states, rawState, rawStateCode)

    let city = rawCity
    if (stateMatch?.iso2 && rawCity) {
      const cities = await cscRequest(`/countries/${COUNTRY}/states/${stateMatch.iso2}/cities`)
      const cityMatch =
        cities.find((c) => c.name?.toLowerCase() === rawCity.toLowerCase()) ||
        cities.find((c) => c.name?.toLowerCase().includes(rawCity.toLowerCase())) ||
        cities[0]
      if (cityMatch?.name) city = cityMatch.name
    }

    res.json({
      state: stateMatch?.name || rawState,
      stateCode: stateMatch?.iso2 || rawStateCode.replace(/^IN-/i, "") || null,
      city,
    })
  } catch (error) {
    console.error("Location detect error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to detect location" })
  }
})

export default router
