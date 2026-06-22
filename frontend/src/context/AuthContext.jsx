import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { api, ApiError, registerKitchen as registerKitchenApi } from "../lib/api"
import {
  readStoredAuth,
  writeStoredAuth,
  patchStoredAuth,
  clearStoredAuth,
} from "../lib/authStorage"

const AuthContext = createContext(null)

const initialAuth = readStoredAuth()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialAuth?.user ?? null)
  const [kitchen, setKitchen] = useState(initialAuth?.kitchen ?? null)
  const [loading, setLoading] = useState(Boolean(initialAuth?.token))

  const applySession = useCallback((authData) => {
    if (!authData?.token || !authData?.user) {
      clearStoredAuth()
      setUser(null)
      setKitchen(null)
      return
    }

    writeStoredAuth(authData)
    setUser(authData.user)
    setKitchen(authData.kitchen ?? null)
  }, [])

  const persist = useCallback(
    (authData) => {
      if (!authData) {
        applySession(null)
        return
      }

      const prev = readStoredAuth()
      applySession({
        token: authData.token ?? prev?.token,
        user: authData.user ?? prev?.user ?? null,
        kitchen: authData.kitchen !== undefined ? authData.kitchen : (prev?.kitchen ?? null),
      })
    },
    [applySession]
  )

  const loginKitchen = async (email, password) => {
    const data = await api("/api/auth/kitchen/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const registerKitchen = async (form, fssaiLicenseFile) => {
    const data = await registerKitchenApi(form, fssaiLicenseFile)
    persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const loginAdmin = async (email, password) => {
    const data = await api("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const registerCustomer = async ({ name, email, phone, password }) => {
    const data = await api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    })
    persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const signupCustomer = async ({ name, email, phone, password }) => {
    return api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    })
  }

  const loginCustomer = async (email, password) => {
    const data = await api("/api/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const sendForgotPasswordOtp = async (email) => {
    return api("/api/auth/customer/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }

  const resetPassword = async ({ email, otp, password }) => {
    return api("/api/auth/customer/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    })
  }

  const updateProfile = async (profile) => {
    const data = await api("/api/auth/customer/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    })
    const stored = readStoredAuth()
    if (stored?.token) {
      persist({ token: stored.token, user: data.user, kitchen: null })
    }
    return data
  }

  const logout = useCallback(() => applySession(null), [applySession])

  const refreshKitchen = useCallback(async () => {
    const data = await api("/api/kitchens/me")
    setKitchen(data.kitchen)
    const patched = patchStoredAuth({ kitchen: data.kitchen })
    if (patched) setKitchen(patched.kitchen ?? data.kitchen)
    return data.kitchen
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = readStoredAuth()

      if (!stored?.token) {
        if (!cancelled) setLoading(false)
        return
      }

      if (stored.user) {
        setUser(stored.user)
        setKitchen(stored.kitchen ?? null)
      }

      try {
        const data = await api("/api/auth/me")
        if (cancelled || !data?.user) return

        applySession({
          token: stored.token,
          user: data.user,
          kitchen: data.user.role === "kitchen" ? (data.kitchen ?? stored.kitchen ?? null) : null,
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          applySession(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [applySession])

  return (
    <AuthContext.Provider
      value={{
        user,
        kitchen,
        loading,
        isAdmin: user?.role === "admin",
        isKitchen: user?.role === "kitchen",
        isCustomer: user?.role === "customer",
        loginKitchen,
        registerKitchen,
        loginAdmin,
        registerCustomer,
        signupCustomer,
        loginCustomer,
        sendForgotPasswordOtp,
        resetPassword,
        updateProfile,
        logout,
        refreshKitchen,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
