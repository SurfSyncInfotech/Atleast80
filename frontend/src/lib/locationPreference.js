import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "atleast80_location"
const EVENT_NAME = "location-preference-change"

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

export function matchesLocation(kitchen, { state, city }) {
  if (!city && !state) return true
  if (city && kitchen.city?.toLowerCase() !== city.toLowerCase()) return false
  if (state && kitchen.state?.toLowerCase() !== state.toLowerCase()) return false
  return true
}
