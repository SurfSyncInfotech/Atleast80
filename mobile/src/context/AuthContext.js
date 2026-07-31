import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Platform, Alert } from "react-native"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import {
  api,
  ApiError,
  registerKitchen as registerKitchenApi,
  verifyRegisterOtp,
  registerRider as registerRiderApi,
  verifyRiderRegisterOtp as verifyRiderRegisterOtpApi
} from "../lib/api"
import {
  initAuthStorage,
  writeStoredAuth,
  patchStoredAuth,
  clearStoredAuth,
  readStoredAuthSync,
} from "../lib/authStorage"

// Configure foreground notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function registerForPushNotificationsAsync() {
  let token
  if (Platform.OS === "web") return null

  try {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (finalStatus !== "granted") {
        Alert.alert("Notification Permission", "Permission was denied. Please enable notifications in your phone Settings to receive updates.")
        return null
      }

      try {
        token = (await Notifications.getDevicePushTokenAsync()).data
        console.log("FCM Device Token:", token)
      } catch (e) {
        try {
          const projectId = Constants?.expoConfig?.extra?.eas?.projectId
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
          console.log("Expo Push Token (Fallback):", token)
        } catch (err) {
          console.warn("Failed to retrieve push token from services: " + err.message)
        }
      }
    } else {
      console.log("Push notifications are only supported on physical devices, not simulators.")
    }
  } catch (err) {
    console.error("Failed during registration process: " + err.message)
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    })
  }

  return token
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const stored = readStoredAuthSync()
  const [user, setUser] = useState(stored?.user ?? null)
  const [kitchen, setKitchen] = useState(stored?.kitchen ?? null)
  const [rider, setRider] = useState(stored?.rider ?? null)
  const [loading, setLoading] = useState(!stored?.token)

  const applySession = useCallback(async (authData) => {
    console.log("[AuthContext] applySession called with:", authData ? { user: authData.user, hasToken: !!authData.token } : "null")
    if (!authData?.token || !authData?.user) {
      console.log("[AuthContext] Clearing stored auth.")
      await clearStoredAuth()
      setUser(null)
      setKitchen(null)
      setRider(null)
      return
    }

    console.log("[AuthContext] Writing stored auth to AsyncStorage...")
    await writeStoredAuth(authData)
    console.log("[AuthContext] Stored auth written successfully. Setting state...")
    setUser(authData.user)
    setKitchen(authData.kitchen ?? null)
    setRider(authData.rider ?? null)

    // Trigger push token registration on successful session initialization
    setTimeout(async () => {
      try {
        const token = await registerForPushNotificationsAsync()
        if (token) {
          await api("/api/auth/push-token", {
            method: "POST",
            body: JSON.stringify({ token }),
          })
          console.log("✅ FCM Push token registered to user account.")
        }
      } catch (err) {
        console.warn("Push token registration skipped or failed:", err.message)
      }
    }, 1000)
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
        rider: authData.rider ?? null,
      })
    },
    [applySession]
  )

  const loginKitchen = async (identifier, password) => {
    const data = await api("/api/auth/kitchen/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    })
    if (data.requiresOtp) {
      return data
    }
    await persist({ token: data.token, user: data.user, kitchen: data.kitchen })
    return data
  }

  const verifyKitchenLoginOtp = async (identifier, password, otp) => {
    const data = await api("/api/auth/kitchen/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, password, otp }),
    })
    await persist({ token: data.token, user: data.user, kitchen: data.kitchen })
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

  const loginRider = async (identifier, password) => {
    const data = await api("/api/auth/rider/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    })
    if (data.requiresOtp) {
      return data
    }
    await persist({ token: data.token, user: data.user, rider: data.rider })
    return data
  }

  const verifyRiderLoginOtp = async (identifier, password, otp) => {
    const data = await api("/api/auth/rider/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, password, otp }),
    })
    await persist({ token: data.token, user: data.user, rider: data.rider })
    return data
  }

  const registerRider = async (form, aadhaarCardFile, aadhaarCardBackFile, panCardFile, drivingLicenseFile) => {
    const data = await registerRiderApi(form, aadhaarCardFile, aadhaarCardBackFile, panCardFile, drivingLicenseFile)
    return data
  }

  const verifyRiderRegisterOtp = async (userId, otp) => {
    const data = await verifyRiderRegisterOtpApi(userId, otp)
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

  const verifySignupOtp = async (userId, otp) => {
    return api("/api/auth/customer/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ userId, otp }),
    })
  }

  const resendSignupOtp = async (userId) => {
    return api("/api/auth/customer/register/resend-otp", {
      method: "POST",
      body: JSON.stringify({ userId }),
    })
  }

  const loginCustomer = async (identifier, password) => {
    const isPhone = /^[6-9]\d{9}$/.test(identifier.replace(/\D/g, ""))
    const body = isPhone ? { phone: identifier.replace(/\D/g, ""), password } : { email: identifier, password }
    const data = await api("/api/auth/customer/login", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (data.requiresOtp) {
      return data
    }
    await persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const verifyLoginOtp = async (identifier, password, otp) => {
    const isPhone = /^[6-9]\d{9}$/.test(identifier.replace(/\D/g, ""))
    const body = isPhone ? { phone: identifier.replace(/\D/g, ""), password, otp } : { email: identifier, password, otp }
    const data = await api("/api/auth/customer/login/verify-otp", {
      method: "POST",
      body: JSON.stringify(body),
    })
    await persist({ token: data.token, user: data.user, kitchen: null })
    return data
  }

  const sendForgotPasswordOtp = async (phoneOrEmail) => {
    const isEmail = phoneOrEmail.includes("@")
    const body = isEmail ? { email: phoneOrEmail } : { phone: phoneOrEmail }
    return api("/api/auth/customer/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  const resetPassword = async ({ phoneOrEmail, otp, password }) => {
    const isEmail = phoneOrEmail.includes("@")
    const body = isEmail 
      ? { email: phoneOrEmail, otp, password } 
      : { phone: phoneOrEmail, otp, password }
    return api("/api/auth/customer/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(body),
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

  const refreshRider = useCallback(async () => {
    try {
      const data = await api("/api/rider/dashboard")
      // Merge onto the existing rider record (which holds vehicle/document fields
      // loaded once from /api/auth/me) instead of replacing it, so those fields survive.
      const existing = readStoredAuthSync()?.rider || null
      const riderUpdate = {
        ...existing,
        status: data.status,
        is_online: data.isOnline,
        cash_collected: data.cashCollected,
        total_earnings: data.totalEarnings,
        total_deliveries: data.totalDeliveries,
      }
      setRider(riderUpdate)
      const updated = await patchStoredAuth({ rider: riderUpdate })
      if (updated) {
        setRider(updated.rider)
      }
      return riderUpdate
    } catch (_) {}
  }, [])

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
        setRider(stored.rider ?? null)

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
          rider: data.user.role === "rider" ? (data.rider ?? stored.rider ?? null) : null,
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          console.log("[AuthContext] Stored token was invalid or expired (401). Clearing invalid session.")
          await applySession(null)
        } else {
          console.warn("[AuthContext] Bootstrap validation failed with error:", err)
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
        rider,
        loading,
        isAdmin: user?.role === "admin",
        isKitchen: user?.role === "kitchen",
        isCustomer: user?.role === "customer",
        isRider: user?.role === "rider",
        loginKitchen,
        verifyKitchenLoginOtp,
        registerKitchen,
        verifyKitchenRegisterOtp,
        loginRider,
        verifyRiderLoginOtp,
        registerRider,
        verifyRiderRegisterOtp,
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
        refreshKitchen,
        refreshRider,
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
