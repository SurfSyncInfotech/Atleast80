import { useCallback, useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Switch } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useFocusEffect } from "expo-router"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated"
import { LogOut, Phone, Mail, Truck, ShieldCheck, Hash, Calendar, CheckCircle, Wallet, CreditCard } from "lucide-react-native"
import { useAuth } from "../../../context/AuthContext"
import { toggleRiderStatus } from "../../../lib/api"

// Shared design tokens for this screen — one radius/typography scale used everywhere
const RADIUS = 20
const RADIUS_SM = 14
const COLORS = {
  bg: "#F7F7F5",
  card: "#FFFFFF",
  divider: "#EFEFEC",
  label: "#9A9A94",
  value: "#1F1F1F",
  iconBg: "#EAF7EE",
  iconFg: "#0B6B3A",
}
const TYPE = {
  heading: { fontFamily: "Poppins", fontWeight: "bold" },
  label: { fontFamily: "Nunito", fontWeight: "500" },
  value: { fontFamily: "Nunito", fontWeight: "700" },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
}

function formatPartnerSince(value) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning,"
  if (hour < 17) return "Good afternoon,"
  return "Good evening,"
}

function PulsingDot({ color }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }, animatedStyle]}
    />
  )
}

function StatColumn({ icon: Icon, iconColor, value, label, withDivider }) {
  return (
    <>
      <View style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon size={14} color={iconColor} />
          <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        </View>
        <Text style={{ fontSize: 10.5, color: COLORS.label, ...TYPE.label }}>{label}</Text>
      </View>
      {withDivider && <View style={{ width: 1, backgroundColor: COLORS.divider }} />}
    </>
  )
}

function DetailRow({ icon: Icon, label, value, valueStyle }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: RADIUS_SM, backgroundColor: COLORS.iconBg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={COLORS.iconFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: COLORS.label, ...TYPE.label }}>{label}</Text>
        <Text style={{ fontSize: 15, color: COLORS.value, marginTop: 2, ...TYPE.value, ...valueStyle }}>{value}</Text>
      </View>
    </View>
  )
}

export default function RiderProfileScreen() {
  const router = useRouter()
  const { user, rider, logout, refreshRider } = useAuth()
  const [dutyLoading, setDutyLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      refreshRider()
    }, [])
  )

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to log out?")
      if (confirmLogout) {
        await logout()
        router.replace("/onboarding")
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout()
            router.replace("/onboarding")
          },
        },
      ])
    }
  }

  const handleToggleDuty = async (value) => {
    try {
      setDutyLoading(true)
      await toggleRiderStatus(value)
      await refreshRider()
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update duty status")
    } finally {
      setDutyLoading(false)
    }
  }

  const isActive = rider?.status === "active"
  const isOnline = rider?.is_online || false
  const initial = (user?.name || "R").trim().charAt(0).toUpperCase()
  const riderId = user?.id ? `RDR-${String(user.id).padStart(4, "0")}` : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top"]}>
      {/* Header — full-bleed banner, curved bottom corners only, matching the dashboard header */}
      <LinearGradient
        colors={["#0B6B3A", "#0A5F3B", "#08543F", "#054036"]}
        locations={[0, 0.4, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" }}
      >
        {/* Decorative background accents */}
        <View style={{ position: "absolute", top: -50, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <View style={{ position: "absolute", bottom: -70, left: -30, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.045)" }} />

        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.35)",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 19, ...TYPE.heading }}>{initial}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", ...TYPE.label }}>{getGreeting()}</Text>
              <Text style={{ fontSize: 19, color: "#FFFFFF", marginTop: 1, ...TYPE.heading }}>{user?.name || "Rider Partner"}</Text>
              <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 1, ...TYPE.label }}>Rider Partner</Text>
            </View>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255,255,255,0.16)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <PulsingDot color={isActive ? "#4ADE80" : "#FDE68A"} />
              <Text style={{ fontSize: 10, color: "#FFFFFF", letterSpacing: 0.4, textTransform: "uppercase", ...TYPE.heading }}>
                {rider?.status || "PENDING"}
              </Text>
            </View>
            {riderId && (
              <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", letterSpacing: 0.6, ...TYPE.mono }}>
                {riderId}
              </Text>
            )}
          </View>
        </View>

        {isActive && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(255,255,255,0.14)",
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginTop: 18,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.16)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: isOnline ? "#4ADE80" : "rgba(255,255,255,0.5)" }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 13, ...TYPE.heading }}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 10.5, marginTop: 1, ...TYPE.label }} numberOfLines={1}>
                  {isOnline ? "Visible to nearby kitchens for new orders" : "Go online to start receiving delivery requests"}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleDuty}
              disabled={dutyLoading}
              trackColor={{ false: "rgba(255,255,255,0.25)", true: "#12D18E" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.25)"
            />
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Stats Row — deliveries, earnings, cash collected */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: COLORS.card,
            borderRadius: RADIUS,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <StatColumn icon={CheckCircle} iconColor={COLORS.iconFg} value={rider?.total_deliveries ?? 0} label="Deliveries" withDivider />
          <StatColumn icon={Wallet} iconColor="#FF6B00" value={`₹${rider?.total_earnings ?? 0}`} label="Earnings" withDivider />
          <StatColumn icon={CreditCard} iconColor={rider?.cash_collected > 0 ? "#B7791F" : COLORS.iconFg} value={`₹${rider?.cash_collected ?? 0}`} label="Cash Collected" />
        </View>

        {/* Account Details */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: RADIUS,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <Text style={{ fontSize: 15, color: COLORS.value, padding: 20, paddingBottom: 4, ...TYPE.heading }}>Account Details</Text>

          <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 18, marginTop: 12 }}>
            <DetailRow icon={Phone} label="Phone Number" value={user?.phone || "—"} />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow icon={Mail} label="Email Address" value={user?.email || "—"} />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow
              icon={Truck}
              label="Vehicle Type"
              value={rider?.vehicle_type || "bicycle"}
              valueStyle={{ textTransform: "capitalize" }}
            />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow icon={Hash} label="Vehicle Number" value={rider?.vehicle_number || "—"} />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow icon={Calendar} label="Partner Since" value={formatPartnerSince(rider?.created_at)} />
          </View>
        </View>

        {/* Partner status card */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: COLORS.card,
            borderRadius: RADIUS,
            padding: 16,
            marginBottom: 20,
            gap: 14,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS_SM,
              backgroundColor: isActive ? COLORS.iconBg : "#FFF9E6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={18} color={isActive ? COLORS.iconFg : "#B7791F"} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 13, color: COLORS.value, ...TYPE.heading }}>
              {isActive ? "Verified Delivery Partner" : "Verification in Progress"}
            </Text>
            <Text style={{ fontSize: 11.5, color: "#7A7A7A", lineHeight: 16, ...TYPE.label }}>
              {isActive
                ? "You're an active part of the Atleast80 rider network."
                : "Our team is reviewing your details before activation."}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "#FDF2F2",
            paddingVertical: 15,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: "#F8D7D7",
            shadowColor: "#EF4444",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.14,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <LogOut size={16} color="#EF4444" />
          <Text style={{ color: "#EF4444", fontSize: 14, ...TYPE.heading }}>Log Out</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10.5, color: "#B5B5B0", textAlign: "center", marginTop: 28, ...TYPE.label }}>
          Atleast80 Rider Partner App
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
