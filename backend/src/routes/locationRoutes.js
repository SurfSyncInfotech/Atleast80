import { Router } from "express"

const router = Router()

const SURFSYNC_BASE =
  process.env.SURFSYNC_API_BASE || "https://backend.surfsyncinfotech.in/api/surfsync/v1"

function normalizeStateName(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/^national capital territory of\s+/i, "")
    .replace(/^union territory of\s+/i, "")
    .replace(/\s+and\s+/g, " and ")
    .trim()
}

async function surfsyncRequest(path, params = {}) {
  const apiKey = process.env.SURFSYNC_API_KEY
  if (!apiKey) {
    throw new Error("Location service is not configured")
  }

  const url = new URL(`${SURFSYNC_BASE}${path}`)
  url.searchParams.set("api_key", apiKey)
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString())
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = json?.message || json?.error || "Failed to fetch locations"
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return json.data || []
}

function matchState(states, rawName, rawCode) {
  const normalized = normalizeStateName(rawName)
  const code = rawCode?.replace(/^IN-/i, "")?.toUpperCase()

  return (
    states.find((s) => s.stateCode?.toUpperCase() === code) ||
    states.find((s) => normalizeStateName(s.name) === normalized) ||
    states.find((s) => normalized.includes(normalizeStateName(s.name))) ||
    states.find((s) => normalizeStateName(s.name).includes(normalized))
  )
}

router.get("/states", async (req, res) => {
  try {
    const params = {}
    if (req.query.q?.trim()) params.q = req.query.q.trim()

    const states = await surfsyncRequest("/states", params)

    res.json({
      states: states
        .map((s) => ({
          name: s.name,
          iso2: s.stateCode,
          id: s.id,
        }))
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
    const params = {
      state: stateCode,
      "filter[minPopulation]": req.query.minPopulation || "10000",
      sort: "-population",
    }
    if (req.query.q?.trim()) params.q = req.query.q.trim()

    const cities = await surfsyncRequest("/cities", params)

    const seen = new Set()
    const list = []
    const codeUpper = stateCode.toUpperCase()
    for (const city of cities) {
      if (city.stateCode?.toUpperCase() !== codeUpper) continue
      const name = city.name?.trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      list.push({
        id: city.id,
        name,
        stateCode: city.stateCode,
        stateName: city.stateName,
        population: city.population,
      })
    }

    res.json({ cities: list })
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

    const states = await surfsyncRequest("/states")
    const stateMatch = matchState(states, rawState, rawStateCode)

    let city = rawCity
    if (stateMatch?.stateCode && rawCity) {
      const cities = await surfsyncRequest("/cities", {
        state: stateMatch.stateCode,
        q: rawCity,
        "filter[minPopulation]": "5000",
      })
      const cityMatch =
        cities.find((c) => c.name?.toLowerCase() === rawCity.toLowerCase()) ||
        cities.find((c) => c.name?.toLowerCase().includes(rawCity.toLowerCase())) ||
        cities[0]
      if (cityMatch?.name) city = cityMatch.name
    }

    res.json({
      state: stateMatch?.name || rawState,
      stateCode: stateMatch?.stateCode || rawStateCode.replace(/^IN-/i, "") || null,
      city,
    })
  } catch (error) {
    console.error("Location detect error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to detect location" })
  }
})

export default router
