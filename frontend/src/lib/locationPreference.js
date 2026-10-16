import { useCallback, useEffect, useState } from "react"
import { api } from "./api"
import { patchSessionForRole } from "./authStorage"

const STORAGE_KEY = "atleast80_location"
const EVENT_NAME = "location-preference-change"
const DETECTED_KEY = "atleast80_location_detected"

/**
 * Reusable location validation function.
 * Evaluates browser geolocation result against coarse thresholds (10km).
 */
export function validateBrowserLocation(pos) {
  if (!pos || !pos.coords) {
    return { valid: false, tier: "invalid", latitude: null, longitude: null, accuracy: null, isCoarse: false }
  }
  const latitude = pos.coords.latitude
  const longitude = pos.coords.longitude
  const accuracy = pos.coords.accuracy || null

  return {
    valid: Boolean(latitude && longitude),
    tier: accuracy && accuracy <= 500 ? "reliable" : "medium",
    latitude,
    longitude,
    accuracy,
    isCoarse: false
  }
}

/**
 * Checks if a stored or detected location object is stale/coarse Pune or invalid.
 */
function isStaleOrCoarsePune(locationObj) {
  if (!locationObj) return true
  const city = (locationObj.city || "").toLowerCase().trim()
  const address = (locationObj.address || "").toLowerCase()

  // Always purge old/untrusted Pune address strings from previous browser IP detection
  if (city === "pune" || address.includes("guruwar peth") || address.includes("pant sachiv") || address.includes("pune city subdistrict")) {
    return true
  }

  return false
}

export function getLocationPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      console.log("[LOCATION TRACE] getLocationPreference: no storage value", {
        source: "localStorage",
        storageKey: STORAGE_KEY,
        caller: "getLocationPreference"
      })
      return { state: "", city: "", suburb: "", address: "", pincode: "", source: null, accuracy: null, isCoarse: false }
    }
    
    const parsed = JSON.parse(raw)
    console.log("[LOCATION TRACE] getLocationPreference raw read", {
      source: parsed.source || "unknown",
      city: parsed.city,
      address: parsed.address,
      accuracy: parsed.accuracy,
      isCoarse: parsed.isCoarse,
      storageKey: STORAGE_KEY,
      caller: "getLocationPreference"
    })

    // Invalidate stale or coarse Pune data from previous browser IP detection
    if (isStaleOrCoarsePune(parsed)) {
      console.log("[LOCATION TRACE] getLocationPreference: PURGING STALE/COARSE PUNE DATA", {
        parsed,
        storageKey: STORAGE_KEY,
        caller: "getLocationPreference"
      })
      localStorage.removeItem(STORAGE_KEY)
      return { state: "", city: "", suburb: "", address: "", pincode: "", source: null, accuracy: null, isCoarse: false }
    }

    return {
      state: parsed.state || "",
      city: parsed.city || "",
      suburb: parsed.suburb || "",
      address: parsed.address || "",
      pincode: parsed.pincode || "",
      lat: parsed.lat || parsed.latitude || null,
      lng: parsed.lng || parsed.longitude || null,
      source: parsed.source || "manual",
      accuracy: parsed.accuracy || null,
      isCoarse: Boolean(parsed.isCoarse)
    }
  } catch {
    return { state: "", city: "", suburb: "", address: "", pincode: "", lat: null, lng: null, source: null, accuracy: null, isCoarse: false }
  }
}

export function setLocationPreference(
  { state, city, suburb, address, pincode, lat, lng },
  options = {}
) {
  const source = options.source || "manual"
  const accuracy = options.accuracy || null

  const next = { 
    state: state || "", 
    city: city || "",
    suburb: suburb || "",
    address: address || "",
    pincode: pincode || "",
    lat: lat || null,
    lng: lng || null,
    source,
    accuracy,
    isCoarse: false,
    timestamp: Date.now()
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }))

  // Update database if user is logged in
  try {
    api("/api/auth/location", {
      method: "PATCH",
      body: JSON.stringify({
        state: next.state,
        city: next.city,
        suburb: next.suburb,
        address: next.address,
        pincode: next.pincode
      })
    })
      .then((res) => {
        if (res?.user) {
          patchSessionForRole("customer", { user: res.user })
        }
      })
      .catch(() => null)
  } catch (e) {
    // Ignore error
  }

  return next
}

let detectPromise = null

export async function autoDetectLocation({ force = false } = {}) {
  const current = getLocationPreference()

  // 1. If user manually set a location, preserve it! Do not overwrite with auto-detect unless forced.
  if (!force && current.source === "manual" && (current.city || current.state)) {
    return current
  }

  // 2. If current stored location is an invalid/stale/coarse Pune location, clear it
  if (isStaleOrCoarsePune(current)) {
    localStorage.removeItem(STORAGE_KEY)
    current.state = ""
    current.city = ""
    current.suburb = ""
    current.address = ""
    current.pincode = ""
    current.source = null
    current.isCoarse = false
  }

  // 3. If !force and valid non-coarse browser city already stored, return it
  if (!force && current.source === "browser" && !current.isCoarse && (current.city || current.state)) {
    return current
  }

  // 4. Check browser geolocation availability
  if (!navigator.geolocation) {
    return { ...current, status: "unsupported" }
  }

  if (!detectPromise) {
    detectPromise = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const validation = validateBrowserLocation(pos)

            console.log("[LOCATION] Browser coordinates:", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: validation.accuracy,
              tier: validation.tier,
              isCoarse: validation.isCoarse
            })

            if (!validation.valid) {
              resolve({
                ...current,
                status: "error",
                errorMessage: "Could not detect valid coordinates."
              })
              return
            }

            console.log("[LOCATION] Reverse geocode:", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: validation.accuracy
            })
            console.trace("[REVERSE GEOCODE CALLED]")

            // Valid accuracy (<= 10km): proceed with SurfSync reverse geocoding API
            const data = await api(`/api/locations/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
            sessionStorage.setItem(DETECTED_KEY, "1")

            console.log("[LOCATION TRACE] Reverse geocoding API response received", {
              data,
              caller: "autoDetectLocation"
            })

            if (data) {
              const addr = data.address || {}
              const state = data.state || addr.state || ""

              let rawCity = data.city || addr.city || ""
              let town = data.town || addr.town || ""
              let district = data.district || addr.district || addr.county || ""

              const societyKeywords = ["society", "housing", "co-operative", "co-op", "apartment", "apt", "colony", "towers", "tower", "residency", "enclave", "chsl", "complex", "villas", "flat", "building", "layout"]
              const isSocietyName = rawCity && societyKeywords.some(kw => rawCity.toLowerCase().includes(kw))

              let city = isSocietyName ? (town || district || rawCity) : (rawCity || town || district || addr.village || "")
              let suburb = data.suburb || addr.suburb || addr.neighbourhood || (isSocietyName ? rawCity : "") || ""

              const houseNumber = addr.house_number || ""
              const postcode = data.postcode || addr.postcode || ""

              let streetAddress = data.formattedAddress || data.displayName || [houseNumber, suburb, city, state, postcode].filter(Boolean).join(", ")
              if (!streetAddress && data.display_name) {
                streetAddress = data.display_name.split(",").slice(0, 4).map(s => s.trim()).join(", ")
              }

              if (state || city) {
                const displayState = state ? (state.charAt(0).toUpperCase() + state.slice(1)) : ""
                const displayCity = city ? (city.charAt(0).toUpperCase() + city.slice(1)) : ""
                
                const saved = setLocationPreference(
                  { 
                    state: displayState, 
                    city: displayCity,
                    suburb: suburb || "",
                    address: streetAddress,
                    pincode: postcode
                  },
                  { source: "browser", accuracy: validation.accuracy, tier: validation.tier }
                )
                resolve({ ...saved, status: "success", tier: validation.tier })
                return
              }
            }
            resolve({ ...current, status: "empty" })
          } catch (e) {
            sessionStorage.setItem(DETECTED_KEY, "1")
            resolve({ ...current, status: "error", error: e })
          }
        },
        (err) => {
          sessionStorage.setItem(DETECTED_KEY, "1")
          let message = "Location request failed."
          if (err.code === 1) {
            message = "Location permission denied."
          } else if (err.code === 2) {
            message = "Position unavailable."
          } else if (err.code === 3) {
            message = "Location request timed out."
          }
          console.warn("[LOCATION] Geolocation error:", message)
          resolve({ ...current, status: "error", error: err, errorMessage: message })
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      )
    }).finally(() => {
      detectPromise = null
    })
  }

  return detectPromise
}

export function useLocationPreference() {
  const [location, setLocationState] = useState(getLocationPreference)

  useEffect(() => {
    const onChange = (event) => {
      setLocationState(event.detail || getLocationPreference())
    }
    window.addEventListener(EVENT_NAME, onChange)
    return () => window.removeEventListener(EVENT_NAME, onChange)
  }, [])

  const setLocation = useCallback((state, city, address = "", pincode = "", suburb = "", source = "manual", lat = null, lng = null) => {
    setLocationState(setLocationPreference({ state, city, suburb, address, pincode, lat, lng }, { source }))
  }, [])

  const colonyPart = location.suburb ? `${location.suburb}, ` : ""
  const cityPart = location.city ? `${location.city}, ` : ""
  const statePart = location.state || ""
  const pincodePart = location.pincode ? ` ${location.pincode}` : ""
  
  let formattedLabel = `${colonyPart}${cityPart}${statePart}${pincodePart}`.trim()
  if (!formattedLabel && location.address) {
    formattedLabel = location.address
  }

  return {
    state: location.state,
    city: location.city,
    suburb: location.suburb,
    address: location.address,
    pincode: location.pincode,
    lat: location.lat,
    lng: location.lng,
    source: location.source,
    isCoarse: location.isCoarse,
    setLocation,
    label: formattedLabel,
  }
}

export function useAutoDetectLocation() {
  const [detecting] = useState(false)
  // Auto-detection on mount disabled — location remains empty until user explicitly clicks 'Use my location' or 'Pin on Map'
  return { detecting }
}

export function matchesLocation(kitchen, { state, city }) {
  if (!city && !state) return true
  if (city && kitchen.city?.toLowerCase() !== city.toLowerCase()) return false
  if (state && kitchen.state?.toLowerCase() !== state.toLowerCase()) return false
  return true
}

