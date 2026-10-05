import { useCallback, useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Switch, Modal, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useFocusEffect } from "expo-router"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated"
import { LogOut, Phone, Mail, Truck, ShieldCheck, Hash, Calendar, CheckCircle, Wallet, CreditCard, Building2, Edit3, X, User, FileText, ChevronRight } from "lucide-react-native"
import PolicyModal from "../../../components/common/PolicyModal"
import { useAuth } from "../../../context/AuthContext"
import { toggleRiderStatus, api } from "../../../lib/api"

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
  const [policyType, setPolicyType] = useState(null)

  const [payoutSettings, setPayoutSettings] = useState(null)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutModalVisible, setPayoutModalVisible] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutError, setPayoutError] = useState("")

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

  const handleSavePayoutSettings = async () => {
    setPayoutError("")
    if (payoutForm.payoutMode === "bank") {
      if (!payoutForm.bankAccountName.trim() || !payoutForm.bankName.trim() || !payoutForm.bankAccountNumber.trim()) {
        setPayoutError("Account Holder Name, Bank Name, and Account Number are required")
        return
      }
      if (payoutForm.bankAccountNumber.trim() !== payoutForm.confirmBankAccountNumber.trim()) {
        setPayoutError("Account Number and Confirm Account Number do not match")
        return
      }
      if (!payoutForm.bankIfsc.trim() || payoutForm.bankIfsc.trim().length !== 11) {
        setPayoutError("Valid 11-character IFSC Code is required")
        return
      }
    } else {
      if (!payoutForm.upiId.trim() || !payoutForm.upiId.includes("@")) {
        setPayoutError("Valid UPI ID / VPA is required (e.g. name@upi)")
        return
      }
    }

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
      setPayoutModalVisible(false)
      Alert.alert("Success", "Payout settings updated successfully")
    } catch (err) {
      setPayoutError(err.message || "Failed to update payout settings")
    } finally {
      setSavingPayout(false)
    }
  }

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to log out?")
      if (confirmLogout) {
        await logout()
        router.replace("/(rider)/login")
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout()
            router.replace("/(rider)/login")
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyBetween: "space-between", padding: 20, paddingBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: COLORS.value, ...TYPE.heading }}>Payout & Earnings Account</Text>
              <Text style={{ fontSize: 11, color: COLORS.label, marginTop: 2, ...TYPE.label }}>
                Account used by Admin for delivery fee payouts
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPayoutError("")
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
              {riderPayoutsList.map((p) => (
                <View key={p.id} style={{ backgroundColor: "#F9FAFB", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A" }}>
                      ₹{p.netPayout}
                    </Text>
                    <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: "bold", fontFamily: "Poppins", color: "#065F46" }}>
                        PAID ✅
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), color: "#1F2937" }}>
                    UTR Ref: {p.utrNumber || "N/A"}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#9CA3AF", marginTop: 2 }}>
                    Paid Date: {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "N/A"}
                  </Text>
                </View>
              ))}
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

      {/* Edit Payout Modal */}
      <Modal visible={payoutModalVisible} transparent animationType="slide" onRequestClose={() => setPayoutModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider, pb: 12 }}>
              <Text style={{ fontSize: 16, color: COLORS.value, ...TYPE.heading }}>Update Payout Settings</Text>
              <TouchableOpacity onPress={() => setPayoutModalVisible(false)}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            {payoutError ? (
              <View style={{ backgroundColor: "#FDF2F2", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F8D7D7" }}>
                <Text style={{ color: "#EF4444", fontSize: 12, ...TYPE.label }}>{payoutError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Mode Selector */}
              <View style={{ flexDirection: "row", backgroundColor: "#F3F3F0", padding: 4, borderRadius: 14, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setPayoutForm({ ...payoutForm, payoutMode: "upi" })}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 10,
                    gap: 6,
                    backgroundColor: payoutForm.payoutMode === "upi" ? "#FFF" : "transparent",
                  }}
                >
                  <Wallet size={15} color={payoutForm.payoutMode === "upi" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text style={{ fontSize: 12, color: payoutForm.payoutMode === "upi" ? "#0B6B3A" : "#7A7A7A", ...TYPE.heading }}>Instant UPI VPA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPayoutForm({ ...payoutForm, payoutMode: "bank" })}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 10,
                    gap: 6,
                    backgroundColor: payoutForm.payoutMode === "bank" ? "#FFF" : "transparent",
                  }}
                >
                  <Building2 size={15} color={payoutForm.payoutMode === "bank" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text style={{ fontSize: 12, color: payoutForm.payoutMode === "bank" ? "#0B6B3A" : "#7A7A7A", ...TYPE.heading }}>Bank Account</Text>
                </TouchableOpacity>
              </View>

              {payoutForm.payoutMode === "upi" ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 12, color: COLORS.value, ...TYPE.heading }}>Primary UPI ID / VPA *</Text>
                  <TextInput
                    value={payoutForm.upiId}
                    onChangeText={(val) => setPayoutForm({ ...payoutForm, upiId: val })}
                    placeholder="e.g. 7378647099@ybl or nitesh@okaxis"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.divider,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: COLORS.value,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.label, ...TYPE.label }}>
                    Delivery earnings will be sent to this UPI ID via GPay / PhonePe / Paytm.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Account Holder Name *</Text>
                    <TextInput
                      value={payoutForm.bankAccountName}
                      onChangeText={(val) => setPayoutForm({ ...payoutForm, bankAccountName: val })}
                      placeholder="Full Name as per Bank Passbook"
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.divider,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Bank Name *</Text>
                    <TextInput
                      value={payoutForm.bankName}
                      onChangeText={(val) => setPayoutForm({ ...payoutForm, bankName: val })}
                      placeholder="e.g. HDFC Bank / State Bank of India"
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.divider,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Account Number *</Text>
                    <TextInput
                      value={payoutForm.bankAccountNumber}
                      onChangeText={(val) => setPayoutForm({ ...payoutForm, bankAccountNumber: val })}
                      placeholder="Enter Bank Account Number"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.divider,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>Confirm Account Number *</Text>
                    <TextInput
                      value={payoutForm.confirmBankAccountNumber}
                      onChangeText={(val) => setPayoutForm({ ...payoutForm, confirmBankAccountNumber: val })}
                      placeholder="Re-enter Bank Account Number"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.divider,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.value, marginBottom: 4, ...TYPE.heading }}>IFSC Code *</Text>
                    <TextInput
                      value={payoutForm.bankIfsc}
                      onChangeText={(val) => setPayoutForm({ ...payoutForm, bankIfsc: val.toUpperCase() })}
                      placeholder="11-character IFSC (e.g. HDFC0001234)"
                      autoCapitalize="characters"
                      maxLength={11}
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.divider,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: COLORS.value,
                      }}
                    />
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
      </Modal>

      <PolicyModal
        visible={Boolean(policyType)}
        onClose={() => setPolicyType(null)}
        type={policyType || "privacy"}
      />
    </SafeAreaView>
  )
}
