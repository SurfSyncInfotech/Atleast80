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


function stripPlusCode(addr) {
  if (!addr || typeof addr !== "string") return addr || ""
  return addr.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,5},?\s*/i, "").trim()
}
const router = Router()

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDdkmLpJjLrOLBkqceMQ63ZZodNgksd1Uc"
const SURFSYNC_BASE = process.env.SURFSYNC_API_BASE || "http://backend.surfsyncinfotech.in/api/surfsync/v1"
const SURFSYNC_API_KEY = process.env.SURFSYNC_API_KEY || "ssx_641e42540bd2ce19d5457e5344650250e7a34d96e632338a"

// Helper: load cities list from local cities.json once
let localCitiesCache = null
function getLocalCities() {
  if (!localCitiesCache) {
    try {
      const raw = fs.readFileSync(citiesFilePath, "utf8")
      localCitiesCache = JSON.parse(raw)
    } catch (e) {
      localCitiesCache = []
    }
  }
  return localCitiesCache
}

// Dynamically resolve the true municipal city/taluka from candidates against the recognized cities list
function resolveTrueCity(candidateNames, stateName, fallbackCity) {
  if (!candidateNames || candidateNames.length === 0) return fallbackCity || ""
  const allCities = getLocalCities()
  const stateCities = stateName
    ? allCities.filter(c => (c.state || "").toLowerCase() === stateName.toLowerCase())
    : allCities

  for (const candidate of candidateNames) {
    if (!candidate) continue
    const matched = stateCities.find(c => (c.name || "").toLowerCase() === candidate.toLowerCase())
    if (matched) {
      return matched.name
    }
  }
  return fallbackCity || candidateNames[0] || ""
}

// Helper: parse Google Geocoding response into normalized Atleast80 location structure
function parseGoogleGeocodeResult(result, lat, lng, allResults = []) {
  if (!result) return null
  const components = result.address_components || []
  let premise = ""
  let subpremise = ""
  let route = ""
  let neighborhood = ""
  let sublocality3 = ""
  let sublocality2 = ""
  let sublocality1 = ""
  let locality = ""
  let admin4 = ""
  let admin3 = ""
  let admin2 = ""
  let admin1 = ""
  let admin1Code = ""
  let postalCode = ""
  let country = ""
  let countryCode = ""

  // Collect candidate city names across result and all surrounding results dynamically
  const candidateSet = new Set()
  const resultsToScan = Array.isArray(allResults) && allResults.length > 0 ? allResults : [result]

  for (const r of resultsToScan) {
    for (const c of (r.address_components || [])) {
      const types = c.types || []
      if (types.includes("administrative_area_level_1") && !admin1) {
        admin1 = c.long_name
        admin1Code = c.short_name
      }
      if (types.includes("administrative_area_level_4")) {
        admin4 = admin4 || c.long_name
        candidateSet.add(c.long_name)
      }
      if (types.includes("administrative_area_level_3")) {
        admin3 = admin3 || c.long_name
        candidateSet.add(c.long_name)
      }
      if (types.includes("locality")) {
        locality = locality || c.long_name
        candidateSet.add(c.long_name)
      }
      if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
        candidateSet.add(c.long_name)
      }
      if (types.includes("administrative_area_level_2")) {
        admin2 = admin2 || c.long_name
      }
    }
  }

  for (const c of components) {
    const types = c.types || []
    if (types.includes("premise") || types.includes("point_of_interest") || types.includes("establishment")) {
      premise = premise || c.long_name
    } else if (types.includes("subpremise")) {
      subpremise = c.long_name
    } else if (types.includes("route")) {
      route = c.long_name
    } else if (types.includes("neighborhood")) {
      neighborhood = c.long_name
    } else if (types.includes("sublocality_level_3")) {
      sublocality3 = c.long_name
    } else if (types.includes("sublocality_level_2")) {
      sublocality2 = c.long_name
    } else if (types.includes("sublocality_level_1")) {
      sublocality1 = c.long_name
    } else if (types.includes("sublocality")) {
      if (!sublocality1) sublocality1 = c.long_name
    } else if (types.includes("postal_code")) {
      postalCode = c.long_name
    } else if (types.includes("country")) {
      country = c.long_name
      countryCode = c.short_name
    }
  }

  const rawFallback = locality || admin4 || admin3 || admin2 || sublocality1 || ""
  const state = admin1 || ""
  const city = resolveTrueCity(Array.from(candidateSet), state, rawFallback)
  const suburb = sublocality1 || sublocality2 || neighborhood || ""
  const rawAddress = result.formatted_address || [suburb, city, state, postalCode].filter(Boolean).join(", ")
  const formattedAddress = stripPlusCode(rawAddress)

  return {
    latitude: lat,
    longitude: lng,
    city,
    state,
    stateCode: admin1Code || STATE_ISO_MAP[state] || null,
    country,
    countryCode,
    postcode: postalCode,
    pincode: postalCode,
    suburb,
    neighborhood,
    street: [premise, subpremise, route].filter(Boolean).join(", "),
    formattedAddress,
    displayName: formattedAddress,
    address: {
      road: route,
      suburb,
      city,
      state,
      postcode: postalCode,
      country
    },
    raw: result
  }
}
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


function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const numLat1 = Number(lat1)
  const numLon1 = Number(lon1)
  const numLat2 = Number(lat2)
  const numLon2 = Number(lon2)
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null
  const R = 6371e3
  const dLat = (numLat2 - numLat1) * (Math.PI / 180)
  const dLon = (numLon2 - numLon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(numLat1 * (Math.PI / 180)) * Math.cos(numLat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

async function fetchNearbyLandmark(lat, lng, apiKey) {
  if (!apiKey) return null
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.location"
      },
      body: JSON.stringify({
        maxResultCount: 8,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 120.0
          }
        }
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    const places = data.places || []

    for (const p of places) {
      const name = p.displayName?.text?.trim()
      if (!name) continue
      // Skip raw plus codes
      if (/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,5}/i.test(name)) continue
      // Skip generic state/country names
      const lower = name.toLowerCase()
      if (["india", "maharashtra", "raigad"].includes(lower)) continue

      let distance = null
      if (p.location?.latitude && p.location?.longitude) {
        distance = calculateDistanceMeters(lat, lng, p.location.latitude, p.location.longitude)
      }

      return {
        name,
        distance,
        types: p.types || [],
        address: stripPlusCode(p.formattedAddress || "")
      }
    }
    return null
  } catch (err) {
    console.warn("[PLACES NEARBY] Non-blocking landmark lookup error:", err.message)
    return null
  }
}

router.get("/reverse", async (req, res) => {
  const lat = req.query.lat
  const lng = req.query.lng || req.query.lon

  console.log("[BACKEND LOCATION TRACE] GET /api/locations/reverse received", { lat, lng, ip: req.ip })

  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({ message: "Valid numeric lat and lng parameters are required" })
  }

  // 1. Google Maps Geocoding & Places Nearby API (Primary & Only Provider)
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${parsedLat},${parsedLng}&key=${GOOGLE_MAPS_API_KEY}`

      // Parallel fetch for Google Geocoding & Google Places Nearby for fastest speed & highest precision
      const [gRes, landmark] = await Promise.all([
        fetch(gUrl).then(r => r.json()).catch(err => {
          console.warn("[GOOGLE MAPS TRACE] Geocode fetch error:", err.message)
          return null
        }),
        fetchNearbyLandmark(parsedLat, parsedLng, GOOGLE_MAPS_API_KEY)
      ])

      if (gRes && gRes.status === "OK" && Array.isArray(gRes.results) && gRes.results.length > 0) {
        // Select best result from geocoding: prefer street_address or premise over generic locality/plus_code
        let selectedResult = gRes.results[0]
        for (const r of gRes.results) {
          if (r.types.includes("street_address") || r.types.includes("premise")) {
            selectedResult = r
            break
          }
          if (r.types.includes("route") && stripPlusCode(r.formatted_address).split(",").length > 2) {
            selectedResult = r
            break
          }
        }

        const parsed = parseGoogleGeocodeResult(selectedResult, parsedLat, parsedLng, gRes.results)

        // Enrich with precise landmark if found
        if (landmark && landmark.name) {
          const lowerName = landmark.name.toLowerCase()
          const currentAddrLower = (parsed.formattedAddress || "").toLowerCase()

          if (!currentAddrLower.includes(lowerName)) {
            const prefix = (landmark.distance !== null && landmark.distance <= 35)
              ? landmark.name
              : `Near ${landmark.name}`

            parsed.landmark = landmark.name
            parsed.landmarkDistance = landmark.distance
            parsed.street = parsed.street ? `${landmark.name}, ${parsed.street}` : landmark.name
            parsed.formattedAddress = `${prefix}, ${parsed.formattedAddress}`
            parsed.displayName = parsed.formattedAddress
            if (parsed.address) {
              parsed.address.landmark = landmark.name
              if (!parsed.address.suburb) parsed.address.suburb = landmark.name
            }
          }
        }

        console.log("[GOOGLE MAPS TRACE] Reverse geocoded successfully:", {
          landmark: landmark?.name || null,
          city: parsed.city,
          state: parsed.state,
          address: parsed.formattedAddress
        })
        return res.json(parsed)
      } else if (gRes) {
        console.warn("[GOOGLE MAPS TRACE] Geocode returned status:", gRes.status, gRes.error_message || "")
        if (gRes.status === "REQUEST_DENIED") {
          return res.status(403).json({
            error: "Google Maps API billing required",
            message: gRes.error_message || "Please enable Billing on your Google Cloud Project."
          })
        }
      }
    } catch (gErr) {
      console.warn("[GOOGLE MAPS TRACE] Geocode error:", gErr.message)
    }
  }

  res.status(500).json({ message: "Failed to reverse geocode location via Google Maps" })
})

router.get("/search", async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) {
    return res.status(400).json({ message: "Query parameter q is required" })
  }

  // 1. Try Google Maps Geocoding / Search API first
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`
      const gRes = await fetch(gUrl)
      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.status === "OK" && Array.isArray(gData.results) && gData.results.length > 0) {
          const formattedList = gData.results.slice(0, 10).map((r) => {
            const loc = r.geometry?.location || {}
            const parsed = parseGoogleGeocodeResult(r, loc.lat, loc.lng, gData.results)
            return {
              latitude: loc.lat,
              longitude: loc.lng,
              ...parsed,
              displayName: parsed.formattedAddress,
              formattedAddress: parsed.formattedAddress,
            }
          })
          console.log(`[GOOGLE MAPS TRACE] Search query '${q}' returned ${formattedList.length} results`)
          return res.json({ data: formattedList, results: formattedList })
        }
      }
    } catch (gErr) {
      console.warn("[GOOGLE MAPS TRACE] Search error, falling back:", gErr.message)
    }
  }

  // 2. Fallback to SurfSync
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
    console.error("Location search error:", error)
    res.status(500).json({ message: "Failed to search location" })
  }
})

router.get("/detect", async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng || req.query.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: "lat and lng are required" })
  }

  // 1. Try Google Maps first
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      const gRes = await fetch(gUrl)
      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.status === "OK" && gData.results?.[0]) {
          const parsed = parseGoogleGeocodeResult(gData.results[0], lat, lng, gData.results)
          return res.json({
            state: parsed.state,
            stateCode: parsed.stateCode,
            city: parsed.city,
            formattedAddress: parsed.formattedAddress
          })
        }
      }
    } catch (gErr) {
      console.warn("[GOOGLE MAPS TRACE] Detect error, falling back:", gErr.message)
    }
  }

  // 2. Fallback to SurfSync
  try {
    const url = `${SURFSYNC_BASE}/reverse?lat=${lat}&lng=${lng}`
    const geoRes = await fetch(url, {
      headers: { "X-API-Key": SURFSYNC_API_KEY }
    })
    const geo = await geoRes.json().catch(() => ({}))

    const rawCity = geo.city || geo.suburb || geo.district || ""
    const state = geo.state || ""
    const cityCandidates = [geo.city, geo.suburb, geo.district, geo.county].filter(Boolean)
    const city = resolveTrueCity(cityCandidates, state, rawCity)

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
