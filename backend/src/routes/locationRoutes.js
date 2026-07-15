import { Router } from "express"

const router = Router()

const CSC_BASE = process.env.CSC_API_BASE || "https://api.countrystatecity.in/v1"
const COUNTRY = "IN"
const STATES_CACHE_TTL_MS = 24 * 60 * 60 * 1000

let statesCache = null
let statesCacheAt = 0

function normalizeStateName(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/^national capital territory of\s+/i, "")
    .replace(/^union territory of\s+/i, "")
    .replace(/\s+and\s+/g, " and ")
    .trim()
}

const FALLBACK_STATES = [
  { id: 1, name: "Uttar Pradesh", iso2: "UP" },
  { id: 2, name: "Delhi", iso2: "DL" },
  { id: 3, name: "Maharashtra", iso2: "MH" },
  { id: 4, name: "Karnataka", iso2: "KA" },
  { id: 5, name: "Telangana", iso2: "TG" },
  { id: 6, name: "Gujarat", iso2: "GJ" },
  { id: 7, name: "Tamil Nadu", iso2: "TN" },
  { id: 8, name: "West Bengal", iso2: "WB" },
  { id: 9, name: "Rajasthan", iso2: "RJ" },
  { id: 10, name: "Haryana", iso2: "HR" },
  { id: 11, name: "Madhya Pradesh", iso2: "MP" },
  { id: 12, name: "Punjab", iso2: "PB" },
  { id: 13, name: "Bihar", iso2: "BR" },
]

const FALLBACK_CITIES = {
  UP: [
    { id: 101, name: "Lucknow", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 102, name: "Kanpur", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 103, name: "Noida", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 104, name: "Ghaziabad", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 105, name: "Varanasi", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 106, name: "Prayagraj", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 107, name: "Agra", stateCode: "UP", stateName: "Uttar Pradesh" },
    { id: 108, name: "Meerut", stateCode: "UP", stateName: "Uttar Pradesh" },
  ],
  DL: [
    { id: 201, name: "New Delhi", stateCode: "DL", stateName: "Delhi" },
    { id: 202, name: "Delhi", stateCode: "DL", stateName: "Delhi" },
    { id: 203, name: "Dwarka", stateCode: "DL", stateName: "Delhi" },
  ],
  MH: [
    { id: 301, name: "Mumbai", stateCode: "MH", stateName: "Maharashtra" },
    { id: 302, name: "Pune", stateCode: "MH", stateName: "Maharashtra" },
    { id: 303, name: "Nagpur", stateCode: "MH", stateName: "Maharashtra" },
    { id: 304, name: "Thane", stateCode: "MH", stateName: "Maharashtra" },
    { id: 305, name: "Nashik", stateCode: "MH", stateName: "Maharashtra" },
  ],
  KA: [
    { id: 401, name: "Bengaluru", stateCode: "KA", stateName: "Karnataka" },
    { id: 402, name: "Mysuru", stateCode: "KA", stateName: "Karnataka" },
    { id: 403, name: "Hubli", stateCode: "KA", stateName: "Karnataka" },
    { id: 404, name: "Mangaluru", stateCode: "KA", stateName: "Karnataka" },
  ],
  TG: [
    { id: 501, name: "Hyderabad", stateCode: "TG", stateName: "Telangana" },
    { id: 502, name: "Warangal", stateCode: "TG", stateName: "Telangana" },
    { id: 503, name: "Nizamabad", stateCode: "TG", stateName: "Telangana" },
  ],
  GJ: [
    { id: 601, name: "Ahmedabad", stateCode: "GJ", stateName: "Gujarat" },
    { id: 602, name: "Surat", stateCode: "GJ", stateName: "Gujarat" },
    { id: 603, name: "Vadodara", stateCode: "GJ", stateName: "Gujarat" },
    { id: 604, name: "Rajkot", stateCode: "GJ", stateName: "Gujarat" },
  ],
  TN: [
    { id: 701, name: "Chennai", stateCode: "TN", stateName: "Tamil Nadu" },
    { id: 702, name: "Coimbatore", stateCode: "TN", stateName: "Tamil Nadu" },
    { id: 703, name: "Madurai", stateCode: "TN", stateName: "Tamil Nadu" },
  ],
  WB: [
    { id: 801, name: "Kolkata", stateCode: "WB", stateName: "West Bengal" },
    { id: 802, name: "Howrah", stateCode: "WB", stateName: "West Bengal" },
    { id: 803, name: "Darjeeling", stateCode: "WB", stateName: "West Bengal" },
  ],
  RJ: [
    { id: 901, name: "Jaipur", stateCode: "RJ", stateName: "Rajasthan" },
    { id: 902, name: "Jodhpur", stateCode: "RJ", stateName: "Rajasthan" },
    { id: 903, name: "Udaipur", stateCode: "RJ", stateName: "Rajasthan" },
    { id: 904, name: "Kota", stateCode: "RJ", stateName: "Rajasthan" },
  ],
  HR: [
    { id: 1001, name: "Gurugram", stateCode: "HR", stateName: "Haryana" },
    { id: 1002, name: "Faridabad", stateCode: "HR", stateName: "Haryana" },
    { id: 1003, name: "Panipat", stateCode: "HR", stateName: "Haryana" },
  ],
  MP: [
    { id: 1101, name: "Bhopal", stateCode: "MP", stateName: "Madhya Pradesh" },
    { id: 1102, name: "Indore", stateCode: "MP", stateName: "Madhya Pradesh" },
    { id: 1103, name: "Gwalior", stateCode: "MP", stateName: "Madhya Pradesh" },
    { id: 1104, name: "Jabalpur", stateCode: "MP", stateName: "Madhya Pradesh" },
  ],
  PB: [
    { id: 1201, name: "Ludhiana", stateCode: "PB", stateName: "Punjab" },
    { id: 1202, name: "Amritsar", stateCode: "PB", stateName: "Punjab" },
    { id: 1203, name: "Jalandhar", stateCode: "PB", stateName: "Punjab" },
    { id: 1204, name: "Patiala", stateCode: "PB", stateName: "Punjab" },
  ],
  BR: [
    { id: 1301, name: "Patna", stateCode: "BR", stateName: "Bihar" },
    { id: 1302, name: "Gaya", stateCode: "BR", stateName: "Bihar" },
    { id: 1303, name: "Muzaffarpur", stateCode: "BR", stateName: "Bihar" },
    { id: 1304, name: "Bhagalpur", stateCode: "BR", stateName: "Bihar" },
  ],
}

async function cscRequest(path) {
  const apiKey = process.env.CSC_API_KEY
  
  const getFallback = () => {
    const cityMatch = path.match(/\/countries\/[A-Z]{2}\/states\/([A-Za-z0-9-]+)\/cities/)
    if (cityMatch) {
      const stateCode = cityMatch[1].toUpperCase()
      return FALLBACK_CITIES[stateCode] || []
    }
    if (path.includes("/states")) {
      return FALLBACK_STATES
    }
    return []
  }

  // Fallback if API key is not set or invalid placeholder
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    return getFallback()
  }

  try {
    const res = await fetch(`${CSC_BASE}${path}`, {
      headers: { "X-CSCAPI-KEY": apiKey },
    })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      console.warn(`Location API error: ${res.status}. Falling back to local data.`)
      return getFallback()
    }

    if (Array.isArray(json)) return json
    return json?.data || json?.states || json?.cities || []
  } catch (error) {
    console.warn("Location API request failed. Falling back to local data:", error.message)
    return getFallback()
  }
}

async function getStates() {
  const apiKey = process.env.CSC_API_KEY
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    return FALLBACK_STATES
  }
  if (statesCache && Date.now() - statesCacheAt < STATES_CACHE_TTL_MS) {
    return statesCache
  }
  try {
    const states = await cscRequest(`/countries/${COUNTRY}/states`)
    if (states === FALLBACK_STATES) {
      return states
    }
    statesCache = states
    statesCacheAt = Date.now()
    return states
  } catch (error) {
    console.warn("Failed to load states, using fallback:", error.message)
    return FALLBACK_STATES
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
