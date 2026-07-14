import { useCallback, useEffect, useState } from "react"
import { api } from "./api"

const STORAGE_KEY = "atleast80_location"
const EVENT_NAME = "location-preference-change"
const DETECTED_KEY = "atleast80_location_detected"

export function getLocationPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: "", city: "" }
    const parsed = JSON.parse(raw)
    return {
      state: parsed.state || "",
      city: parsed.city || "",
    }
  } catch {
    return { state: "", city: "" }
  }
}

export function setLocationPreference({ state, city }) {
  const next = { state: state || "", city: city || "" }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }))
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
            const data = await api(
              `/api/locations/detect?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            )
            sessionStorage.setItem(DETECTED_KEY, "1")
            if (data.state || data.city) {
              resolve(setLocationPreference({ state: data.state || "", city: data.city || "" }))
            } else {
              resolve(current)
            }
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

  const setLocation = useCallback((state, city) => {
    setLocationState(setLocationPreference({ state, city }))
  }, [])

  return {
    state: location.state,
    city: location.city,
    setLocation,
    label: location.city
      ? location.state
        ? `${location.city}, ${location.state}`
        : location.city
      : location.state || "",
  }
}

export function useAutoDetectLocation() {
  const { state, city } = useLocationPreference()
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (state || city) return
    let cancelled = false
    setDetecting(true)
    autoDetectLocation().finally(() => {
      if (!cancelled) setDetecting(false)
    })
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
