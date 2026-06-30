import { Router } from "express"

const router = Router()

const CSC_BASE = "https://api.countrystatecity.in/v1"
const INDIA_CODE = "IN"

async function cscRequest(path) {
  const apiKey = process.env.CSC_API_KEY
  if (!apiKey) {
    throw new Error("Location service is not configured")
  }

  const res = await fetch(`${CSC_BASE}${path}`, {
    headers: { "X-CSCAPI-KEY": apiKey },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.message || data?.error || "Failed to fetch locations"
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return data
}

router.get("/states", async (_req, res) => {
  try {
    const states = await cscRequest(`/countries/${INDIA_CODE}/states`)
    res.json({
      states: (states || []).map((s) => ({
        name: s.name,
        iso2: s.iso2,
      })),
    })
  } catch (error) {
    console.error("States fetch error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch states" })
  }
})

router.get("/cities", async (req, res) => {
  const stateIso = req.query.state?.trim()
  if (!stateIso) {
    return res.status(400).json({ message: "State code is required" })
  }

  try {
    const cities = await cscRequest(`/countries/${INDIA_CODE}/states/${stateIso}/cities`)
    res.json({
      cities: (cities || []).map((c) => ({
        name: c.name,
      })),
    })
  } catch (error) {
    console.error("Cities fetch error:", error)
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch cities" })
  }
})

export default router
