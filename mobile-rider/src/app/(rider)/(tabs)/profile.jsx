import { useCallback, useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Switch, Modal, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useFocusEffect } from "expo-router"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated"
import { LogOut, Phone, Mail, Truck, ShieldCheck, Hash, Calendar, CheckCircle, Wallet, CreditCard, Building2, Edit3, X, User, FileText, ChevronRight } from "lucide-react-native"
import PolicyModal from "../../../components/common/PolicyModal"
import FieldError from "../../../components/ui/FieldError"
import { useAuth } from "../../../context/AuthContext"
import { useToast } from "../../../context/ToastContext"
import { toggleRiderStatus, api } from "../../../lib/api"
import {
  getPayoutFieldErrors,
  getPayoutFieldError,
  hasFieldErrors,
  isEmail,
  isPhone,
  isValidVehicleNumber,
  isValidDrivingLicense,
  normalizeVehicleNumber,
  normalizeDrivingLicense,
} from "../../../lib/validation"

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
  const toast = useToast()
  const { user, rider, logout, refreshRider, updateSessionProfile } = useAuth()
  const [dutyLoading, setDutyLoading] = useState(false)
  const [policyType, setPolicyType] = useState(null)

  const [payoutSettings, setPayoutSettings] = useState(null)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutModalVisible, setPayoutModalVisible] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutFieldErrors, setPayoutFieldErrors] = useState({})
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [profileFieldErrors, setProfileFieldErrors] = useState({})
  const [profileForm, setProfileForm] = useState({
    phone: "",
    email: "",
    vehicleType: "bicycle",
    vehicleNumber: "",
    drivingLicenseNumber: "",
  })

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    )
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    )
    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  const [payoutForm, setPayoutForm] = useState({
    payoutMode: "upi",
    bankAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    confirmBankAccountNumber: "",
    bankIfsc: "",
    upiId: "",
  })

  const fetchPayoutSettings = async () => {
    setPayoutLoading(true)
    try {
      const data = await api("/api/rider/me/payout-settings")
      setPayoutSettings(data)
      setPayoutForm({
        payoutMode: data.payoutMode || "upi",
        bankAccountName: data.bankAccountName || "",
        bankName: data.bankName || "",
        bankAccountNumber: data.bankAccountNumber || "",
        confirmBankAccountNumber: data.bankAccountNumber || "",
        bankIfsc: data.bankIfsc || "",
        upiId: data.upiId || "",
      })
    } catch (_) {
    } finally {
      setPayoutLoading(false)
    }
  }

  const [riderPayoutsList, setRiderPayoutsList] = useState([])
  const [riderPayoutsLoading, setRiderPayoutsLoading] = useState(false)

  const fetchRiderPayoutsHistory = async () => {
    setRiderPayoutsLoading(true)
    try {
      const data = await api("/api/rider/me/payouts")
      setRiderPayoutsList(data.payouts || [])
    } catch (_) {
    } finally {
      setRiderPayoutsLoading(false)
    }
  }

  const [cashRemittancesList, setCashRemittancesList] = useState([])
  const [cashRemittancesLoading, setCashRemittancesLoading] = useState(false)

  const fetchCashRemittancesHistory = async () => {
    setCashRemittancesLoading(true)
    try {
      const data = await api("/api/rider/me/cash-remittances")
      setCashRemittancesList(data.remittances || [])
    } catch (_) {
    } finally {
      setCashRemittancesLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      refreshRider()
      fetchPayoutSettings()
      fetchRiderPayoutsHistory()
      fetchCashRemittancesHistory()
    }, [])
  )

  const openProfileEditor = () => {
    setProfileForm({
      phone: user?.phone || "",
      email: user?.email || "",
      vehicleType: rider?.vehicle_type || "bicycle",
      vehicleNumber: rider?.vehicle_number || "",
      drivingLicenseNumber: rider?.driving_license_number || "",
    })
    setProfileFieldErrors({})
    setProfileModalVisible(true)
  }

  const getProfileFieldErrors = (form) => {
    const errors = {}
    const phone = String(form.phone || "").trim()
    const email = String(form.email || "").trim()

    if (!phone) errors.phone = "Phone number is required"
    else if (!isPhone(phone)) errors.phone = "Enter a valid Indian mobile number"

    if (!email) errors.email = "Email address is required"
    else if (!isEmail(email)) errors.email = "Enter a valid email address"

    if (!form.vehicleType) errors.vehicleType = "Please select a vehicle type"

    if (form.vehicleType && form.vehicleType !== "bicycle") {
      if (!String(form.vehicleNumber || "").trim()) {
        errors.vehicleNumber = "Vehicle number is required"
      } else if (!isValidVehicleNumber(form.vehicleNumber)) {
        errors.vehicleNumber = "Enter a valid vehicle number (last 4 digits only)"
      }

      if (String(form.drivingLicenseNumber || "").trim()) {
        if (!isValidDrivingLicense(form.drivingLicenseNumber)) {
          errors.drivingLicenseNumber = "DL number must be exactly 15 characters"
        }
      }
    }

    return errors
  }

  const updateProfileField = (field, value) => {
    const nextForm = { ...profileForm, [field]: value }
    if (field === "vehicleType" && value === "bicycle") {
      nextForm.vehicleNumber = ""
      nextForm.drivingLicenseNumber = ""
    }
    setProfileForm(nextForm)
    setProfileFieldErrors((prev) => {
      if (!prev[field] && !(field === "vehicleType")) return prev
      const next = { ...prev }
      const fresh = getProfileFieldErrors(nextForm)
      ;["phone", "email", "vehicleType", "vehicleNumber", "drivingLicenseNumber"].forEach((key) => {
        if (prev[key] || key === field) {
          if (fresh[key]) next[key] = fresh[key]
          else delete next[key]
        }
      })
      if (value === "bicycle") {
        delete next.vehicleNumber
        delete next.drivingLicenseNumber
      }
      return next
    })
  }

  const handleSaveProfile = async () => {
    const errors = getProfileFieldErrors(profileForm)
    setProfileFieldErrors(errors)
    if (hasFieldErrors(errors)) return

    setSavingProfile(true)
    try {
      const data = await api("/api/rider/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          vehicleType: profileForm.vehicleType,
          vehicleNumber: normalizeVehicleNumber(profileForm.vehicleNumber),
          drivingLicenseNumber: normalizeDrivingLicense(profileForm.drivingLicenseNumber),
        }),
      })
      await updateSessionProfile({ user: data.user, rider: data.rider })
      await refreshRider()
      Keyboard.dismiss()
      setProfileModalVisible(false)
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error(err.message || "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const updatePayoutField = (field, value, linkedFields = []) => {
    const nextForm = { ...payoutForm, [field]: value }
    setPayoutForm(nextForm)
    setPayoutFieldErrors((prev) => {
      const keys = [field, ...linkedFields]
      if (!keys.some((key) => prev[key])) return prev
      const next = { ...prev }
      keys.forEach((key) => {
        const msg = getPayoutFieldError(key, nextForm)
        if (msg) next[key] = msg
        else delete next[key]
      })
      return next
    })
  }

  const handleSavePayoutSettings = async () => {
    const errors = getPayoutFieldErrors(payoutForm)
    setPayoutFieldErrors(errors)
    if (hasFieldErrors(errors)) return

    setSavingPayout(true)
    try {
      await api("/api/rider/me/payout-settings", {
        method: "PUT",
        body: JSON.stringify({
          payoutMode: payoutForm.payoutMode,
          bankAccountName: payoutForm.bankAccountName,
          bankName: payoutForm.bankName,
          bankAccountNumber: payoutForm.bankAccountNumber,
          bankIfsc: payoutForm.bankIfsc,
          upiId: payoutForm.upiId,
        }),
      })
      await fetchPayoutSettings()
      Keyboard.dismiss()
      setPayoutModalVisible(false)
      setPayoutFieldErrors({})
      toast.success("Payout settings updated successfully")
    } catch (err) {
      toast.error(err.message || "Failed to update payout settings")
    } finally {
      setSavingPayout(false)
    }
  }

  const handleLogout = () => {
    setLogoutModalVisible(true)
  }

  const confirmLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      setLogoutModalVisible(false)
      router.replace("/(rider)/login")
    } catch (err) {
      toast.error(err.message || "Failed to sign out")
    } finally {
      setLoggingOut(false)
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
      {/* Header */}
      <LinearGradient
        colors={["#0B6B3A", "#0A5F3B", "#08543F", "#054036"]}
        locations={[0, 0.4, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" }}
      >
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
        {/* Stats Row */}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 4 }}>
            <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }}>Account Details</Text>
            <TouchableOpacity
              onPress={openProfileEditor}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#EAF7EE",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
              }}
            >
              <Edit3 size={13} color="#0B6B3A" />
              <Text style={{ fontSize: 11, color: "#0B6B3A", ...TYPE.heading }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 18, marginTop: 12 }}>
            <DetailRow icon={Phone} label="Phone Number" value={user?.phone || "—"} />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow icon={Mail} label="Email Address" value={user?.email || "—"} />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow
              icon={Truck}
              label="Vehicle Type"
              value={rider?.vehicle_type ? String(rider.vehicle_type).replace(/_/g, " ") : "—"}
              valueStyle={{ textTransform: "capitalize" }}
            />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow
              icon={Hash}
              label="Vehicle Number"
              value={
                rider?.vehicle_type === "bicycle"
                  ? "Not required"
                  : (rider?.vehicle_number || "—")
              }
            />
            {rider?.vehicle_type && rider.vehicle_type !== "bicycle" ? (
              <>
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <DetailRow
                  icon={FileText}
                  label="Driving License"
                  value={rider?.driving_license_number || "—"}
                />
              </>
            ) : null}
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            <DetailRow icon={Calendar} label="Partner Since" value={formatPartnerSince(rider?.created_at)} />
          </View>
        </View>

        {/* Bank & Payout Settings Card */}
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
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, paddingBottom: 4, gap: 10 }}>
            <View style={{ flex: 1, paddingRight: 4 }}>
              <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }}>Payout & Earnings</Text>
              <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 2, ...TYPE.label }}>
                Account used by Admin for delivery fee payouts
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPayoutFieldErrors({})
                setPayoutModalVisible(true)
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#EAF7EE",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                marginTop: 1,
              }}
            >
              <Edit3 size={13} color="#0B6B3A" />
              <Text style={{ fontSize: 11, color: "#0B6B3A", ...TYPE.heading }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 14, marginTop: 12 }}>
            <DetailRow
              icon={payoutSettings?.payoutMode === "bank" ? Building2 : Wallet}
              label="Payout Method"
              value={payoutSettings?.payoutMode === "bank" ? "Direct Bank Account" : "Instant UPI VPA"}
            />
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            {payoutSettings?.payoutMode === "bank" ? (
              <>
                <DetailRow icon={User} label="Account Holder" value={payoutSettings?.bankAccountName || "—"} />
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <DetailRow icon={Building2} label="Bank Name" value={payoutSettings?.bankName || "—"} />
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <DetailRow icon={CreditCard} label="Account Number" value={payoutSettings?.bankAccountNumber || "—"} />
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <DetailRow icon={Hash} label="IFSC Code" value={payoutSettings?.bankIfsc || "—"} valueStyle={{ textTransform: "uppercase", ...TYPE.mono }} />
              </>
            ) : (
              <DetailRow icon={Wallet} label="Primary UPI ID / VPA" value={payoutSettings?.upiId || "—"} />
            )}
          </View>
        </View>

        {/* Rider Payout & Settlement History Card */}
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
            padding: 20,
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }}>Payout & Settlement History</Text>
            <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 2, ...TYPE.label }}>
              Delivery fee transfers & settlements credited by Admin
            </Text>
          </View>

          {riderPayoutsLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0B6B3A" />
            </View>
          ) : riderPayoutsList.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: COLORS.label, textAlign: "center", ...TYPE.label }}>
                No payout settlements recorded yet.
              </Text>
              <Text style={{ fontSize: 10.5, color: "#9CA3AF", textAlign: "center", marginTop: 4, ...TYPE.label }}>
                Admin payouts will appear here with Date, Amount, and UTR Reference number once transferred.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {riderPayoutsList.map((p) => {
                const gross = Number(p.grossAmount) || Number(p.netPayout)
                const deductions = Number(p.commissionDeduction) || 0
                return (
                  <View
                    key={p.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      gap: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    {/* Header: Net Paid Amount & Status */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F4F6",
                        paddingBottom: 8,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Nunito",
                            color: "#6B7280",
                            textTransform: "uppercase",
                            fontWeight: "600",
                          }}
                        >
                          Net Bank Settlement
                        </Text>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            fontFamily: "Poppins",
                            color: "#0B6B3A",
                          }}
                        >
                          ₹{p.netPayout}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "#D1FAE5",
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#A7F3D0",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            fontFamily: "Poppins",
                            color: "#065F46",
                          }}
                        >
                          PAID ✅
                        </Text>
                      </View>
                    </View>

                    {/* Transparent Breakdown */}
                    <View
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 10,
                        padding: 10,
                        gap: 5,
                        borderWidth: 1,
                        borderColor: "#F3F4F6",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>
                          Delivery Fees Earned:
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#111827" }}>
                          ₹{gross}
                        </Text>
                      </View>
                      {deductions > 0 ? (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>
                            Cash / Deductions Adjusted:
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#DC2626" }}>
                            -₹{deductions}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>
                            Platform Commission:
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#059669" }}>
                            ₹0 (Free)
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bank & UTR Reference */}
                    <View style={{ gap: 2 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#6B7280" }}>
                          UTR Reference:
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
                            color: "#1F2937",
                          }}
                        >
                          {p.utrNumber || "N/A"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#6B7280" }}>
                          Paid Date:
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#4B5563" }}>
                          {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "N/A"}
                        </Text>
                      </View>
                    </View>

                    {/* Admin Note / Remarks */}
                    {p.notes ? (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          borderColor: "#FDE68A",
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontFamily: "Poppins",
                            fontWeight: "bold",
                            color: "#92400E",
                            textTransform: "uppercase",
                          }}
                        >
                          💬 ADMIN NOTE:
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#78350F", marginTop: 2 }}>
                          {p.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* COD Cash Deposit History Card */}
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
            padding: 20,
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }}>COD Cash Deposit History</Text>
            <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 2, ...TYPE.label }}>
              History of cash deposited to Admin with UTR proof & verification status
            </Text>
          </View>

          {cashRemittancesLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0B6B3A" />
            </View>
          ) : cashRemittancesList.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: COLORS.label, textAlign: "center", ...TYPE.label }}>
                No cash deposit records found yet.
              </Text>
              <Text style={{ fontSize: 10.5, color: "#9CA3AF", textAlign: "center", marginTop: 4, ...TYPE.label }}>
                Deposits submitted via UTR or cleared by Admin will appear here with Date and Status.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {cashRemittancesList.map((rem) => {
                const isApproved = rem.status === "approved"
                const isPending = rem.status === "pending"
                const badgeBg = isApproved ? "#D1FAE5" : isPending ? "#FEF3C7" : "#FEE2E2"
                const badgeColor = isApproved ? "#065F46" : isPending ? "#92400E" : "#991B1B"
                const badgeText = isApproved ? "APPROVED & SETTLED ✅" : isPending ? "PENDING VERIFICATION ⏳" : "REJECTED ❌"

                return (
                  <View key={rem.id} style={{ backgroundColor: "#F9FAFB", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F2937" }}>
                        ₹{rem.amount}
                      </Text>
                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, fontWeight: "bold", fontFamily: "Poppins", color: badgeColor }}>
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                    {rem.utr_number ? (
                      <Text style={{ fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), color: "#374151" }}>
                        UTR Ref: {rem.utr_number}
                      </Text>
                    ) : null}
                    {rem.notes ? (
                      <Text style={{ fontSize: 10.5, fontFamily: "Nunito", color: "#4B5563", marginTop: 2 }}>
                        Note: {rem.notes}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#9CA3AF", marginTop: 3 }}>
                      Date: {rem.created_at ? new Date(rem.created_at).toLocaleString("en-IN") : "N/A"}
                    </Text>
                    {rem.rejection_reason ? (
                      <Text style={{ fontSize: 10.5, fontFamily: "Nunito", color: "#EF4444", marginTop: 4 }}>
                        Reason: {rem.rejection_reason}
                      </Text>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )}
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

        {/* Legal & Policies Card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: RADIUS,
            padding: 20,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 15, color: COLORS.value, marginBottom: 14, ...TYPE.heading }}>Legal & Policies</Text>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setPolicyType("privacy")}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: RADIUS_SM,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.iconBg, alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={17} color={COLORS.iconFg} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: COLORS.value, ...TYPE.heading }}>Privacy Policy</Text>
                  <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 1, ...TYPE.label }}>Rider data protection terms</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#7A7A7A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPolicyType("terms")}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: RADIUS_SM,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.iconBg, alignItems: "center", justifyContent: "center" }}>
                  <FileText size={17} color={COLORS.iconFg} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: COLORS.value, ...TYPE.heading }}>Terms of Service</Text>
                  <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 1, ...TYPE.label }}>Rider partner agreement</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#7A7A7A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "#EAF7EE",
            paddingVertical: 15,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: "#C6EBD4",
            shadowColor: "#0B6B3A",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <LogOut size={16} color="#0B6B3A" />
          <Text style={{ color: "#0B6B3A", fontSize: 14, ...TYPE.heading }}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10.5, color: "#B5B5B0", textAlign: "center", marginTop: 28, ...TYPE.label }}>
          Atleast80 Rider Partner App
        </Text>
      </ScrollView>

      {/* Sign Out Confirm Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setLogoutModalVisible(false)
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 15, 0.48)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 340,
              backgroundColor: "#FFFFFF",
              borderRadius: 22,
              paddingHorizontal: 22,
              paddingTop: 24,
              paddingBottom: 18,
              borderWidth: 1,
              borderColor: "#F1F1EF",
              shadowColor: "#0B6B3A",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 22,
              elevation: 6,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "#EAF7EE",
                borderWidth: 1,
                borderColor: "#C6EBD4",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <LogOut size={22} color="#0B6B3A" />
            </View>
            <Text style={{ fontSize: 17, color: COLORS.value, ...TYPE.heading }}>Sign out?</Text>
            <Text style={{ fontSize: 13, color: COLORS.label, marginTop: 6, lineHeight: 19, ...TYPE.label }}>
              Are you sure you want to sign out of your rider partner account?
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  opacity: loggingOut ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 13, color: "#7A7A7A", ...TYPE.heading }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmLogout}
                disabled={loggingOut}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: "#0B6B3A",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: loggingOut ? 0.85 : 1,
                }}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, color: "#FFFFFF", ...TYPE.heading }}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss()
          setProfileModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          enabled={isKeyboardVisible}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
              onPress={() => {
                Keyboard.dismiss()
                setProfileModalVisible(false)
              }}
            />
            <View
              style={{
                backgroundColor: "#FFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: Platform.OS === "ios" ? 34 : 20,
                maxHeight: isKeyboardVisible ? "75%" : "88%",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.divider,
                  paddingBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: COLORS.value, ...TYPE.heading }}>Update Account Details</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss()
                    setProfileModalVisible(false)
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#7A7A7A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 16, gap: 14 }}
              >
                <View>
                  <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Phone Number *</Text>
                  <TextInput
                    value={profileForm.phone}
                    onChangeText={(val) => updateProfileField("phone", val.replace(/[^0-9]/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={{
                      borderWidth: 1,
                      borderColor: profileFieldErrors.phone ? "#F44336" : COLORS.divider,
                      backgroundColor: profileFieldErrors.phone ? "#FEF2F2" : "#FFFFFF",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: COLORS.value,
                    }}
                  />
                  <FieldError message={profileFieldErrors.phone} />
                </View>

                <View>
                  <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Email Address *</Text>
                  <TextInput
                    value={profileForm.email}
                    onChangeText={(val) => updateProfileField("email", val.trimStart())}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{
                      borderWidth: 1,
                      borderColor: profileFieldErrors.email ? "#F44336" : COLORS.divider,
                      backgroundColor: profileFieldErrors.email ? "#FEF2F2" : "#FFFFFF",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: COLORS.value,
                    }}
                  />
                  <FieldError message={profileFieldErrors.email} />
                </View>

                <View>
                  <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 8, ...TYPE.heading }}>Vehicle Type *</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { id: "bicycle", label: "Bicycle" },
                      { id: "motorcycle", label: "Motorcycle" },
                      { id: "scooter", label: "Scooter" },
                    ].map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => updateProfileField("vehicleType", v.id)}
                        style={{
                          flex: 1,
                          minHeight: 42,
                          paddingVertical: 10,
                          paddingHorizontal: 6,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: profileForm.vehicleType === v.id ? "#0B6B3A" : "#FFFFFF",
                          borderColor: profileForm.vehicleType === v.id
                            ? "#0B6B3A"
                            : profileFieldErrors.vehicleType
                              ? "#F44336"
                              : "#E5E5E5",
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: profileForm.vehicleType === v.id ? "#FFFFFF" : "#2E2E2E",
                            fontFamily: "Poppins",
                            fontWeight: "700",
                            fontSize: 11,
                          }}
                        >
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <FieldError message={profileFieldErrors.vehicleType} />
                </View>

                {profileForm.vehicleType === "bicycle" ? (
                  <View
                    style={{
                      backgroundColor: "#F0FBF4",
                      borderWidth: 1,
                      borderColor: "#C6EBD4",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#0B6B3A", lineHeight: 18 }}>
                      Bicycle selected — vehicle number and driving license are not required.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View>
                      <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Vehicle Number *</Text>
                      <TextInput
                        value={profileForm.vehicleNumber}
                        onChangeText={(val) => updateProfileField("vehicleNumber", normalizeVehicleNumber(val))}
                        placeholder="e.g. UP32 AB 1234"
                        autoCapitalize="characters"
                        maxLength={13}
                        style={{
                          borderWidth: 1,
                          borderColor: profileFieldErrors.vehicleNumber ? "#F44336" : COLORS.divider,
                          backgroundColor: profileFieldErrors.vehicleNumber ? "#FEF2F2" : "#FFFFFF",
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          fontSize: 14,
                          fontFamily: "Nunito",
                          color: COLORS.value,
                        }}
                      />
                      <FieldError message={profileFieldErrors.vehicleNumber} />
                      {!profileFieldErrors.vehicleNumber ? (
                        <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 4, ...TYPE.label }}>
                          Last part must be 4 digits only — e.g. UP32 AB 1234
                        </Text>
                      ) : null}
                    </View>

                    <View>
                      <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Driving License</Text>
                      <TextInput
                        value={profileForm.drivingLicenseNumber}
                        onChangeText={(val) => updateProfileField("drivingLicenseNumber", normalizeDrivingLicense(val))}
                        placeholder="15-character DL number"
                        autoCapitalize="characters"
                        maxLength={15}
                        style={{
                          borderWidth: 1,
                          borderColor: profileFieldErrors.drivingLicenseNumber ? "#F44336" : COLORS.divider,
                          backgroundColor: profileFieldErrors.drivingLicenseNumber ? "#FEF2F2" : "#FFFFFF",
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          fontSize: 14,
                          fontFamily: "Nunito",
                          color: COLORS.value,
                        }}
                      />
                      <FieldError message={profileFieldErrors.drivingLicenseNumber} />
                      {!profileFieldErrors.drivingLicenseNumber ? (
                        <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 4, ...TYPE.label }}>
                          Optional — must be exactly 15 characters if entered
                        </Text>
                      ) : null}
                    </View>
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={{
                  marginTop: 8,
                  backgroundColor: "#0B6B3A",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: savingProfile ? 0.7 : 1,
                }}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 14, ...TYPE.heading }}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Payout Modal */}
      <Modal
        visible={payoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss()
          setPayoutModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          enabled={isKeyboardVisible}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
              onPress={() => {
                Keyboard.dismiss()
                setPayoutModalVisible(false)
              }}
            />
            <View
              style={{
                backgroundColor: "#FFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: Platform.OS === "ios" ? 34 : 20,
                maxHeight: isKeyboardVisible ? "75%" : "85%",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.divider,
                  paddingBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: COLORS.value, ...TYPE.heading }}>Update Payout Settings</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss()
                    setPayoutModalVisible(false)
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#7A7A7A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
              {/* Mode Selector */}
              <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setPayoutForm({ ...payoutForm, payoutMode: "upi" })
                    setPayoutFieldErrors({})
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    gap: 6,
                    backgroundColor: payoutForm.payoutMode === "upi" ? "#FFF" : "transparent",
                    shadowColor: payoutForm.payoutMode === "upi" ? "#000" : "transparent",
                    shadowOpacity: payoutForm.payoutMode === "upi" ? 0.08 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: payoutForm.payoutMode === "upi" ? 2 : 0,
                  }}
                >
                  <Wallet size={15} color={payoutForm.payoutMode === "upi" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text numberOfLines={1} style={{ fontSize: 12, color: payoutForm.payoutMode === "upi" ? "#0B6B3A" : "#7A7A7A", ...TYPE.heading }}>UPI VPA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setPayoutForm({ ...payoutForm, payoutMode: "bank" })
                    setPayoutFieldErrors({})
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    gap: 6,
                    backgroundColor: payoutForm.payoutMode === "bank" ? "#FFF" : "transparent",
                    shadowColor: payoutForm.payoutMode === "bank" ? "#000" : "transparent",
                    shadowOpacity: payoutForm.payoutMode === "bank" ? 0.08 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: payoutForm.payoutMode === "bank" ? 2 : 0,
                  }}
                >
                  <Building2 size={15} color={payoutForm.payoutMode === "bank" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text numberOfLines={1} style={{ fontSize: 12, color: payoutForm.payoutMode === "bank" ? "#0B6B3A" : "#7A7A7A", ...TYPE.heading }}>Bank Account</Text>
                </TouchableOpacity>
              </View>

              {payoutForm.payoutMode === "upi" ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: COLORS.value, ...TYPE.heading }}>Primary UPI ID / VPA *</Text>
                  <TextInput
                    value={payoutForm.upiId}
                    onChangeText={(val) => updatePayoutField("upiId", val)}
                    placeholder="e.g. 7378647099@ybl or nitesh@okaxis"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: payoutFieldErrors.upiId ? "#F44336" : COLORS.divider,
                      backgroundColor: payoutFieldErrors.upiId ? "#FEF2F2" : "#FFFFFF",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: COLORS.value,
                    }}
                  />
                  <FieldError message={payoutFieldErrors.upiId} />
                  {!payoutFieldErrors.upiId ? (
                    <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 4, ...TYPE.label }}>
                      Delivery earnings will be sent to this UPI ID via GPay / PhonePe / Paytm.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Account Holder Name *</Text>
                    <TextInput
                      value={payoutForm.bankAccountName}
                      onChangeText={(val) => updatePayoutField("bankAccountName", val)}
                      placeholder="Full Name as per Bank Passbook"
                      style={{
                        borderWidth: 1,
                        borderColor: payoutFieldErrors.bankAccountName ? "#F44336" : COLORS.divider,
                        backgroundColor: payoutFieldErrors.bankAccountName ? "#FEF2F2" : "#FFFFFF",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                    <FieldError message={payoutFieldErrors.bankAccountName} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Bank Name *</Text>
                    <TextInput
                      value={payoutForm.bankName}
                      onChangeText={(val) => updatePayoutField("bankName", val)}
                      placeholder="e.g. HDFC Bank / State Bank of India"
                      style={{
                        borderWidth: 1,
                        borderColor: payoutFieldErrors.bankName ? "#F44336" : COLORS.divider,
                        backgroundColor: payoutFieldErrors.bankName ? "#FEF2F2" : "#FFFFFF",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                    <FieldError message={payoutFieldErrors.bankName} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Account Number *</Text>
                    <TextInput
                      value={payoutForm.bankAccountNumber}
                      onChangeText={(val) => updatePayoutField("bankAccountNumber", val.replace(/[^\d]/g, "").slice(0, 18), ["confirmBankAccountNumber"])}
                      placeholder="Enter Bank Account Number"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: payoutFieldErrors.bankAccountNumber ? "#F44336" : COLORS.divider,
                        backgroundColor: payoutFieldErrors.bankAccountNumber ? "#FEF2F2" : "#FFFFFF",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                    <FieldError message={payoutFieldErrors.bankAccountNumber} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Confirm Account Number *</Text>
                    <TextInput
                      value={payoutForm.confirmBankAccountNumber}
                      onChangeText={(val) => updatePayoutField("confirmBankAccountNumber", val.replace(/[^\d]/g, "").slice(0, 18), ["bankAccountNumber"])}
                      placeholder="Re-enter Bank Account Number"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: payoutFieldErrors.confirmBankAccountNumber ? "#F44336" : COLORS.divider,
                        backgroundColor: payoutFieldErrors.confirmBankAccountNumber ? "#FEF2F2" : "#FFFFFF",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                    <FieldError message={payoutFieldErrors.confirmBankAccountNumber} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>IFSC Code *</Text>
                    <TextInput
                      value={payoutForm.bankIfsc}
                      onChangeText={(val) => updatePayoutField("bankIfsc", val.toUpperCase())}
                      placeholder="11-character IFSC (e.g. HDFC0001234)"
                      autoCapitalize="characters"
                      maxLength={11}
                      style={{
                        borderWidth: 1,
                        borderColor: payoutFieldErrors.bankIfsc ? "#F44336" : COLORS.divider,
                        backgroundColor: payoutFieldErrors.bankIfsc ? "#FEF2F2" : "#FFFFFF",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                    <FieldError message={payoutFieldErrors.bankIfsc} />
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSavePayoutSettings}
                disabled={savingPayout}
                style={{
                  backgroundColor: "#0B6B3A",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 20,
                  opacity: savingPayout ? 0.7 : 1,
                }}
              >
                {savingPayout ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontSize: 14, ...TYPE.heading }}>Save Payout Settings</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

      <PolicyModal
        visible={Boolean(policyType)}
        onClose={() => setPolicyType(null)}
        type={policyType || "privacy"}
      />
    </SafeAreaView>
  )
}
