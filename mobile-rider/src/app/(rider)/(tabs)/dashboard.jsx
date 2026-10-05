import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
  Modal,
  Image,
  Pressable,
  KeyboardAvoidingView
} from "react-native"

import * as Location from "expo-location"

const FALLBACK_LOCATIONS = {
  states: [
    { name: "Maharashtra", iso2: "MH" },
    { name: "Delhi", iso2: "DL" },
    { name: "Karnataka", iso2: "KA" },
    { name: "Gujarat", iso2: "GJ" },
    { name: "Uttar Pradesh", iso2: "UP" }
  ],
  cities: {
    MH: [
      { name: "Mumbai" },
      { name: "Pune" },
      { name: "Thane" },
      { name: "Navi Mumbai" },
      { name: "Goregaon" },
      { name: "Kolad" },
      { name: "Roha" },
      { name: "Mangaon" }
    ],
    DL: [
      { name: "New Delhi" },
      { name: "Dwarka" },
      { name: "Rohini" }
    ],
    KA: [
      { name: "Bengaluru" },
      { name: "Mysuru" },
      { name: "Mangaluru" }
    ],
    GJ: [
      { name: "Ahmedabad" },
      { name: "Surat" },
      { name: "Vadodara" }
    ],
    UP: [
      { name: "Lucknow" },
      { name: "Kanpur" },
      { name: "Noida" },
      { name: "Ghaziabad" }
    ]
  }
}

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing
} from "react-native-reanimated"
import {
  CheckCircle,
  Navigation,
  MapPin,
  CreditCard,
  Search,
  AlertTriangle,
  AlertCircle,
  Phone,
  Zap,
  Wallet,
  ChevronDown,
  ChevronRight,
  X,
  KeyRound
} from "lucide-react-native"
import { useAuth } from "../../../context/AuthContext"
import {
  api,
  getRiderDashboard,
  toggleRiderStatus,
  updateRiderLocation,
  getAvailableRiderDeliveries,
  performRiderDeliveryAction
} from "../../../lib/api"

const DELIVERY_STEPS = [
  { key: "accepted", label: "Accepted" },
  { key: "arrived_kitchen", label: "At Kitchen" },
  { key: "picked_up", label: "Picked Up" },
  { key: "arrived_customer", label: "At Customer" },
  { key: "handover_pending", label: "Done" }
]

const RescueCountdownCard = ({ activeOrder, onTimeout }) => {
  const [secondsLeft, setSecondsLeft] = useState(180)

  useEffect(() => {
    let cancelledTime = Date.now()
    if (activeOrder?.updated_at) {
      let str = String(activeOrder.updated_at).replace(" ", "T")
      if (!str.includes("Z") && !str.includes("+")) str += "Z"
      const parsed = new Date(str).getTime()
      if (!isNaN(parsed)) cancelledTime = parsed
    }
    const elapsed = Math.floor((Date.now() - cancelledTime) / 1000)
    const initialRemaining = Math.max(0, 180 - Math.max(0, elapsed))
    setSecondsLeft(initialRemaining)

    if (initialRemaining <= 0) {
      if (onTimeout) {
        setTimeout(() => onTimeout(), 0)
      }
      return
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (onTimeout) {
            setTimeout(() => onTimeout(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeOrder?.updated_at])

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0")
  const secs = (secondsLeft % 60).toString().padStart(2, "0")

  return (
    <View style={{ backgroundColor: "#FFF9E6", borderRadius: 16, padding: 18, gap: 12, borderWidth: 1.5, borderColor: "#FCD34D", alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="small" color="#D97706" />
        <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#92400E", fontSize: 14.5 }}>
          Food Rescue Broadcast Active 📢
        </Text>
      </View>

      <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#F59E0B" }}>
        <Text style={{ fontFamily: "Poppins", fontWeight: "800", color: "#B45309", fontSize: 24, letterSpacing: 1 }}>
          ⏱️ {mins}:{secs}
        </Text>
      </View>

      <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#92400E", textAlign: "center", lineHeight: 18 }}>
        Order was cancelled at doorstep. Food is now broadcasted to nearby users in your city with Free Delivery. Please wait 3 minutes for a claim.
      </Text>
    </View>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning,"
  if (hour < 17) return "Good afternoon,"
  return "Good evening,"
}

function PulseRing({ delay }) {
  const scale = useSharedValue(0.55)
  const opacity = useSharedValue(0.5)

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.9, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    )
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }))

  return (
    <Animated.View
      style={[
        { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "#0B6B3A" },
        animatedStyle
      ]}
    />
  )
}

function DeliveryStepper({ currentStatus }) {
  const currentIndex = DELIVERY_STEPS.findIndex((s) => s.key === currentStatus)

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
      {DELIVERY_STEPS.map((step, idx) => {
        const done = idx < currentIndex
        const active = idx === currentIndex
        const dotColor = done ? "#0B6B3A" : active ? "#FF6B00" : "#E0E0E0"
        return (
          <View key={step.key} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%", height: 20 }}>
              <View style={{ flex: idx === 0 ? 0 : 1, height: 2, backgroundColor: idx === 0 ? "transparent" : (done || active ? "#0B6B3A" : "#E0E0E0") }} />
              <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                {done ? (
                  <CheckCircle size={16} color="#0B6B3A" fill="#EAF7EE" />
                ) : (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
                )}
              </View>
              <View style={{ flex: idx === DELIVERY_STEPS.length - 1 ? 0 : 1, height: 2, backgroundColor: idx < currentIndex ? "#0B6B3A" : "#E0E0E0" }} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 8.5,
                marginTop: 4,
                fontFamily: "Nunito",
                fontWeight: active ? "bold" : "500",
                color: active ? "#FF6B00" : done ? "#0B6B3A" : "#9E9E9E",
                textAlign: "center",
                width: "100%"
              }}
            >
              {step.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function RiderDashboardScreen() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [otpInput, setOtpInput] = useState("")
  const [alertConfig, setAlertConfig] = useState(null)
  const [qrModalConfig, setQrModalConfig] = useState(null)
  const [depositUtrInput, setDepositUtrInput] = useState("")

  const scrollViewRef = useRef(null)

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 150)
  }

  // Doorstep Cancellation OTP Modal States
  const [cancelOtpModalOpen, setCancelOtpModalOpen] = useState(false)
  const [cancelOtpInput, setCancelOtpInput] = useState("")
  const [cancelOtpError, setCancelOtpError] = useState("")

  // Customer Unreachable Modal States
  const [unreachableModalVisible, setUnreachableModalVisible] = useState(false)
  const [unreachableNote, setUnreachableNote] = useState("")

  // Rider Payouts Modal States
  const [riderPayoutsModalVisible, setRiderPayoutsModalVisible] = useState(false)
  const [riderPayoutsList, setRiderPayoutsList] = useState([])
  const [riderPayoutsLoading, setRiderPayoutsLoading] = useState(false)

  const handleOpenRiderPayoutsModal = async () => {
    setRiderPayoutsModalVisible(true)
    setRiderPayoutsLoading(true)
    try {
      const data = await api("/api/rider/me/payouts")
      setRiderPayoutsList(data.payouts || [])
    } catch (err) {
      console.log("Failed to load rider payouts:", err)
    } finally {
      setRiderPayoutsLoading(false)
    }
  }

  const handleCancelUnreachable = async () => {
    if (!metrics?.activeOrder?.id) return
    setUnreachableModalVisible(false)
    await handleOrderAction(metrics.activeOrder.id, "cancel_doorstep", { note: unreachableNote })
  }

  const handleDismissReturnedOrder = async (orderId) => {
    setActionLoading(true)
    try {
      await api(`/api/rider/deliveries/${orderId}/dismiss-returned`, {
        method: "POST",
      })
      const freshData = await getRiderDashboard()
      setMetrics(freshData)
      Alert.alert("Delivery Cleared", "Order cleared. You can now accept new deliveries!")
    } catch (err) {
      Alert.alert("Action Failed", err.message || "Failed to dismiss order")
    } finally {
      setActionLoading(false)
    }
  }

  // Rider Location Filter/Selection States
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [statePickerVisible, setStatePickerVisible] = useState(false)
  const [cityPickerVisible, setCityPickerVisible] = useState(false)

  const [stateSearchText, setStateSearchText] = useState("")
  const [citySearchText, setCitySearchText] = useState("")

  const [tempState, setTempState] = useState(user?.state || "")
  const [tempStateIso, setTempStateIso] = useState("")
  const [tempCity, setTempCity] = useState(user?.city || "")
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    if (user?.state) {
      setTempState(user.state)
      const matched = FALLBACK_LOCATIONS.states.find(
        (s) => (s.name || "").toLowerCase() === user.state.toLowerCase() || (s.iso2 || "").toLowerCase() === user.state.toLowerCase()
      )
      if (matched) setTempStateIso(matched.iso2)
    }
    if (user?.city) {
      setTempCity(user.city)
    }
  }, [user?.state, user?.city])

  const filteredStates = (statesList || []).filter(
    (s) => s && s.name && s.name.toLowerCase().includes(stateSearchText.trim().toLowerCase())
  )

  const filteredCities = (citiesList || []).filter((c) => {
    const cName = typeof c === "string" ? c : (c.name || String(c))
    return cName.toLowerCase().includes(citySearchText.trim().toLowerCase())
  })

  const fetchCitiesForState = async (stateIso, stateName) => {
    let resolvedIso = stateIso
    if (!resolvedIso && stateName) {
      const match = (statesList.length ? statesList : FALLBACK_LOCATIONS.states).find(
        s => (s.name || "").toLowerCase() === stateName.toLowerCase() || (s.iso2 || "").toLowerCase() === stateName.toLowerCase()
      )
      if (match && match.iso2) resolvedIso = match.iso2
    }

    let fetched = []
    if (resolvedIso) {
      try {
        const cData = await api(`/api/locations/cities?state=${encodeURIComponent(resolvedIso)}`)
        fetched = (cData.cities || []).map(c => typeof c === "string" ? { name: c } : c)
      } catch (e) {
        console.warn("Error fetching cities by ISO:", e)
      }
    }
    if (fetched.length === 0 && stateName) {
      try {
        const cData = await api(`/api/locations/cities?state=${encodeURIComponent(stateName)}`)
        fetched = (cData.cities || []).map(c => typeof c === "string" ? { name: c } : c)
      } catch (e) {
        console.warn("Error fetching cities by name:", e)
      }
    }
    if (fetched.length === 0 && resolvedIso) {
      const fb = FALLBACK_LOCATIONS.cities[resolvedIso] || []
      fetched = fb.map(c => typeof c === "string" ? { name: c } : c)
    }
    return fetched
  }

  const handleAutoDetectLocation = async () => {
    setDetectingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to auto-detect your location.")
        setDetectingLocation(false)
        return
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = loc.coords

      let data = null
      try {
        data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)
      } catch (err) {
        console.warn("SurfSync reverse geocode error:", err)
      }

      if (data) {
        const addr = data.address || {}
        const displayState = data.state || addr.state || ""
        const displayCity = data.city || data.suburb || data.district || addr.city || addr.town || addr.village || addr.county || ""
        let stateIso = ""
        const matchedState = FALLBACK_LOCATIONS.states.find(s => s.name.toLowerCase() === displayState.toLowerCase())
        if (matchedState) stateIso = matchedState.iso2

        if (displayState && displayCity) {
          setTempState(displayState)
          setTempStateIso(stateIso)
          setTempCity(displayCity)

          let initialCities = await fetchCitiesForState(stateIso, displayState)
          if (!initialCities.some(c => (c.name || c).toLowerCase() === displayCity.toLowerCase())) {
            initialCities = [{ name: displayCity }, ...initialCities]
          }
          setCitiesList(initialCities)
        } else {
          Alert.alert("Location Error", "Could not resolve state or city from GPS coordinates.")
        }
      } else {
        Alert.alert("Location Error", "Could not reverse-geocode your coordinates.")
      }
    } catch (err) {
      console.warn("Auto-detect failed:", err)
      Alert.alert("Detection Failed", "Something went wrong while detecting your location.")
    } finally {
      setDetectingLocation(false)
    }
  }

  // Load States list
  const loadStates = async () => {
    if (statesList.length > 0) return
    setStatesLoading(true)
    try {
      const data = await api("/api/locations/states")
      setStatesList(data.states || [])
    } catch (err) {
      console.warn("Failed to load states from API, using fallback locations:", err)
      setStatesList(FALLBACK_LOCATIONS.states)
    } finally {
      setStatesLoading(false)
    }
  }

  const handleSelectState = async (stateName, stateIso) => {
    setTempState(stateName)
    setTempStateIso(stateIso)
    setTempCity("")
    setStatePickerVisible(false)

    setCitiesLoading(true)
    try {
      const norm = await fetchCitiesForState(stateIso, stateName)
      setCitiesList(norm)
    } catch (err) {
      console.warn("Failed to load cities from API, using fallback locations:", err)
      const fallback = (FALLBACK_LOCATIONS.cities[stateIso] || []).map(c => typeof c === "string" ? { name: c } : c)
      setCitiesList(fallback)
    } finally {
      setCitiesLoading(false)
    }
  }

  const handleSelectCity = (cityName) => {
    setTempCity(cityName)
    setCityPickerVisible(false)
  }

  const handleSaveLocation = async () => {
    try {
      await api("/api/auth/location", {
        method: "PATCH",
        body: JSON.stringify({
          state: tempState,
          city: tempCity,
          stateIso: tempStateIso,
        }),
      })
      if (user) {
        user.city = tempCity
        user.state = tempState
      }
      setLocationModalVisible(false)
      const data = await getRiderDashboard()
      setMetrics(data)
    } catch (err) {
      Alert.alert("Error", "Failed to save delivery location")
    }
  }

  const handleClearLocation = async () => {
    try {
      await api("/api/auth/location", {
        method: "PATCH",
        body: JSON.stringify({
          state: "",
          city: "",
          stateIso: "",
        }),
      })
      if (user) {
        user.city = ""
        user.state = ""
      }
      setTempState("")
      setTempStateIso("")
      setTempCity("")
      setLocationModalVisible(false)
      const data = await getRiderDashboard()
      setMetrics(data)
    } catch (err) {
      Alert.alert("Error", "Failed to clear location")
    }
  }

  const Alert = {
    alert: (title, message, buttons) => {
      let type = "info"
      const lowerTitle = title?.toLowerCase() || ""
      const lowerMsg = message?.toLowerCase() || ""
      if (lowerTitle.includes("fail") || lowerTitle.includes("error") || lowerTitle.includes("wrong") || lowerTitle.includes("invalid") || lowerMsg.includes("wrong") || lowerMsg.includes("invalid")) {
        type = "error"
      } else if (lowerTitle.includes("success") || lowerTitle.includes("complete") || lowerTitle.includes("deliver") || lowerTitle.includes("pick")) {
        type = "success"
      }
      setAlertConfig({ title, message, type, buttons })
    }
  }

  // Location updating timer
  useEffect(() => {
    if (!metrics?.isOnline || metrics?.status !== "active") return

    let isMounted = true
    let intervalId = null

    const trackRiderLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          console.warn("Rider location permission denied. Falling back to default.")
          if (isMounted) {
            updateRiderLocation(26.8467, 80.9462).catch(console.warn)
          }
          return
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (isMounted) {
          updateRiderLocation(loc.coords.latitude, loc.coords.longitude).catch(console.warn)
        }

        intervalId = setInterval(async () => {
          try {
            const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            if (isMounted) {
              updateRiderLocation(currentLoc.coords.latitude, currentLoc.coords.longitude).catch(console.warn)
            }
          } catch (err) {
            console.warn("Rider periodic location update failed:", err.message)
          }
        }, 30000)

      } catch (err) {
        console.warn("Rider location tracking initialization error:", err.message)
      }
    }

    trackRiderLocation()

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [metrics?.isOnline, metrics?.status])

  // Periodic polling for metrics & broadcasts when online
  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const data = await getRiderDashboard()
        if (!active) return

        setMetrics((prevMetrics) => {
          const prevStatus = prevMetrics?.activeOrder?.delivery_status
          const newStatus = data.activeOrder?.delivery_status
          if (prevStatus !== "rescue_timeout" && newStatus === "rescue_timeout") {
            Alert.alert(
              "Rescue Timeout ⚠️",
              "No one claimed this order within 3 minutes. Please return the food back to the kitchen."
            )
          }
          return data
        })
        setLoading(false)

        if (data.isOnline && data.status === "active" && !data.activeOrder) {
          const feed = await getAvailableRiderDeliveries()
          if (active) setBroadcasts(feed.deliveries || [])
        } else {
          if (active) setBroadcasts([])
        }
      } catch (err) {
        console.warn("Failed to poll rider dashboard:", err)
      }
    }

    loadData()
    const timer = setInterval(loadData, 10000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleToggleDuty = async (value) => {
    try {
      setLoading(true)
      const data = await toggleRiderStatus(value)
      setMetrics((m) => ({ ...m, isOnline: data.isOnline }))
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to toggle duty status")
    } finally {
      setLoading(false)
    }
  }

  const handleOrderAction = async (orderId, action, extra = {}) => {
    try {
      setActionLoading(true)
      const res = await performRiderDeliveryAction(orderId, action, extra)
      setMetrics((m) => ({ ...m, activeOrder: res.order }))
      setOtpInput("")

      if (action === "pickup") {
        Alert.alert("Order Picked Up! 📦", "You have successfully picked up the food. Drive safely to the customer's drop location!")
      } else if (action === "deliver") {
        Alert.alert("Delivery Completed! 🎉", "Success! The order has been delivered successfully. Your delivery fee earnings have been credited to your wallet.")
      } else {
        Alert.alert("Success", res.message || `Action ${action} completed successfully`)
      }
    } catch (err) {
      const errMsg = err.message || ""
      const isCodeError = errMsg.toLowerCase().includes("otp") || errMsg.toLowerCase().includes("code") || errMsg.toLowerCase().includes("invalid")

      if (isCodeError) {
        Alert.alert(
          "Verification Failed ❌",
          "You have entered a wrong verification code or OTP. Please check with the kitchen/customer and try again."
        )
      } else {
        Alert.alert("Action Failed", errMsg || "Failed to update delivery progress")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteDeliveryPress = () => {
    if (!otpInput || otpInput.trim().length !== 4) {
      Alert.alert("Enter OTP", "Please enter the 4-digit customer delivery OTP first.")
      return
    }

    const orderObj = metrics.activeOrder
    const remAmt = Number(orderObj?.remaining_amount || 0)
    const isCod = orderObj?.payment_method === "cod" || remAmt > 0 || (Number(orderObj?.grand_total || 0) - Number(orderObj?.advance_amount || 0)) > 5

    if (!isCod) {
      handleOrderAction(metrics.activeOrder.id, "deliver", { deliveryOtp: otpInput })
      return
    }

    const collectAmt = remAmt > 0 ? remAmt : (orderObj?.collect_amount ?? Math.max(0, Number(orderObj?.grand_total || 0) - Number(orderObj?.advance_amount || 30)))

    Alert.alert(
      "Select Payment Mode",
      `How is the customer paying remaining ₹${collectAmt}?`,
      [
        {
          text: "Cash",
          onPress: () => {
            handleOrderAction(metrics.activeOrder.id, "deliver", { deliveryOtp: otpInput, paymentType: "cash" })
          }
        },
        {
          text: "Online (QR)",
          onPress: () => {
            setQrModalConfig({
              title: "Collect COD Payment (QR)",
              amount: collectAmt,
              onConfirm: () => handleOrderAction(metrics.activeOrder.id, "deliver", { deliveryOtp: otpInput, paymentType: "qr" })
            })
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    )
  }

  const handleCancelDoorstepPress = async () => {
    if (!metrics?.activeOrder?.id) return

    setCancelOtpInput("")
    setCancelOtpError("")

    try {
      setActionLoading(true)
      await api(`/api/rider/deliveries/${metrics.activeOrder.id}/request-cancel-otp`, {
        method: "POST",
      })
    } catch (err) {
      console.warn("Cancellation OTP request warning:", err.message)
    } finally {
      setActionLoading(false)
    }

    setCancelOtpModalOpen(true)
  }

  const submitCancellationOtp = () => {
    if (!cancelOtpInput || cancelOtpInput.trim().length !== 4) {
      setCancelOtpError("Please enter the valid 4-digit Cancellation OTP")
      return
    }
    setCancelOtpError("")
    setCancelOtpModalOpen(false)
    handleOrderAction(metrics.activeOrder.id, "cancel_doorstep", { cancellationOtp: cancelOtpInput.trim() })
  }

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert("Error", "Unable to place phone call")
      })
    }
  }

  if (loading && !metrics) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F7F5" }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    )
  }

  const status = metrics?.status || "pending"
  const isOnline = metrics?.isOnline || false
  const cashCollected = metrics?.cashCollected || 0

  const initial = (user?.name || "R").trim().charAt(0).toUpperCase()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F5" }} edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={["#0B6B3A", "#0A5A31", "#063D22"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", top: -50, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <View style={{ position: "absolute", bottom: -70, left: -30, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.045)" }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 17 }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", fontFamily: "Nunito" }}>{getGreeting()}</Text>
            <Text style={{ fontSize: 19, fontWeight: "bold", fontFamily: "Poppins", color: "#FFFFFF", marginTop: 1 }}>{user?.name || "Rider"}</Text>
          </View>
        </View>

        {/* Rider Location Selector */}
        <TouchableOpacity
          onPress={() => {
            setLocationModalVisible(true)
            loadStates()
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(255,255,255,0.12)",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginTop: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <MapPin size={14} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold", fontFamily: "Poppins", flex: 1 }} numberOfLines={1}>
            {user?.city || metrics?.city || "Select Delivery City (Click to Set)"}
          </Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {status === "active" && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginTop: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: isOnline ? "#4ADE80" : "rgba(255,255,255,0.5)" }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 13 }}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontFamily: "Nunito", fontSize: 10.5, marginTop: 1 }} numberOfLines={1}>
                  {isOnline ? "Visible to nearby kitchens for new orders" : "Go online to start receiving delivery requests"}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleDuty}
              trackColor={{ false: "rgba(255,255,255,0.25)", true: "#12D18E" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.25)"
            />
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(120, insets.bottom + 80) }}
          showsVerticalScrollIndicator={false}
        >
        {/* Stats card */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, marginTop: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, overflow: "hidden" }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenRiderPayoutsModal}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#8A8A8A", fontFamily: "Nunito" }}>Today's Earnings</Text>
              <Text style={{ fontSize: 26, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A", marginTop: 2 }}>₹{metrics?.todayEarnings || 0}</Text>
              <Text style={{ fontSize: 10, color: "#9E9E9E", fontFamily: "Nunito", marginTop: 2 }}>{metrics?.todayDeliveries || 0} deliveries today</Text>
            </View>

            <View style={{ width: 1, height: 40, backgroundColor: "#F1F1EF", marginHorizontal: 16 }} />

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#8A8A8A", fontFamily: "Nunito" }}>Total Earnings</Text>
              <Text style={{ fontSize: 26, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F", marginTop: 2 }}>₹{metrics?.totalEarnings || 0}</Text>
              <Text style={{ fontSize: 10, color: "#9E9E9E", fontFamily: "Nunito", marginTop: 2 }}>Lifetime earnings</Text>
            </View>

            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF1E6", alignItems: "center", justifyContent: "center", marginLeft: 8 }}>
              <Wallet size={18} color="#FF6B00" />
            </View>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: "#F1F1EF", marginHorizontal: 20 }} />

          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingVertical: 16, alignItems: "center", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CheckCircle size={15} color="#0B6B3A" />
                <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>{metrics?.totalDeliveries || 0}</Text>
              </View>
              <Text style={{ fontSize: 10.5, color: "#8A8A8A", fontFamily: "Nunito" }}>Deliveries</Text>
            </View>

            <View style={{ width: 1, backgroundColor: "#F1F1EF" }} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (cashCollected > 0) {
                  setDepositUtrInput("")
                  setQrModalConfig({
                    title: "Deposit Cash to Admin (QR)",
                    amount: cashCollected,
                    requireUtr: true,
                    onConfirm: async (utrVal) => {
                      try {
                        setActionLoading(true)
                        const res = await api("/api/rider/deposit-cash", {
                          method: "POST",
                          body: JSON.stringify({ amount: cashCollected, utrNumber: utrVal }),
                        })
                        Alert.alert("Deposit Request Sent 🕒", `Your deposit request of ₹${cashCollected} has been submitted to Admin. Admin will verify your UTR and approve your deposit.`)
                      } catch (err) {
                        Alert.alert("Deposit Failed", err.message || "Failed to process cash deposit")
                      } finally {
                        setActionLoading(false)
                      }
                    }
                  })
                } else {
                  Alert.alert("Cash in Hand", "You have no outstanding COD cash to deposit right now.")
                }
              }}
              style={{ flex: 1, paddingVertical: 16, alignItems: "center", gap: 4 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CreditCard size={15} color={cashCollected > 0 ? "#F59E0B" : "#0B6B3A"} />
                <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>₹{cashCollected}</Text>
              </View>
              <Text style={{ fontSize: 10.5, color: cashCollected > 0 ? "#B7791F" : "#8A8A8A", fontFamily: "Nunito", fontWeight: cashCollected > 0 ? "bold" : "400" }}>
                {cashCollected > 0 ? "Cash · Deposit due" : "Cash in Hand"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payouts & Settlement History Dedicated Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenRiderPayoutsModal}
          style={{
            flexDirection: "row",
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1.5,
            borderColor: "#E5E7EB",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" }}>
              <Wallet size={22} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>
                Payouts & Bank Settlements
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#6B7280", marginTop: 2 }}>
                View all bank transfers & UTR receipts
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: "#059669", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "bold", fontFamily: "Poppins", color: "#FFFFFF" }}>
              View History
            </Text>
          </View>
        </TouchableOpacity>

        {/* Rider tip */}
        <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 20, gap: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="#0B6B3A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>Rider Tip</Text>
            <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", marginTop: 2, lineHeight: 15 }}>
              Double-check pickup and delivery codes before entering them — accurate verification keeps every delivery smooth.
            </Text>
          </View>
        </View>

        {/* Verification Pending state */}
        {status !== "active" && (
          <View style={{ backgroundColor: "#FFF9E6", borderRadius: 20, padding: 20, marginBottom: 20, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF1B8", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={20} color="#B7791F" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#856404", flex: 1 }}>Verification Pending</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#856404", fontFamily: "Nunito", lineHeight: 18 }}>
              Your account details and KYC uploads are currently being reviewed by our Admin team. We will activate your account soon!
            </Text>
          </View>
        )}

        {/* Active Order Card */}
        {metrics?.activeOrder && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, marginBottom: 24, gap: 16, shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF1E6", alignItems: "center", justifyContent: "center" }}>
                  <Navigation size={16} color="#FF6B00" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>Active Delivery</Text>
              </View>
              <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Poppins", fontWeight: "600" }}>
                #{metrics.activeOrder.order_number}
              </Text>
            </View>

            {/* Progress stepper */}
            <DeliveryStepper currentStatus={metrics.activeOrder.delivery_status} />

            {/* Addresses info */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0B6B3A", marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito" }}>Pickup Kitchen</Text>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>{metrics.activeOrder.kitchen_name}</Text>
                  <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito", marginTop: 2 }}>{metrics.activeOrder.kitchen_address}</Text>
                </View>
                {metrics.activeOrder.kitchen_phone ? (
                  <TouchableOpacity
                    onPress={() => handleCall(metrics.activeOrder.kitchen_phone)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#FAF6F0",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#EADEC9"
                    }}
                  >
                    <Phone size={14} color="#0B6B3A" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={{ height: 1, backgroundColor: "#E8E8E8", marginVertical: 4 }} />

              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF6B00", marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito" }}>Drop Address</Text>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>{metrics.activeOrder.customer_name}</Text>
                  <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito", marginTop: 2 }}>{metrics.activeOrder.delivery_address}</Text>
                </View>
                {metrics.activeOrder.customer_phone ? (
                  <TouchableOpacity
                    onPress={() => handleCall(metrics.activeOrder.customer_phone)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#FAF6F0",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#EADEC9"
                    }}
                  >
                    <Phone size={14} color="#0B6B3A" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Cash details */}
            <View style={{ backgroundColor: "#F8F8F5", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito" }}>Payment Method:</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: metrics.activeOrder.payment_method === "cod" ? "#EF4444" : "#0B6B3A", fontFamily: "Poppins" }}>
                {metrics.activeOrder.payment_method === "cod" ? `COLLECT CASH: ₹${metrics.activeOrder.grand_total}` : "PREPAID - DO NOT COLLECT CASH"}
              </Text>
            </View>

            {/* Action buttons list */}
            <View>
              {metrics.activeOrder.delivery_status === "accepted" && (
                <TouchableOpacity
                  onPress={() => handleOrderAction(metrics.activeOrder.id, "arrive_kitchen")}
                  disabled={actionLoading}
                  style={{ backgroundColor: "#0B6B3A", paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Arrived at Kitchen</Text>
                  )}
                </TouchableOpacity>
              )}

              {metrics.activeOrder.delivery_status === "arrived_kitchen" && (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={otpInput}
                    onChangeText={setOtpInput}
                    editable={!actionLoading}
                    placeholder="Enter 4-digit Kitchen Pick Up Code"
                    keyboardType="numeric"
                    maxLength={4}
                    onFocus={handleInputFocus}
                    style={{ borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: actionLoading ? "#F5F5F5" : "#FFFFFF", fontFamily: "Nunito" }}
                  />
                  <TouchableOpacity
                    onPress={() => handleOrderAction(metrics.activeOrder.id, "pickup", { pickupCode: otpInput })}
                    disabled={actionLoading}
                    style={{ backgroundColor: "#FF6B00", paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Verify & Confirm Pick Up</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {metrics.activeOrder.delivery_status === "picked_up" && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleOrderAction(metrics.activeOrder.id, "arrive_customer")}
                    disabled={actionLoading}
                    style={{ backgroundColor: "#0B6B3A", paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Arrived at Customer</Text>
                    )}
                  </TouchableOpacity>
                  {Boolean(
                    metrics.activeOrder.is_rescue === 1 ||
                    (metrics.activeOrder.original_order_id && Number(metrics.activeOrder.original_order_id) > 0) ||
                    metrics.activeOrder.delivery_status === "rescue_claimed"
                  ) ? (
                    <TouchableOpacity
                      onPress={() => setUnreachableModalVisible(true)}
                      disabled={actionLoading}
                      style={{ borderWidth: 1.5, borderColor: "#F59E0B", backgroundColor: "#FEF3C7", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                    >
                      <Text style={{ color: "#B45309", fontWeight: "bold", fontFamily: "Poppins" }}>Customer Unreachable? (Cancel Order)</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleCancelDoorstepPress}
                        disabled={actionLoading}
                        style={{ borderWidth: 1.5, borderColor: "#EF4444", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                      >
                        <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel at Doorstep (Customer Paid)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setUnreachableModalVisible(true)}
                        disabled={actionLoading}
                        style={{ borderWidth: 1.5, borderColor: "#F59E0B", backgroundColor: "#FEF3C7", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                      >
                        <Text style={{ color: "#B45309", fontWeight: "bold", fontFamily: "Poppins" }}>Customer Unreachable? (Cancel Order)</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {["arrived_customer", "rescue_claimed"].includes(metrics.activeOrder.delivery_status) && (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={otpInput}
                    onChangeText={setOtpInput}
                    editable={!actionLoading}
                    placeholder="Enter 4-digit Customer Delivery OTP"
                    keyboardType="numeric"
                    maxLength={4}
                    onFocus={handleInputFocus}
                    style={{ borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: actionLoading ? "#F5F5F5" : "#FFFFFF", fontFamily: "Nunito" }}
                  />
                  <TouchableOpacity
                    onPress={handleCompleteDeliveryPress}
                    disabled={actionLoading}
                    style={{ backgroundColor: "#0B6B3A", paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Verify & Complete Delivery</Text>
                    )}
                  </TouchableOpacity>
                  {Boolean(
                    metrics.activeOrder.is_rescue === 1 ||
                    (metrics.activeOrder.original_order_id && Number(metrics.activeOrder.original_order_id) > 0) ||
                    metrics.activeOrder.delivery_status === "rescue_claimed"
                  ) ? (
                    <TouchableOpacity
                      onPress={() => setUnreachableModalVisible(true)}
                      disabled={actionLoading}
                      style={{ borderWidth: 1.5, borderColor: "#F59E0B", backgroundColor: "#FEF3C7", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                    >
                      <Text style={{ color: "#B45309", fontWeight: "bold", fontFamily: "Poppins" }}>Customer Unreachable? (Cancel Order)</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleCancelDoorstepPress}
                        disabled={actionLoading}
                        style={{ borderWidth: 1.5, borderColor: "#EF4444", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                      >
                        <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel at Doorstep (Customer Paid)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setUnreachableModalVisible(true)}
                        disabled={actionLoading}
                        style={{ borderWidth: 1.5, borderColor: "#F59E0B", backgroundColor: "#FEF3C7", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                      >
                        <Text style={{ color: "#B45309", fontWeight: "bold", fontFamily: "Poppins" }}>Customer Unreachable? (Cancel Order)</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {metrics.activeOrder.delivery_status === "rescue_active" && (
                <RescueCountdownCard
                  activeOrder={metrics.activeOrder}
                  onTimeout={async () => {
                    setMetrics((m) => m?.activeOrder ? {
                      ...m,
                      activeOrder: { ...m.activeOrder, delivery_status: "rescue_timeout" }
                    } : m)
                    try {
                      const fresh = await getRiderDashboard()
                      setMetrics(fresh)
                    } catch (e) {
                      console.warn("Failed to refresh dashboard on rescue timeout:", e)
                    }
                  }}
                />
              )}

              {(metrics.activeOrder.delivery_status === "rescue_timeout" || metrics.activeOrder.delivery_status === "cancelled_unreachable") && (
                <View style={{ backgroundColor: "#FEF2F2", borderRadius: 16, padding: 16, gap: 12, borderWidth: 1.5, borderColor: "#FCA5A5" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={20} color="#B91C1C" />
                    <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#B91C1C", fontSize: 13.5, flex: 1 }}>
                      Order Cancelled — Return Food to Kitchen 🏠
                    </Text>
                  </View>

                  <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#991B1B", lineHeight: 18 }}>
                    {metrics.activeOrder.delivery_status === "cancelled_unreachable"
                      ? "Order was cancelled because customer was unreachable / not responding at doorstep."
                      : "No nearby customer claimed the food within 3 minutes."}
                    {" Please return the food items to the kitchen partner or call the kitchen owner for instructions."}
                  </Text>

                  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: "#FECACA" }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "bold", color: "#7F1D1D", fontFamily: "Poppins", uppercase: true }}>
                      KITCHEN CONTACT DETAILS:
                    </Text>
                    <Text style={{ fontSize: 13.5, fontWeight: "bold", color: "#1F2937", fontFamily: "Poppins" }}>
                      {metrics.activeOrder.kitchen_name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: "#4B5563", fontFamily: "Nunito" }}>
                      {metrics.activeOrder.kitchen_address}
                    </Text>
                    {metrics.activeOrder.kitchen_phone ? (
                      <TouchableOpacity
                        onPress={() => handleCall(metrics.activeOrder.kitchen_phone)}
                        style={{
                          backgroundColor: "#059669",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          paddingVertical: 10,
                          borderRadius: 10,
                          marginTop: 4
                        }}
                      >
                        <Phone size={14} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 12, fontFamily: "Poppins" }}>
                          Call Kitchen Owner ({metrics.activeOrder.kitchen_phone})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDismissReturnedOrder(metrics.activeOrder.id)}
                    disabled={actionLoading}
                    style={{
                      backgroundColor: "#DC2626",
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>
                        Return Completed / Clear Active Delivery
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {metrics.activeOrder.delivery_status === "handover_pending" && (
                <View style={{ backgroundColor: "#FFF9E6", borderRadius: 12, padding: 16, gap: 6 }}>
                  <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#856404", fontSize: 13 }}>
                    Pending Cash Handover 💵
                  </Text>
                  <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#856404", lineHeight: 18 }}>
                    Please hand over the collected cash of ₹{metrics.activeOrder.grand_total} to the kitchen owner ({metrics.activeOrder.kitchen_name || "Kitchen"}).
                  </Text>
                  <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#9E8130", fontStyle: "italic", marginTop: 4 }}>
                    Once they confirm receiving the cash on their dashboard, this order will be fully completed and cleared.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Available Deliveries List */}
        {status === "active" && isOnline && !metrics?.activeOrder && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>Available Deliveries</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#0B6B3A" }} />
                  <Text style={{ fontSize: 10.5, color: "#8A8A8A", fontFamily: "Nunito" }}>Live nearby, updates automatically</Text>
                </View>
              </View>
              {broadcasts.length > 0 && (
                <View style={{ backgroundColor: "#EAF7EE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, color: "#0B6B3A", fontFamily: "Poppins", fontWeight: "bold" }}>{broadcasts.length} nearby</Text>
                </View>
              )}
            </View>

            {broadcasts.length === 0 ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, paddingVertical: 36, paddingHorizontal: 24, alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}>
                <View style={{ width: 90, height: 90, alignItems: "center", justifyContent: "center" }}>
                  <PulseRing delay={0} />
                  <PulseRing delay={700} />
                  <PulseRing delay={1400} />
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D5EFDF" }}>
                    <Search size={24} color="#0B6B3A" />
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "Poppins", fontWeight: "bold" }}>Searching for new nearby orders...</Text>
                <Text style={{ fontSize: 11.5, color: "#9E9E9E", fontFamily: "Nunito", textAlign: "center", lineHeight: 17 }}>
                  Orders ready for pickup in Lucknow will appear here automatically.
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8F8F5", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginTop: 2 }}>
                  <Zap size={11} color="#FF6B00" />
                  <Text style={{ fontSize: 10.5, color: "#7A7A7A", fontFamily: "Nunito", fontWeight: "600" }}>Stay online to receive orders faster</Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {broadcasts.map((order) => (
                  <View key={order.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFF1E6", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                          <Zap size={9} color="#FF6B00" />
                          <Text style={{ fontSize: 9, color: "#FF6B00", fontFamily: "Poppins", fontWeight: "bold" }}>NEW</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: "#7A7A7A", fontFamily: "Poppins" }}>#{order.order_number}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 9.5, color: "#9E9E9E", fontFamily: "Nunito" }}>Estimated payout</Text>
                        <Text style={{ fontSize: 15, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>₹30.00</Text>
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#F1F1EF" }} />

                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <MapPin size={14} color="#0B6B3A" />
                        <Text style={{ fontSize: 12, color: "#1F1F1F", fontFamily: "Nunito", flex: 1 }} numberOfLines={1}>
                          From: {order.kitchen_name} · {order.kitchen_address}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <MapPin size={14} color="#FF6B00" />
                        <Text style={{ fontSize: 12, color: "#1F1F1F", fontFamily: "Nunito", flex: 1 }} numberOfLines={1}>
                          To: {order.delivery_address}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        disabled={actionLoading}
                        onPress={() => handleOrderAction(order.id, "accept")}
                        style={{ flex: 1, backgroundColor: "#FF6B00", paddingVertical: 12, borderRadius: 12, alignItems: "center" }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>Accept Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Premium Alert Modal */}
      <Modal
        visible={alertConfig !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertConfig(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor:
                alertConfig?.type === "success" ? "#EAF7EE" :
                alertConfig?.type === "error" ? "#FDEDEC" : "#FFF9E6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16
            }}>
              {alertConfig?.type === "success" ? (
                <CheckCircle size={28} color="#0B6B3A" />
              ) : alertConfig?.type === "error" ? (
                <AlertTriangle size={28} color="#EF4444" />
              ) : (
                <AlertTriangle size={28} color="#F59E0B" />
              )}
            </View>

            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center", marginBottom: 8 }}>
              {alertConfig?.title}
            </Text>

            <Text style={{ fontSize: 13, color: "#4A4A4A", fontFamily: "Nunito", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
              {alertConfig?.message}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              {alertConfig?.buttons && alertConfig.buttons.length > 0 ? (
                alertConfig.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setAlertConfig(null)
                      if (btn.onPress) btn.onPress()
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: btn.style === "cancel" ? "#F5F5F5" : "#FF6B00",
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: "center",
                      borderWidth: btn.style === "cancel" ? 1 : 0,
                      borderColor: "#E8E8E8"
                    }}
                  >
                    <Text style={{
                      color: btn.style === "cancel" ? "#4A4A4A" : "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: 13,
                      fontFamily: "Poppins"
                    }}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  onPress={() => setAlertConfig(null)}
                  style={{
                    flex: 1,
                    backgroundColor: "#0B6B3A",
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: "center"
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                    OK
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* UPI QR Payment Modal */}
      <Modal
        visible={qrModalConfig !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setQrModalConfig(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10
          }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center", marginBottom: 4 }}>
              {qrModalConfig?.title || "Scan & Pay"}
            </Text>
            <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", textAlign: "center", marginBottom: 16 }}>
              Show this QR code to the customer to scan
            </Text>

            {qrModalConfig && (
              <View style={{ borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 16, padding: 12, backgroundColor: "#FFFFFF", marginBottom: 16 }}>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      `upi://pay?pa=admin@atleast80&pn=Atleast80&am=${qrModalConfig.amount}&cu=INR&tn=Atleast80_Order_${metrics?.activeOrder?.order_number || ""}`
                    )}`
                  }}
                  style={{ width: 200, height: 200, borderRadius: 8 }}
                  resizeMode="contain"
                />
              </View>
            )}

            <Text style={{ fontSize: 13, color: "#8A8A8A", fontFamily: "Nunito" }}>Total Amount to Collect</Text>
            <Text style={{ fontSize: 32, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A", marginTop: 2, marginBottom: 24 }}>
              ₹{qrModalConfig?.amount || 0}
            </Text>

            {qrModalConfig?.requireUtr && (
              <View style={{ width: "100%", marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F", marginBottom: 4 }}>
                  Enter Payment UTR / Reference No.
                </Text>
                <TextInput
                  value={depositUtrInput}
                  onChangeText={setDepositUtrInput}
                  placeholder="e.g. 981273918237"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    width: "100%",
                    backgroundColor: "#F9FAFB",
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: "#111827",
                  }}
                />
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setQrModalConfig(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#F5F5F5",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E8E8E8"
                }}
              >
                <Text style={{ color: "#4A4A4A", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const onConfirm = qrModalConfig?.onConfirm
                  const utrVal = depositUtrInput
                  setQrModalConfig(null)
                  if (onConfirm) onConfirm(utrVal)
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#0B6B3A",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center"
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                  Paid & Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unified Location Selector Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (statePickerVisible) {
            setStatePickerVisible(false)
            setStateSearchText("")
          } else if (cityPickerVisible) {
            setCityPickerVisible(false)
            setCitySearchText("")
          } else {
            setLocationModalVisible(false)
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View 
            style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          >
            <Pressable 
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
              onPress={() => {
                if (statePickerVisible) {
                  setStatePickerVisible(false)
                  setStateSearchText("")
                } else if (cityPickerVisible) {
                  setCityPickerVisible(false)
                  setCitySearchText("")
                } else {
                  setLocationModalVisible(false)
                }
              }}
            />
            <View 
              style={{ 
                backgroundColor: "#FFFFFF", 
                borderTopLeftRadius: 32, 
                borderTopRightRadius: 32, 
                paddingHorizontal: 24, 
                paddingTop: 24, 
                paddingBottom: Platform.OS === "ios" ? 44 : 28, 
                maxHeight: "85%" 
              }}
            >
              {statePickerVisible ? (
                /* STATE PICKER VIEW */
                <View style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select State</Text>
                    <TouchableOpacity onPress={() => { setStatePickerVisible(false); setStateSearchText(""); }} style={{ padding: 4 }}>
                      <X size={18} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  {/* State Search Bar */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F5F5F5",
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      height: 48,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: "#E5E5E5",
                    }}
                  >
                    <Search size={18} color="#7A7A7A" style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search state..."
                      placeholderTextColor="#9CA3AF"
                      value={stateSearchText}
                      onChangeText={setStateSearchText}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: "#1F1F1F",
                        height: "100%",
                      }}
                    />
                    {stateSearchText ? (
                      <TouchableOpacity onPress={() => setStateSearchText("")}>
                        <X size={16} color="#7A7A7A" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {statesLoading ? (
                    <ActivityIndicator size="small" color="#0B6B3A" style={{ marginVertical: 20 }} />
                  ) : (
                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {filteredStates.length === 0 ? (
                        <Text style={{ fontSize: 14, color: "#7A7A7A", textAlign: "center", paddingVertical: 24, fontFamily: "Nunito" }}>No states found</Text>
                      ) : (
                        filteredStates.map((stateItem) => (
                          <TouchableOpacity
                            key={stateItem.iso2 || stateItem.id || stateItem.name}
                            onPress={() => {
                              const code = stateItem.iso2 || (stateItem.id && stateItem.id.includes(":") ? stateItem.id.split(":")[1] : stateItem.id) || "";
                              handleSelectState(stateItem.name, code);
                              setStateSearchText("");
                            }}
                            style={{
                              paddingVertical: 14,
                              borderBottomWidth: 1,
                              borderBottomColor: "#F5F5F5",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}
                          >
                            <Text style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "Nunito", fontWeight: tempState === stateItem.name ? "bold" : "normal" }}>
                              {stateItem.name}
                            </Text>
                            {tempState === stateItem.name && <CheckCircle size={16} color="#0B6B3A" />}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  )}
                </View>
              ) : cityPickerVisible ? (
                /* CITY PICKER VIEW */
                <View style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                      Select City {tempState ? `(${tempState})` : ""}
                    </Text>
                    <TouchableOpacity onPress={() => { setCityPickerVisible(false); setCitySearchText(""); }} style={{ padding: 4 }}>
                      <X size={18} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  {/* City Search Bar */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F5F5F5",
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      height: 48,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: "#E5E5E5",
                    }}
                  >
                    <Search size={18} color="#7A7A7A" style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Search or type city name..."
                      placeholderTextColor="#9CA3AF"
                      value={citySearchText}
                      onChangeText={setCitySearchText}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: "#1F1F1F",
                        height: "100%",
                      }}
                    />
                    {citySearchText ? (
                      <TouchableOpacity onPress={() => setCitySearchText("")}>
                        <X size={16} color="#7A7A7A" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {citiesLoading ? (
                    <ActivityIndicator size="small" color="#0B6B3A" style={{ marginVertical: 20 }} />
                  ) : (
                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {/* Custom City Option if user typed something */}
                      {citySearchText.trim().length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            handleSelectCity(citySearchText.trim())
                            setCitySearchText("")
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            backgroundColor: "#EAF7EE",
                            borderRadius: 14,
                            marginBottom: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderWidth: 1,
                            borderColor: "#A3D3B8",
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>
                              Select "{citySearchText.trim()}"
                            </Text>
                            <Text style={{ fontSize: 11, color: "#0B6B3A", fontFamily: "Nunito" }}>Type / Custom City</Text>
                          </View>
                          <CheckCircle size={18} color="#0B6B3A" />
                        </TouchableOpacity>
                      )}

                      {filteredCities.length === 0 && !citySearchText ? (
                        <Text style={{ fontSize: 14, color: "#7A7A7A", textAlign: "center", paddingVertical: 24, fontFamily: "Nunito" }}>No cities found</Text>
                      ) : (
                        filteredCities.slice(0, 50).map((cityItem, idx) => {
                          const cName = typeof cityItem === "string" ? cityItem : (cityItem.name || String(cityItem))
                          return (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                handleSelectCity(cName)
                                setCitySearchText("")
                              }}
                              style={{
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: "#F5F5F5",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between"
                              }}
                            >
                              <Text style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "Nunito", fontWeight: tempCity === cName ? "bold" : "normal" }}>
                                {cName}
                              </Text>
                              {tempCity === cName && <CheckCircle size={16} color="#0B6B3A" />}
                            </TouchableOpacity>
                          )
                        })
                      )}
                    </ScrollView>
                  )}
                </View>
              ) : (
                /* MAIN LOCATION FORM */
                <View style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select Delivery City</Text>
                    <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={{ padding: 4 }}>
                      <X size={20} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleAutoDetectLocation}
                    disabled={detectingLocation}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#EAF7EE",
                      borderRadius: 16,
                      paddingVertical: 12,
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {detectingLocation ? (
                      <ActivityIndicator size="small" color="#0B6B3A" />
                    ) : (
                      <MapPin size={16} color="#0B6B3A" />
                    )}
                    <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                      {detectingLocation ? "Detecting location..." : "Auto-Detect Current Location"}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>State</Text>
                    <TouchableOpacity
                      onPress={() => {
                        loadStates()
                        setStatePickerVisible(true)
                      }}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: "#E8E8E8",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "Nunito" }}>
                        {tempState || "Select State"}
                      </Text>
                      <ChevronDown size={16} color="#7A7A7A" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>City</Text>
                    <TouchableOpacity
                      disabled={!tempState}
                      onPress={() => {
                        setCitySearchText("")
                        setCityPickerVisible(true)
                        if (citiesList.length === 0 && tempState) {
                          setCitiesLoading(true)
                          fetchCitiesForState(tempStateIso, tempState)
                            .then((fetched) => {
                              const cityName = tempCity
                              let list = fetched || []
                              if (cityName && !list.some((c) => (c.name || c).toLowerCase() === cityName.toLowerCase())) {
                                list = [{ name: cityName }, ...list]
                              }
                              setCitiesList(list.length > 0 ? list : cityName ? [{ name: cityName }] : [])
                            })
                            .catch((err) => {
                              console.warn("Failed to load cities:", err)
                            })
                            .finally(() => {
                              setCitiesLoading(false)
                            })
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: tempState ? "#E8E8E8" : "#F5F5F3",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: tempState ? "#FFFFFF" : "#F5F5F3",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: tempState ? "#1F1F1F" : "#7A7A7A", fontFamily: "Nunito" }}>
                        {tempCity || "Select City"}
                      </Text>
                      <ChevronDown size={16} color="#7A7A7A" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      onPress={handleSaveLocation}
                      disabled={!tempState || !tempCity}
                      style={{
                        backgroundColor: (!tempState || !tempCity) ? "#A3D3B8" : "#0B6B3A",
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                        Confirm Location
                      </Text>
                    </TouchableOpacity>

                    {(metrics?.city || user?.city) ? (
                      <TouchableOpacity
                        onPress={handleClearLocation}
                        style={{
                          backgroundColor: "#F5F5F3",
                          borderRadius: 16,
                          paddingVertical: 16,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                          Clear Location
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rider Payouts & Settlement History Modal */}
      <Modal
        visible={riderPayoutsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRiderPayoutsModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setRiderPayoutsModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "75%", width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F1EF" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>
                  Delivery Fee Payout History
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }}>
                  Bank transfers & delivery fee earnings credited by Admin
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRiderPayoutsModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              {riderPayoutsLoading ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#0B6B3A" />
                </View>
              ) : riderPayoutsList.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <CreditCard size={36} color="#CCCCCC" />
                  <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", marginTop: 8 }}>
                    No bank payout settlements recorded yet.
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
                    Admin delivery fee payouts will appear here with Date and UTR Reference number once transferred.
                  </Text>
                </View>
              ) : (
                riderPayoutsList.map((p) => (
                  <View key={p.id} style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 18, fontWeight: "bold", fontFamily: "Poppins", color: "#059669" }}>
                        ₹{p.netPayout}
                      </Text>
                      <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", fontFamily: "Poppins", color: "#065F46" }}>
                          PAID ✅
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "bold", fontFamily: "monospace", color: "#1F2937" }}>
                        UTR Ref: {p.utrNumber || "—"}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#9CA3AF", marginTop: 2 }}>
                        Paid on: {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "—"}
                      </Text>
                      {p.notes ? (
                        <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563", fontStyle: "italic" }}>
                          Notes: {p.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Customer Unreachable Modal */}
      <Modal
        visible={unreachableModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnreachableModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}
          onPress={() => setUnreachableModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, width: "100%", maxWidth: 400, gap: 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>
                Customer Unreachable
              </Text>
              <TouchableOpacity onPress={() => setUnreachableModalVisible(false)} style={{ padding: 4 }}>
                <X size={18} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#4B5563", lineHeight: 18 }}>
              Please confirm that you arrived at the customer doorstep and attempted to call/contact them. Add a short note below:
            </Text>

            <TextInput
              value={unreachableNote}
              onChangeText={setUnreachableNote}
              placeholder="e.g. Called customer 3 times at doorstep, no answer."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                fontSize: 12.5,
                fontFamily: "Nunito",
                color: "#111827",
                textAlignVertical: "top",
                minHeight: 80,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setUnreachableModalVisible(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" }}
              >
                <Text style={{ color: "#4B5563", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancelUnreachable}
                disabled={actionLoading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Submit & Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Doorstep Cancellation OTP Modal */}
      <Modal
        visible={cancelOtpModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelOtpModalOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}
          onPress={() => setCancelOtpModalOpen(false)}
        >
          <Pressable
            style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", gap: 12 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <KeyRound size={28} color="#DC2626" />
            </View>

            <Text style={{ fontSize: 18, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", textAlign: "center" }}>
              Doorstep Cancellation 🔑
            </Text>

            <Text style={{ fontSize: 12.5, fontFamily: "Nunito", color: "#4B5563", textAlign: "center", lineHeight: 19 }}>
              A 4-digit Cancellation OTP has been sent to the customer's phone and app tracking screen. Ask customer for the OTP to confirm cancellation:
            </Text>

            <View style={{ width: "100%", marginTop: 8, marginBottom: 8 }}>
              <TextInput
                value={cancelOtpInput}
                onChangeText={(text) => {
                  setCancelOtpInput(text)
                  if (cancelOtpError) setCancelOtpError("")
                }}
                placeholder="0000"
                placeholderTextColor="#D1D5DB"
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  width: "100%",
                  height: 52,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: cancelOtpError ? "#EF4444" : "#D1D5DB",
                  borderRadius: 16,
                  textAlign: "center",
                  fontSize: 22,
                  fontFamily: "Poppins",
                  fontWeight: "bold",
                  letterSpacing: 8,
                  color: "#1F2937"
                }}
              />
              {cancelOtpError ? (
                <Text style={{ fontSize: 11.5, fontFamily: "Nunito", color: "#EF4444", marginTop: 6, textAlign: "center" }}>
                  {cancelOtpError}
                </Text>
              ) : null}
            </View>

            <View style={{ width: "100%", gap: 10 }}>
              <TouchableOpacity
                onPress={submitCancellationOtp}
                disabled={actionLoading}
                style={{ width: "100%", height: 48, borderRadius: 24, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>
                    Confirm Cancellation
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setCancelOtpModalOpen(false)
                  setCancelOtpInput("")
                  setCancelOtpError("")
                }}
                disabled={actionLoading}
                style={{ width: "100%", height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}
              >
                <Text style={{ color: "#374151", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
