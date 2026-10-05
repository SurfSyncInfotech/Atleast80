import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "./api"

const STORAGE_KEY = "atleast80_location"

export async function getLocationPreference() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: "", city: "", stateIso: "", address: "", pincode: "" }
    const parsed = JSON.parse(raw)
    return {
      state: parsed.state || "",
      city: parsed.city || "",
      stateIso: parsed.stateIso || "",
      address: parsed.address || "",
      pincode: parsed.pincode || "",
    }
  } catch {
    return { state: "", city: "", stateIso: "", address: "", pincode: "" }
  }
}

export async function setLocationPreference({ state, city, stateIso, address, pincode }) {
  const next = { 
    state: state || "", 
    city: city || "", 
    stateIso: stateIso || "",
    address: address || "",
    pincode: pincode || ""
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  
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
    // Ignore error (e.g. if not logged in or offline)
  }

  return next
}

export function matchesLocation(kitchen, { state, city }) {
  if (!city && !state) return true
  if (city && kitchen.city?.toLowerCase() !== city.toLowerCase()) return false
  if (state && kitchen.state?.toLowerCase() !== state.toLowerCase()) return false
  return true
}
