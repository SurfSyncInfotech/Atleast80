import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { api, ApiError, registerKitchen as registerKitchenApi } from "../lib/api"
import {
  initAuthStorage,
  writeStoredAuth,
  patchStoredAuth,
  clearStoredAuth,
} from "../lib/authStorage"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [kitchen, setKitchen] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (authData) => {
    console.log("[AuthContext] applySession called with:", authData ? { user: authData.user, hasToken: !!authData.token } : "null")
    if (!authData?.token || !authData?.user) {
      console.log("[AuthContext] Clearing stored auth.")
      await clearStoredAuth()
      setUser(null)
      setKitchen(null)
      return
    }

    console.log("[AuthContext] Writing stored auth to AsyncStorage...")
    await writeStoredAuth(authData)
    console.log("[AuthContext] Stored auth written successfully. Setting state...")
    setUser(authData.user)
    setKitchen(authData.kitchen ?? null)
  }, [])

  const persist = useCallback(
    async (authData) => {
      console.log("[AuthContext] persist called with:", authData ? { user: authData.user, hasToken: !!authData.token } : "null")
      if (!authData) {
        await applySession(null)
        return
      }

      await applySession({
        token: authData.token,
        user: authData.user,
        kitchen: authData.kitchen ?? null,
      })
    },
    [applySession]
  )

  const loginKitchen = async (email, password) => {
    const data = await api("/api/auth/kitchen/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    if (data.requiresOtp) {
      return data
    }
    await persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const verifyKitchenLoginOtp = async (email, password, otp) => {
    const data = await api("/api/auth/kitchen/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, password, otp }),
    })
    await persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const registerKitchen = async (form, fssaiLicenseFile) => {
    const data = await registerKitchenApi(form, fssaiLicenseFile)
    await persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const loginAdmin = async (email, password) => {
    const data = await api("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    await persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const registerCustomer = async ({ name, email, phone, password }) => {
    const data = await api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    })
    await persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const signupCustomer = async ({ name, email, phone, password }) => {
    return api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    })
  }

  const loginCustomer = async (email, password) => {
    console.log("[AuthContext] loginCustomer calling API for email:", email)
    const data = await api("/api/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    console.log("[AuthContext] loginCustomer API succeeded. Requires OTP:", !!data.requiresOtp, "User:", data.user, "Has Token:", !!data.token)
    if (data.requiresOtp) {
      return data
    }
    await persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const verifyLoginOtp = async (email, password, otp) => {
    console.log("[AuthContext] verifyLoginOtp calling API for:", email)
    const data = await api("/api/auth/customer/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, password, otp }),
    })
    console.log("[AuthContext] verifyLoginOtp succeeded. User:", data.user, "Has Token:", !!data.token)
    await persist({ token: data.token, user: data.user, kitchen: null })
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
    const updated = await patchStoredAuth({ user: data.user })
    if (updated) {
      setUser(updated.user)
    }
    return data
  }

  const logout = useCallback(async () => {
    await applySession(null)
  }, [applySession])

  const refreshKitchen = useCallback(async () => {
    const data = await api("/api/kitchens/me")
    setKitchen(data.kitchen)
    const updated = await patchStoredAuth({ kitchen: data.kitchen })
    if (updated) {
      setKitchen(updated.kitchen)
    }
    return data.kitchen
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        console.log("[AuthContext] Bootstrapping auth storage...")
        const stored = await initAuthStorage()
        if (cancelled) return

        if (!stored?.token) {
          console.log("[AuthContext] No stored token found in AsyncStorage.")
          setLoading(false)
          return
        }

        console.log("[AuthContext] Stored token found. Stored User:", stored.user)
        setUser(stored.user)
        setKitchen(stored.kitchen ?? null)

        // Validate token with backend
        console.log("[AuthContext] Validating token with backend `/api/auth/me`...")
        const data = await api("/api/auth/me")
        if (cancelled) return
        if (!data?.user) {
          console.log("[AuthContext] Validation returned no user, clearing session.")
          await applySession(null)
          return
        }

        console.log("[AuthContext] Token validated. Backend User:", data.user)
        await applySession({
          token: stored.token,
          user: data.user,
          kitchen: data.user.role === "kitchen" ? (data.kitchen ?? stored.kitchen ?? null) : null,
        })
      } catch (err) {
        if (cancelled) return
        console.error("[AuthContext] Bootstrap validation failed with error:", err)
        if (err instanceof ApiError && err.status === 401) {
          console.log("[AuthContext] Error status is 401, clearing invalid/expired session.")
          await applySession(null)
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
        verifyKitchenLoginOtp,
        registerKitchen,
        loginAdmin,
        registerCustomer,
        signupCustomer,
        loginCustomer,
        verifyLoginOtp,
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
