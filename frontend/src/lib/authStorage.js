const STORAGE_KEY = "atleast80_auth"
const LEGACY_TOKEN_KEY = "atleast80_token"

export function readStoredAuth() {
  try {
    let auth = null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) auth = JSON.parse(raw)

    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY)
    if (legacyToken) {
      auth = auth || {}
      if (!auth.token) auth.token = legacyToken
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: auth.token,
          user: auth.user ?? null,
          kitchen: auth.kitchen ?? null,
        })
      )
      localStorage.removeItem(LEGACY_TOKEN_KEY)
    }

    if (!auth?.token) return null

    return {
      token: auth.token,
      user: auth.user ?? null,
      kitchen: auth.kitchen ?? null,
    }
  } catch {
    clearStoredAuth()
    return null
  }
}

export function writeStoredAuth(auth) {
  if (auth?.token && auth?.user) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: auth.token,
        user: auth.user,
        kitchen: auth.kitchen ?? null,
      })
    )
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return
  }

  clearStoredAuth()
}

export function patchStoredAuth(patch) {
  const stored = readStoredAuth()
  if (!stored?.token) return null

  const next = {
    token: stored.token,
    user: patch.user !== undefined ? patch.user : stored.user,
    kitchen: patch.kitchen !== undefined ? patch.kitchen : stored.kitchen,
  }

  if (!next.user) return stored

  writeStoredAuth(next)
  return next
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function getStoredToken() {
  return readStoredAuth()?.token ?? null
}
