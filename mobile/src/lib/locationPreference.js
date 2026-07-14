import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "atleast80_location"

export async function getLocationPreference() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: "", city: "", stateIso: "" }
    const parsed = JSON.parse(raw)
    return {
      state: parsed.state || "",
      city: parsed.city || "",
      stateIso: parsed.stateIso || "",
    }
  } catch {
    return { state: "", city: "", stateIso: "" }
  }
}

export async function setLocationPreference({ state, city, stateIso }) {
  const next = { state: state || "", city: city || "", stateIso: stateIso || "" }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function matchesLocation(kitchen, { state, city }) {
  if (!city && !state) return true
  if (city && kitchen.city?.toLowerCase() !== city.toLowerCase()) return false
  if (state && kitchen.state?.toLowerCase() !== state.toLowerCase()) return false
  return true
}
