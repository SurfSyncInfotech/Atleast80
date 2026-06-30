const SESSIONS_KEY = "atleast80_sessions"
const LEGACY_KEY = "atleast80_auth"
const LEGACY_TOKEN_KEY = "atleast80_token"

const KITCHEN_PARTNER_PATH = /^\/kitchen\/(dashboard|menu|profile|orders|enquiries|login|signup)(\/|$)/

const CUSTOMER_AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/profile",
  "/orders",
  "/cart",
  "/checkout",
]

export function inferRoleFromPath(pathname = "") {
  if (pathname.startsWith("/admin")) return "admin"
  if (KITCHEN_PARTNER_PATH.test(pathname)) return "kitchen"
  if (CUSTOMER_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "customer"
  }
  return "customer"
}

export function hasSessionForRole(role) {
  return Boolean(readSessionForRole(role)?.token)
}

function migrateLegacyAuth() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null

    const auth = JSON.parse(raw)
    const role = auth?.user?.role
    if (!role || !auth?.token) return null

    const sessions = { [role]: { token: auth.token, user: auth.user, kitchen: auth.kitchen ?? null } }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    localStorage.removeItem(LEGACY_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return sessions
  } catch {
    return null
  }
}

export function readSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (raw) return JSON.parse(raw)

    const migrated = migrateLegacyAuth()
    return migrated || {}
  } catch {
    return {}
  }
}

function writeSessions(sessions) {
  if (!sessions || Object.keys(sessions).length === 0) {
    localStorage.removeItem(SESSIONS_KEY)
    return
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function readSessionForRole(role) {
  if (!role) return null
  const session = readSessions()[role]
  if (!session?.token) return null
  return {
    token: session.token,
    user: session.user ?? null,
    kitchen: session.kitchen ?? null,
  }
}

export function writeSessionForRole(role, auth) {
  if (!role) return

  const sessions = readSessions()

  if (!auth?.token || !auth?.user) {
    delete sessions[role]
  } else {
    sessions[role] = {
      token: auth.token,
      user: auth.user,
      kitchen: auth.kitchen ?? null,
    }
  }

  writeSessions(sessions)
}

export function patchSessionForRole(role, patch) {
  const stored = readSessionForRole(role)
  if (!stored?.token) return null

  const next = {
    token: stored.token,
    user: patch.user !== undefined ? patch.user : stored.user,
    kitchen: patch.kitchen !== undefined ? patch.kitchen : stored.kitchen,
  }

  if (!next.user) return stored

  writeSessionForRole(role, next)
  return next
}

export function clearSessionForRole(role) {
  writeSessionForRole(role, null)
}

export function clearAllSessions() {
  localStorage.removeItem(SESSIONS_KEY)
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

/** @deprecated use readSessionForRole */
export function readStoredAuth() {
  const sessions = readSessions()
  const role = sessions.admin ? "admin" : sessions.kitchen ? "kitchen" : sessions.customer ? "customer" : null
  return role ? readSessionForRole(role) : null
}

/** @deprecated use writeSessionForRole */
export function writeStoredAuth(auth) {
  const role = auth?.user?.role
  if (role) writeSessionForRole(role, auth)
  else clearAllSessions()
}

/** @deprecated use patchSessionForRole */
export function patchStoredAuth(patch) {
  const role = patch.user?.role || readStoredAuth()?.user?.role
  if (!role) return null
  return patchSessionForRole(role, patch)
}

/** @deprecated use clearSessionForRole */
export function clearStoredAuth() {
  clearAllSessions()
}

export function getStoredToken(role) {
  const resolvedRole = role || inferRoleFromPath(
    typeof window !== "undefined" ? window.location.pathname : ""
  )
  return readSessionForRole(resolvedRole)?.token ?? null
}
