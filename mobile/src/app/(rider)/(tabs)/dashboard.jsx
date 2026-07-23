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
  Modal
} from "react-native"

// Custom Alert wrapper to support React Native Web / Browser environment
const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === "web") {
      const formattedMessage = title ? `${title}\n\n${message || ""}` : message;
      window.alert(formattedMessage);
      if (buttons) {
        const actionBtn = buttons.find(b => b.onPress && b.text !== "Cancel" && b.text !== "Continue" && b.style !== "cancel");
        if (actionBtn) {
          const proceed = window.confirm(`Go to: ${actionBtn.text}?`);
          if (proceed) actionBtn.onPress();
        }
      }
    } else {
      const { Alert: RNAlert } = require("react-native");
      RNAlert.alert(title, message, buttons);
    }
  }
};
import { SafeAreaView } from "react-native-safe-area-context"
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
  Phone,
  Zap,
  Wallet
} from "lucide-react-native"
import { useAuth } from "../../../context/AuthContext"
import {
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
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [otpInput, setOtpInput] = useState("")
  const [alertConfig, setAlertConfig] = useState(null)

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

    // Immediately push initial location
    updateRiderLocation(26.8467, 80.9462).catch(console.warn)

    const timer = setInterval(() => {
      // Jitter location slightly for simulation
      const lat = 26.8467 + (Math.random() - 0.5) * 0.002
      const lng = 80.9462 + (Math.random() - 0.5) * 0.002
      updateRiderLocation(lat, lng).catch(console.warn)
    }, 20000)

    return () => clearInterval(timer)
  }, [metrics?.isOnline, metrics?.status])

  // Periodic polling for metrics & broadcasts when online
  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const data = await getRiderDashboard()
        if (!active) return
        setMetrics(data)
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
        {/* Decorative background accents */}
        <View style={{ position: "absolute", top: -50, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <View style={{ position: "absolute", bottom: -70, left: -30, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.045)" }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 17 }}>{initial}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", fontFamily: "Nunito" }}>{getGreeting()}</Text>
            <Text style={{ fontSize: 19, fontWeight: "bold", fontFamily: "Poppins", color: "#FFFFFF", marginTop: 1 }}>{user?.name || "Rider"}</Text>
          </View>
        </View>

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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Unified stats card — one clean surface instead of stacked color blocks */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, marginTop: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, overflow: "hidden" }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Alert.alert("Your Earnings", `You've earned ₹${metrics?.totalEarnings || 0} from ${metrics?.totalDeliveries || 0} completed ${metrics?.totalDeliveries === 1 ? "delivery" : "deliveries"} so far. Keep it up!`)}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20 }}
          >
            <View>
              <Text style={{ fontSize: 12, color: "#8A8A8A", fontFamily: "Nunito" }}>Total Earnings</Text>
              <Text style={{ fontSize: 32, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F", marginTop: 4 }}>₹{metrics?.totalEarnings || 0}</Text>
              <Text style={{ fontSize: 11, color: "#0B6B3A", fontFamily: "Nunito", fontWeight: "600", marginTop: 4 }}>Lifetime earnings on this account</Text>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFF1E6", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={22} color="#FF6B00" />
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
              onPress={() =>
                Alert.alert(
                  cashCollected > 0 ? "Cash Deposit Reminder" : "Cash in Hand",
                  cashCollected > 0
                    ? `You're holding ₹${cashCollected} in collected COD cash. Please deposit this with your kitchen partner(s) as soon as possible to keep your account in good standing.`
                    : "You have no pending COD cash right now. Cash collected from customers will show up here until it's deposited."
                )
              }
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

        {/* Rider tip — keeps the page feeling alive without inventing fake metrics */}
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
              )}

              {metrics.activeOrder.delivery_status === "arrived_customer" && (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={otpInput}
                    onChangeText={setOtpInput}
                    editable={!actionLoading}
                    placeholder="Enter 4-digit Customer Delivery OTP"
                    keyboardType="numeric"
                    maxLength={4}
                    style={{ borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: actionLoading ? "#F5F5F5" : "#FFFFFF", fontFamily: "Nunito" }}
                  />
                  <TouchableOpacity
                    onPress={() => handleOrderAction(metrics.activeOrder.id, "deliver", { deliveryOtp: otpInput })}
                    disabled={actionLoading}
                    style={{ backgroundColor: "#0B6B3A", paddingVertical: 14, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Verify & Complete Delivery</Text>
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
            {/* Header Icon based on type */}
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

            {/* Title */}
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center", marginBottom: 8 }}>
              {alertConfig?.title}
            </Text>

            {/* Message */}
            <Text style={{ fontSize: 13, color: "#4A4A4A", fontFamily: "Nunito", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
              {alertConfig?.message}
            </Text>

            {/* Buttons Row */}
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
    </SafeAreaView>
  )
}
