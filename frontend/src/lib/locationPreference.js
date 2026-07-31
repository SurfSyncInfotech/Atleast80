import { useCallback, useEffect, useState } from "react"
import { api } from "./api"

const STORAGE_KEY = "atleast80_location"
const EVENT_NAME = "location-preference-change"
const DETECTED_KEY = "atleast80_location_detected"

export function getLocationPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: "", city: "", address: "", pincode: "" }
    const parsed = JSON.parse(raw)
    return {
      state: parsed.state || "",
      city: parsed.city || "",
      address: parsed.address || "",
      pincode: parsed.pincode || "",
    }
  } catch {
    return { state: "", city: "", address: "", pincode: "" }
  }
}

export function setLocationPreference({ state, city, address, pincode }) {
  const next = { 
    state: state || "", 
    city: city || "",
    address: address || "",
    pincode: pincode || ""
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }))

  // Silently update database if user is logged in
  try {
    api("/api/auth/location", {
      method: "PATCH",
      body: JSON.stringify({
        city: next.city,
        address: next.address,
        pincode: next.pincode
      })
    }).catch(() => null)
  } catch (e) {
    // Ignore error
  }

  return next
}

let detectPromise = null

export async function autoDetectLocation({ force = false } = {}) {
  const current = getLocationPreference()
  if (!force && (current.city || current.state)) return current
  if (!force && sessionStorage.getItem(DETECTED_KEY) === "1") return current
  if (!navigator.geolocation) return current

  if (!detectPromise) {
    detectPromise = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, {
              headers: {
                "User-Agent": "Atleast80Web/1.0"
              }
            })
            const data = await res.json()
            sessionStorage.setItem(DETECTED_KEY, "1")

            if (data && data.address) {
              const state = data.address.state || ""
              const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.suburb || ""
              const road = data.address.road || data.address.suburb || data.address.neighbourhood || ""
              const houseNumber = data.address.house_number || ""
              const postcode = data.address.postcode || ""

              let streetAddress = [houseNumber, road].filter(Boolean).join(", ")
              if (!streetAddress && data.display_name) {
                streetAddress = data.display_name.split(",").slice(0, 2).map(s => s.trim()).join(", ")
              }

              if (state || city) {
                const displayState = state ? (state.charAt(0).toUpperCase() + state.slice(1)) : ""
                const displayCity = city ? (city.charAt(0).toUpperCase() + city.slice(1)) : ""
                resolve(setLocationPreference({ 
                  state: displayState, 
                  city: displayCity,
                  address: streetAddress,
                  pincode: postcode
                }))
                return
              }
            }
            resolve(current)
          } catch {
            sessionStorage.setItem(DETECTED_KEY, "1")
            resolve(current)
          }
        },
        () => {
          sessionStorage.setItem(DETECTED_KEY, "1")
          resolve(current)
        },
        { timeout: 12000, maximumAge: 300000, enableHighAccuracy: false }
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

  const setLocation = useCallback((state, city, address = "", pincode = "") => {
    setLocationState(setLocationPreference({ state, city, address, pincode }))
  }, [])

  return {
    state: location.state,
    city: location.city,
    address: location.address,
    setLocation,
    label: location.address || (location.city
      ? location.state
        ? `${location.city}, ${location.state}`
        : location.city
      : location.state || ""),
  }
}

export function useAutoDetectLocation() {
  const { state, city } = useLocationPreference()
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    let cancelled = false
    
    const checkAndDetect = async () => {
      if (!state && !city) {
        setDetecting(true)
        await autoDetectLocation()
        if (!cancelled) setDetecting(false)
        return
      }

      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: "geolocation" })
          if (perm.state === "granted") {
            await autoDetectLocation({ force: true })
          }
        } catch (e) {
          console.log("Background location silent refresh check failed", e)
        }
      }
    }

    checkAndDetect()

    return () => {
      cancelled = true
    }
  }, [state, city])

  return { detecting }
}

export function matchesLocation(kitchen, { state, city }) {
  if (!city && !state) return true
  if (city && kitchen.city?.toLowerCase() !== city.toLowerCase()) return false
  if (state && kitchen.state?.toLowerCase() !== state.toLowerCase()) return false
  return true
}
