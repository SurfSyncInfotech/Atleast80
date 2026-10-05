import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "./api"
import { patchStoredAuth } from "./authStorage"

const STORAGE_KEY = "atleast80_location"

export async function getLocationPreference() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: "", city: "", suburb: "", stateIso: "", address: "", pincode: "", lat: null, lng: null, isCleared: false }
    const parsed = JSON.parse(raw)
    return {
      state: parsed.state || "",
      city: parsed.city || "",
      suburb: parsed.suburb || "",
      stateIso: parsed.stateIso || "",
      address: parsed.address || "",
      pincode: parsed.pincode || "",
      lat: parsed.lat || parsed.latitude || null,
      lng: parsed.lng || parsed.longitude || null,
      isCleared: !!parsed.isCleared,
    }
  } catch {
    return { state: "", city: "", suburb: "", stateIso: "", address: "", pincode: "", lat: null, lng: null, isCleared: false }
  }
}

export async function setLocationPreference({ state, city, suburb, stateIso, address, pincode, lat, lng, isCleared }) {
  const clearedFlag = isCleared !== undefined ? isCleared : (!city && !state)
  const formattedAddress = address || [suburb, city, state].filter(Boolean).join(", ")
  const next = { 
    state: state || "", 
    city: city || "", 
    suburb: suburb || "",
    stateIso: stateIso || "",
    address: formattedAddress || "",
    pincode: pincode || "",
    lat: lat || null,
    lng: lng || null,
    isCleared: clearedFlag,
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  
  // Silently update database if user is logged in
  try {
    const res = await api("/api/auth/location", {
      method: "PATCH",
      body: JSON.stringify({
        city: next.city,
        state: next.state,
        suburb: next.suburb,
        address: next.address,
        pincode: next.pincode
      })
    })
    if (res?.user) {
      await patchStoredAuth({ user: res.user })
    }
  } catch (e) {
    // Ignore error (e.g. if not logged in or offline)
  }

  return next
}

export function matchesLocation(kitchen, { state, city } = {}) {
  const hasCity = Boolean(city && String(city).trim())
  const hasState = Boolean(state && String(state).trim())

  // If no location/city is selected, do not match (Home screen strictly requires user city)
  if (!hasCity && !hasState) return false

  const kCity = (kitchen?.city || "").toLowerCase().trim()
  const selCity = (city || "").toLowerCase().trim()
  const kState = (kitchen?.state || "").toLowerCase().trim()
  const selState = (state || "").toLowerCase().trim()

  if (selCity) {
    if (!kCity) return false
    const matchCity = kCity.includes(selCity) || selCity.includes(kCity)
    if (!matchCity) return false
  }

  if (selState) {
    if (!kState) return false
    const matchState = kState.includes(selState) || selState.includes(kState)
    if (!matchState) return false
  }

  return true
}
