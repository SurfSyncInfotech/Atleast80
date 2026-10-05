import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

const STORAGE_KEY = "atleast80_rider_auth"

let cachedAuth = null
let isInitialized = false
let initPromise = null

// Synchronous initialization on Web to prevent race conditions on page refresh (Ctrl+R)
if (Platform.OS === "web") {
  try {
    const raw = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      cachedAuth = JSON.parse(raw)
      isInitialized = true
    }
  } catch (e) {
    console.warn("[authStorage] Failed to read cached auth synchronously on web:", e)
  }
}

export function initAuthStorage() {
  if (isInitialized) return Promise.resolve(cachedAuth)
  if (initPromise) return initPromise

  initPromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        cachedAuth = JSON.parse(raw)
      }
      isInitialized = true
      initPromise = null
      return cachedAuth
    })
    .catch(() => {
      cachedAuth = null
      isInitialized = true
      initPromise = null
      return null
    })

  return initPromise
}

export function readStoredAuthSync() {
  if (!cachedAuth && Platform.OS === "web") {
    try {
      const raw = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        cachedAuth = JSON.parse(raw)
      }
    } catch (e) {
      console.warn("[authStorage] Failed to read cached auth dynamically on web:", e)
    }
  }
  return cachedAuth
}

export async function writeStoredAuth(auth) {
  if (auth?.token && auth?.user) {
    cachedAuth = {
      token: auth.token,
      user: auth.user,
      kitchen: auth.kitchen ?? null,
      rider: auth.rider ?? null,
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedAuth))
  } else {
    await clearStoredAuth()
  }
}

export async function patchStoredAuth(patch) {
  const stored = cachedAuth
  if (!stored?.token) return null

  const next = {
    token: stored.token,
    user: patch.user !== undefined ? patch.user : stored.user,
    kitchen: patch.kitchen !== undefined ? patch.kitchen : stored.kitchen,
    rider: patch.rider !== undefined ? patch.rider : stored.rider,
  }

  if (!next.user) return stored

  await writeStoredAuth(next)
  return next
}

export async function clearStoredAuth() {
  cachedAuth = null
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export function getStoredToken() {
  if (!cachedAuth && Platform.OS === "web") {
    try {
      const raw = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        cachedAuth = JSON.parse(raw)
      }
    } catch (e) {
      console.warn("[authStorage] Failed to read cached auth dynamically on web:", e)
    }
  }
  return cachedAuth?.token ?? null
}
