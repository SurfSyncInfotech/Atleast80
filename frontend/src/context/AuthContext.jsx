import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { api, ApiError, registerKitchen as registerKitchenApi, verifyRegisterOtp } from "../lib/api"
import {
  inferRoleFromPath,
  readSessionForRole,
  writeSessionForRole,
  patchSessionForRole,
  clearSessionForRole,
  readSessions,
} from "../lib/authStorage"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const location = useLocation()
  const currentRole = inferRoleFromPath(location.pathname)

  const [sessions, setSessions] = useState(readSessions)
  const [sessionReady, setSessionReady] = useState(false)

  const activeSession = sessions[currentRole] ?? null
  const user = activeSession?.user ?? null
  const kitchen = currentRole === "kitchen" ? (activeSession?.kitchen ?? null) : null

  const customerUser = sessions.customer?.user ?? null
  const adminUser = sessions.admin?.user ?? null
  const kitchenPartnerUser = sessions.kitchen?.user ?? null

  const reloadSessions = useCallback(() => {
    setSessions(readSessions())
  }, [])

  useEffect(() => {
    const handleSessionUpdated = () => {
      reloadSessions()
    }
    window.addEventListener("auth-session-updated", handleSessionUpdated)
    return () => window.removeEventListener("auth-session-updated", handleSessionUpdated)
  }, [reloadSessions])

  const applyRoleSession = useCallback(
    (role, authData) => {
      if (!role) return

      if (!authData?.token || !authData?.user) {
        clearSessionForRole(role)
      } else {
        writeSessionForRole(role, authData)
      }

      reloadSessions()
    },
    [reloadSessions]
  )

  const persistRole = useCallback(
    (role, authData) => {
      if (!role) return

      if (!authData) {
        applyRoleSession(role, null)
        return
      }

      const prev = readSessionForRole(role)
      applyRoleSession(role, {
        token: authData.token ?? prev?.token,
        user: authData.user ?? prev?.user ?? null,
        kitchen:
          authData.kitchen !== undefined ? authData.kitchen : (prev?.kitchen ?? null),
      })
    },
    [applyRoleSession]
  )

  const loginKitchen = async (identifier, password) => {
    const data = await api("/api/auth/kitchen/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }, "kitchen")

    if (data.requiresOtp) {
      return data
    }

    persistRole("kitchen", { token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const verifyKitchenLoginOtp = async (identifier, password, otp) => {
    const data = await api("/api/auth/kitchen/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, password, otp }),
    }, "kitchen")
    persistRole("kitchen", { token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const registerKitchen = async (form, fssaiLicenseFile, aadhaarCardFile, aadhaarCardBackFile, panCardFile) => {
    const data = await registerKitchenApi(form, fssaiLicenseFile, aadhaarCardFile, aadhaarCardBackFile, panCardFile)
    return data
  }

  const verifyKitchenRegisterOtp = async (userId, otp) => {
    const data = await verifyRegisterOtp(userId, otp)
    return data
  }

  const sendKitchenForgotPasswordOtp = async (phone) => {
    return api("/api/auth/kitchen/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }, "kitchen")
  }

  const resetKitchenPassword = async ({ userId, otp, password }) => {
    return api("/api/auth/kitchen/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ userId, otp, password }),
    }, "kitchen")
  }

  const loginAdmin = async (email, password) => {
    const data = await api("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, "admin")
    persistRole("admin", { token: data.token, user: data.user, kitchen: null })
    return data
  }

  const registerCustomer = async ({ name, email, phone, password }) => {
    const data = await api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    }, "customer")
    persistRole("customer", { token: data.token, user: data.user, kitchen: null })
    return data
  }

  const signupCustomer = async ({ name, email, phone, password }) => {
    return api("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    }, "customer")
  }

  const loginCustomer = async (identifier, password) => {
    const isPhone = /^[6-9]\d{9}$/.test(identifier.replace(/\D/g, ""))
    const body = isPhone ? { phone: identifier.replace(/\D/g, ""), password } : { email: identifier.toLowerCase(), password }
    const data = await api("/api/auth/customer/login", {
      method: "POST",
      body: JSON.stringify(body),
    }, "customer")

    if (data.requiresOtp) {
      return data
    }

    persistRole("customer", { token: data.token, user: data.user, kitchen: null })
    return data
  }

  const verifyLoginOtp = async (identifier, password, otp) => {
    const isPhone = /^[6-9]\d{9}$/.test(identifier.replace(/\D/g, ""))
    const body = isPhone ? { phone: identifier.replace(/\D/g, ""), password, otp } : { email: identifier.toLowerCase(), password, otp }
    const data = await api("/api/auth/customer/login/verify-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }, "customer")
    persistRole("customer", { token: data.token, user: data.user, kitchen: null })
    return data
  }

  const sendForgotPasswordOtp = async (phoneOrEmail) => {
    const isEmail = phoneOrEmail.includes("@")
    const body = isEmail ? { email: phoneOrEmail } : { phone: phoneOrEmail }
    return api("/api/auth/customer/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }, "customer")
  }

  const verifySignupOtp = async (userId, otp) => {
    return api("/api/auth/customer/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ userId, otp }),
    }, "customer")
  }

  const resendSignupOtp = async (userId) => {
    return api("/api/auth/customer/register/resend-otp", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, "customer")
  }

  const resetPassword = async ({ phoneOrEmail, otp, password }) => {
    const isEmail = phoneOrEmail.includes("@")
    const body = isEmail 
      ? { email: phoneOrEmail, otp, password } 
      : { phone: phoneOrEmail, otp, password }
    return api("/api/auth/customer/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(body),
    }, "customer")
  }

  const updateProfile = async (profile) => {
    const data = await api("/api/auth/customer/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    }, "customer")
    const stored = readSessionForRole("customer")
    if (stored?.token) {
      persistRole("customer", { token: stored.token, user: data.user, kitchen: null })
    }
    return data
  }

  const logout = useCallback(() => {
    applyRoleSession(currentRole, null)
  }, [applyRoleSession, currentRole])

  const logoutCustomer = useCallback(() => {
    applyRoleSession("customer", null)
  }, [applyRoleSession])

  const logoutAdmin = useCallback(() => {
    applyRoleSession("admin", null)
  }, [applyRoleSession])

  const logoutKitchen = useCallback(() => {
    applyRoleSession("kitchen", null)
  }, [applyRoleSession])

  const refreshKitchen = useCallback(async () => {
    const data = await api("/api/kitchens/me", {}, "kitchen")
    patchSessionForRole("kitchen", { kitchen: data.kitchen })
    reloadSessions()
    return data.kitchen
  }, [reloadSessions])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = readSessionForRole(currentRole)

      if (!stored?.token) {
        if (!cancelled) setSessionReady(true)
        return
      }

      reloadSessions()

      try {
        const data = await api("/api/auth/me", {}, currentRole)
        if (cancelled || !data?.user) return

        applyRoleSession(currentRole, {
          token: stored.token,
          user: data.user,
          kitchen:
            currentRole === "kitchen"
              ? (data.kitchen ?? stored.kitchen ?? null)
              : null,
        })
      } catch (err) {
        if (cancelled) return
        if (import.meta.env.DEV && err instanceof ApiError) {
          console.warn(`Session refresh skipped (${currentRole}):`, err.message)
        }
      } finally {
        if (!cancelled) setSessionReady(true)
      }
    }

    setSessionReady(false)
    bootstrap()

    return () => {
      cancelled = true
    }
  }, [currentRole, applyRoleSession, reloadSessions])

  useEffect(() => {
    if (activeSession?.token) {
      import("../lib/firebase")
        .then(({ requestWebNotificationPermission }) => {
          requestWebNotificationPermission(activeSession.token)
        })
        .catch((err) => console.warn("Web notification init error:", err))
    }
  }, [activeSession?.token])

  const value = useMemo(
    () => ({
      user,
      kitchen,
      customerUser,
      adminUser,
      kitchenPartnerUser,
      sessionReady,
      currentRole,
      isAdmin: Boolean(adminUser),
      isCustomer: Boolean(customerUser),
      isKitchen: Boolean(kitchenPartnerUser),
      loginKitchen,
      verifyKitchenLoginOtp,
      registerKitchen,
      verifyKitchenRegisterOtp,
      sendKitchenForgotPasswordOtp,
      resetKitchenPassword,
      loginAdmin,
      registerCustomer,
      signupCustomer,
      verifySignupOtp,
      resendSignupOtp,
      loginCustomer,
      verifyLoginOtp,
      sendForgotPasswordOtp,
      resetPassword,
      updateProfile,
      logout,
      logoutCustomer,
      logoutAdmin,
      logoutKitchen,
      refreshKitchen,
    }),
    [user, kitchen, customerUser, adminUser, kitchenPartnerUser, sessionReady, currentRole, logout, logoutCustomer, logoutAdmin, logoutKitchen, refreshKitchen, verifyKitchenRegisterOtp]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
