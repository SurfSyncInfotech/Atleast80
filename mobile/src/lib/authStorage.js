import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "atleast80_auth"

let cachedAuth = null
let isInitialized = false
let initPromise = null

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
  return cachedAuth
}

export async function writeStoredAuth(auth) {
  if (auth?.token && auth?.user) {
    cachedAuth = {
      token: auth.token,
      user: auth.user,
      kitchen: auth.kitchen ?? null,
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
  return cachedAuth?.token ?? null
}
