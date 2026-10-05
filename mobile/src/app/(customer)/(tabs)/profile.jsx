import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Linking } from "react-native"
import * as Location from "expo-location"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Mail, Phone, MapPin, Pencil, LogOut, ChevronRight, X, ShoppingBag, Clock, User, Award, Check, Sparkles, Truck, ChefHat, Navigation, ShieldCheck, FileText, Trash2 } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../../components/ui/Button"
import Input from "../../../components/ui/Input"
import LocationMapModal from "../../../components/common/LocationMapModal"
import PolicyModal from "../../../components/common/PolicyModal"
import { useAuth } from "../../../context/AuthContext"
import { api, getContactSettings } from "../../../lib/api"
import { resolveMediaUrl } from "../../../lib/media"
import FloatingCart from "../../../components/common/FloatingCart"
import { getLocationPreference, setLocationPreference } from "../../../lib/locationPreference"

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}


const TRACKING_STEPS = [
  { label: "Placed", status: "pending", icon: Check },
  { label: "Confirmed", status: "confirmed", icon: ChefHat },
  { label: "Preparing", status: "preparing", icon: Truck },
  { label: "On Way", status: "out_for_delivery", icon: MapPin },
  { label: "Delivered", status: "delivered", icon: Check }
]

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(value) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function InfoTile({ icon: Icon, label, value, muted }) {
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#F0F0F0",
      marginBottom: 12,
      ...Platform.select({
        default: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
          elevation: 1,
        }
      })
    }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color="#0B6B3A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: "bold", fontFamily: "Poppins", color: "#7A7A7A", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Nunito", fontWeight: "600", color: muted ? "#7A7A7A" : "#1F1F1F", marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function OrderCard({ order, highlight, onTrack }) {
  return (
    <TouchableOpacity
      onPress={() => onTrack(order.id)}
      activeOpacity={0.8}
      style={{
        width: "100%",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: highlight ? "#D6EAE7" : "#F0F0F0",
        backgroundColor: highlight ? "#FBFDFB" : "#FFFFFF",
        ...Platform.select({
          default: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: highlight ? 0.05 : 0.02,
            shadowRadius: 8,
            elevation: highlight ? 2 : 1,
          }
        })
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={18} color="#0B6B3A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }} numberOfLines={1}>
              {order.kitchenName}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 1 }}>#{order.orderNumber}</Text>
          </View>
        </View>
        <View style={{ 
          backgroundColor: order.status === "pending" ? "#FAF4EB" : "#EAF7EE", 
          paddingHorizontal: 8, 
          paddingVertical: 3, 
          borderRadius: 6,
          borderWidth: 1,
          borderColor: order.status === "pending" ? "#FDECB2" : "#D6EAE7"
        }}>
          <Text style={{ fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", color: order.status === "pending" ? "#D35400" : "#0B6B3A" }}>
            {STATUS_LABELS[order.status] || order.status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F5F5F3" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A" }}>{order.items?.length || 0} items</Text>
          <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A" }}>·</Text>
          <Text style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>₹{order.grandTotal}</Text>
          {order.createdAt && (
            <>
              <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A" }}>·</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Clock size={11} color="#7A7A7A" />
                <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#7A7A7A" }}>{formatDate(order.createdAt)}</Text>
              </View>
            </>
          )}
        </View>
        <ChevronRight size={14} color="#7A7A7A" />
      </View>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isCustomer, loading: authLoading, logout, updateProfile } = useAuth()
  const [orders, setOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false)
  const [policyType, setPolicyType] = useState(null)
  const [isMapModalVisible, setIsMapModalVisible] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", pincode: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [deletionEmail, setDeletionEmail] = useState("liveatleast80@gmail.com")

  useEffect(() => {
    getContactSettings()
      .then((data) => {
        if (data?.accountDeletionEmail) setDeletionEmail(data.accountDeletionEmail)
      })
      .catch(() => {})
  }, [])

  const handleConfirmMapLocation = (data) => {
    if (data) {
      setForm(prev => ({
        ...prev,
        address: data.address || prev.address,
        city: data.city || prev.city,
        pincode: data.pincode || prev.pincode
      }))
    }
    setIsMapModalVisible(false)
  }

  const handleAutoDetectLocation = async () => {
    setDetectingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to auto-detect your address.")
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
        const road = data.suburb || addr.road || addr.suburb || addr.neighbourhood || ""
        const houseNumber = addr.house_number || ""
        const city = data.city || data.suburb || data.district || addr.city || addr.town || addr.village || addr.county || ""
        const postcode = data.postcode || addr.postcode || ""

        let streetAddress = data.formattedAddress || data.displayName || [houseNumber, road].filter(Boolean).join(", ")
        if (!streetAddress && data.display_name) {
          streetAddress = data.display_name.split(",").slice(0, 2).map(s => s.trim()).join(", ")
        }

        setForm(prev => ({
          ...prev,
          address: streetAddress || prev.address,
          city: city || prev.city,
          pincode: postcode || prev.pincode
        }))
      } else {
        Alert.alert("Location Error", "Could not resolve address details. Please fill manually.")
      }
    } catch (err) {
      Alert.alert("Location Error", "Failed to auto-detect location: " + err.message)
    } finally {
      setDetectingLocation(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!isCustomer) return
      setLoadingOrders(true)
      try {
        const [ordersRes, currentRes] = await Promise.all([
          api("/api/orders"),
          api("/api/orders/current"),
        ])
        setOrders(ordersRes.orders || [])
        setCurrentOrder(currentRes.order || null)
      } catch (err) {
        console.log("Failed to load profile details", err)
      } finally {
        setLoadingOrders(false)
      }
    }

    loadData()
  }, [isCustomer])

  const openEdit = () => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      city: user?.city || "",
      pincode: user?.pincode || "",
    })
    setError("")
    setShowEdit(true)
  }

  const [prefLocation, setPrefLocation] = useState({ address: "", city: "", state: "", pincode: "" })

  useFocusEffect(
    useCallback(() => {
      getLocationPreference().then((loc) => {
        if (loc) setPrefLocation(loc)
      })
    }, [user])
  )

  const handleUpdate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.pincode.trim()) {
      setError("Please fill in all fields")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address")
      return
    }
    if (form.phone.trim().length !== 10) {
      setError("Phone number must be 10 digits")
      return
    }
    if (form.pincode.trim().length !== 6) {
      setError("Pincode must be 6 digits")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await updateProfile(form)
      const nextLoc = await setLocationPreference({ state: form.state, city: form.city, address: form.address, pincode: form.pincode })
      setPrefLocation(nextLoc)
      setShowEdit(false)
    } catch (err) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF9F6] items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#0B6B3A" />
      </SafeAreaView>
    )
  }

  if (!isCustomer) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF9F6] items-center justify-center p-6" edges={["top"]}>
        <View className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <User size={32} color="#0B6B3A" />
        </View>
        <Text className="font-poppins font-semibold text-dark text-base text-center">
          Sign in to view profile
        </Text>
        <Text className="font-nunito text-gray text-xs text-center mt-2 max-w-xs leading-5">
          Please log in to manage your account details, delivery addresses, and track order histories.
        </Text>
        <Button onPress={() => router.push("/(auth)/login")} className="mt-6 px-6">
          Sign In
        </Button>
      </SafeAreaView>
    )
  }

  let fullAddress = null
  if (prefLocation?.address && prefLocation.address.trim() && !prefLocation.isCleared) {
    fullAddress = prefLocation.address.trim()
  } else if (prefLocation?.city && !prefLocation.isCleared) {
    const validSuburb = prefLocation.suburb && prefLocation.city && prefLocation.suburb.toLowerCase() !== prefLocation.city.toLowerCase() ? prefLocation.suburb : ""
    const parts = [validSuburb, prefLocation.city, prefLocation.state].filter(Boolean)
    fullAddress = parts.join(", ") + (prefLocation.pincode ? ` - ${prefLocation.pincode}` : "")
  } else if (user?.address && user.address.trim()) {
    let addr = user.address.trim()
    if (user.city && !addr.toLowerCase().includes(user.city.toLowerCase())) {
      addr += `, ${user.city}`
    }
    if (user.pincode && !addr.includes(user.pincode)) {
      addr += ` - ${user.pincode}`
    }
    fullAddress = addr
  }
  
  const hasAddress = Boolean(fullAddress)
  
  const activeStepIdx = currentOrder 
    ? TRACKING_STEPS.findIndex(s => s.status === currentOrder.status)
    : -1

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF9F6" }} edges={["top"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Header Hero Area */}
        <LinearGradient
          colors={["#0C4240", "#135E39"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 32,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            position: "relative",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Custom graphic circle */}
          <View style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: "rgba(255, 255, 255, 0.03)",
          }} />

          {/* Top Bar with title and logout button */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <TouchableOpacity
              onPress={openEdit}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Pencil size={13} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Poppins", fontWeight: "bold" }}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => logout().then(() => router.replace("/(customer)/home"))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6
              }}
            >
              <LogOut size={13} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Poppins", fontWeight: "bold" }}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile Summary Box (Glassmorphic styling) */}
          <View style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginBottom: 20
          }}>
            <View style={{ position: "relative" }}>
              <LinearGradient
                colors={["#E2E8F0", "#94A3B8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Text style={{ color: "#1E293B", fontSize: 24, fontFamily: "Poppins", fontWeight: "bold" }}>
                  {initials(user.name)}
                </Text>
              </LinearGradient>
              <View style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F4C400", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0B4C35" }}>
                <Award size={11} color="#0C4240" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={{ fontSize: 22, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>{user.name}</Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{user.email}</Text>
              
              <TouchableOpacity 
                onPress={openEdit}
                style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: 6, 
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  alignSelf: "flex-start",
                  marginTop: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1
                }}
              >
                <Pencil size={11} color="#1E293B" />
                <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#1E293B" }}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mini Stats inside Header */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ fontSize: 24, fontFamily: "Poppins", fontWeight: "extrabold", color: "#FFFFFF" }}>{orders.length}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Poppins", color: "rgba(255,255,255,0.6)", fontWeight: "900", textTransform: "uppercase", marginTop: 4, letterSpacing: 0.5 }}>Total Orders</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ fontSize: 24, fontFamily: "Poppins", fontWeight: "extrabold", color: "#FFFFFF" }}>{currentOrder ? "1" : "0"}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Poppins", color: "rgba(255,255,255,0.6)", fontWeight: "900", textTransform: "uppercase", marginTop: 4, letterSpacing: 0.5 }}>Active Order</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Live tracking order status box if active */}
          {currentOrder ? (
            <View style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: "#F3F4F6",
              marginBottom: 20,
              ...Platform.select({
                default: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 8,
                  elevation: 1.5,
                }
              })
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: "bold", fontFamily: "Poppins", color: "#EF4444", textTransform: "uppercase", letterSpacing: 0.5 }}>Live Tracking</Text>
                  <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginTop: 2 }}>Order Tracker</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/(customer)/orders/${currentOrder.id}`)}>
                  <LinearGradient
                    colors={["#C5A880", "#8D7355"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      elevation: 2
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins", fontWeight: "bold" }}>Track Live</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Progress Stepper Visual & Kitchen Card Row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "space-between" }}>
                {/* Stepper (flex: 1) */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", position: "relative", alignItems: "center" }}>
                    {/* Line Background */}
                    <View style={{ position: "absolute", top: 14, left: 14, right: 14, height: 2, backgroundColor: "#E5E7EB", zIndex: -1 }} />
                    <View 
                      style={{ 
                        position: "absolute", 
                        top: 14, 
                        left: 14, 
                        width: `${Math.min(100, (activeStepIdx / (TRACKING_STEPS.length - 1)) * 96)}%`, 
                        height: 2, 
                        backgroundColor: "#0B6B3A", 
                        zIndex: -1 
                      }} 
                    />

                    {TRACKING_STEPS.map((s, idx) => {
                      const isCompleted = idx <= activeStepIdx
                      const isActive = idx === activeStepIdx
                      const StepIcon = s.icon
                      const showIcon = idx <= 2 || isActive

                      return (
                        <View key={idx} style={{ alignItems: "center", width: 44 }}>
                          <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: isActive ? "#FFFFFF" : isCompleted ? "#0B6B3A" : "#FFFFFF",
                            borderWidth: 2,
                            borderColor: isCompleted ? "#0B6B3A" : "#E0E0E0",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {showIcon ? (
                              <StepIcon size={12} color={isActive ? "#0B6B3A" : isCompleted ? "#FFFFFF" : "#9CA3AF"} strokeWidth={2.5} />
                            ) : (
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" }} />
                            )}
                          </View>
                          <Text style={{
                            fontSize: 8,
                            fontFamily: "Poppins",
                            fontWeight: isActive ? "800" : "600",
                            color: isActive ? "#0B6B3A" : isCompleted ? "#1F2937" : "#9CA3AF",
                            marginTop: 4,
                            textAlign: "center"
                          }}>
                            {s.label}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </View>

                {/* Kitchen Card Logo */}
                <View style={{ alignItems: "center", borderLeftWidth: 1, borderLeftColor: "#F3F4F6", paddingLeft: 12 }}>
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    overflow: "hidden"
                  }}>
                    {currentOrder.kitchenLogo ? (
                      <Image
                        source={{ uri: resolveMediaUrl(currentOrder.kitchenLogo) }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ChefHat size={18} color="#0B6B3A" />
                    )}
                  </View>
                  <Text style={{ fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginTop: 4, width: 50, textAlign: "center" }} numberOfLines={1}>
                    {currentOrder.kitchenName}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Account Details Section */}
          <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginTop: 8, marginBottom: 16 }}>Account Details</Text>
          
          <InfoTile icon={Mail} label="Email Address" value={user.email} />
          <InfoTile icon={Phone} label="Phone Number" value={user.phone ? `+91 ${user.phone}` : "Not provided"} muted={!user.phone} />
          <InfoTile
            icon={MapPin}
            label="Delivery Address"
            value={fullAddress || "No address saved. Tap edit to update."}
            muted={!hasAddress}
          />

          {!hasAddress && (
            <TouchableOpacity onPress={openEdit} style={{ marginTop: 8, alignSelf: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
                Add delivery address for checkout →
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              const body = `Please delete my Atleast80 account.\n\nName: ${user?.name || ""}\nPhone: ${user?.phone || ""}\nRegistered email: ${user?.email || ""}`
              const params = new URLSearchParams({
                view: "cm",
                fs: "1",
                to: deletionEmail,
                su: "Account deletion request",
                body,
              })
              Linking.openURL(`https://mail.google.com/mail/?${params.toString()}`)
            }}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderRadius: 20,
              backgroundColor: "#FFF5F5",
              borderWidth: 1,
              borderColor: "#FECACA",
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>Delete your Atleast80 account</Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }}>Request deletion at {deletionEmail}</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#7A7A7A" />
          </TouchableOpacity>

          {/* Legal & Policies Section */}
          <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginTop: 12, marginBottom: 16 }}>Legal & Policies</Text>

          <TouchableOpacity
            onPress={() => setPolicyType("privacy")}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#F0F0F0",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={18} color="#0B6B3A" />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>Privacy Policy</Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }}>How we protect your data</Text>
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
              padding: 16,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#F0F0F0",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#0B6B3A" />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>Terms of Service</Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }}>Platform rules & agreement</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#7A7A7A" />
          </TouchableOpacity>

          {/* Active Order tracking subtitle */}
          {currentOrder ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#0C4240" }}>Active Order</Text>
              <OrderCard order={currentOrder} highlight onTrack={(id) => router.push(`/(customer)/orders/${id}`)} />
            </View>
          ) : null}

          {/* Past Orders / History */}
          {orders.filter((o) => o.id !== currentOrder?.id).length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", marginBottom: 12 }}>Order History</Text>
              
              {loadingOrders ? (
                <ActivityIndicator color="#0B6B3A" />
              ) : (
                <View>
                  {orders
                    .filter((o) => o.id !== currentOrder?.id)
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onTrack={(id) => router.push(`/(customer)/orders/${id}`)}
                      />
                    ))}
                </View>
              )}
            </View>
          ) : (
            // Empty past orders illustration
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#F0F0F0",
              marginTop: 4,
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "#EAF7EE", alignItems: "center", justify: "center", marginBottom: 10 }}>
                <ShoppingBag size={20} color="#0B6B3A" />
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>No Order History</Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", marginTop: 4, lineHeight: 16 }}>
                {"You haven't placed any orders yet. Select a home kitchen to enjoy delicious fresh thalis!"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal Dialog */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            className="w-full bg-white rounded-t-3xl border-t border-gray-100 max-h-[90%]"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <View>
                <Text className="font-poppins font-bold text-base text-dark">Edit Profile</Text>
                <Text className="font-nunito text-[10px] text-gray uppercase mt-0.5">Manage details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEdit(false)} className="p-1">
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
              {error ? (
                <View className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl">
                  <Text className="text-red-700 font-nunito text-xs">{error}</Text>
                </View>
              ) : null}

              <View className="space-y-4 pb-10">
                <View className="mb-3">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Full Name</Text>
                  <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Your name" />
                </View>

                <View className="mb-3">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Email Address</Text>
                  <Input
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                    placeholder="Your email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View className="mb-3">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Phone Number</Text>
                  <Input
                    value={form.phone}
                    onChangeText={(v) => setForm({ ...form, phone: v })}
                    placeholder="10-digit number"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <View className="mb-3">
                  <View className="flex-row justify-between items-center mb-1.5">
                    <Text className="font-poppins text-xs font-bold text-dark-light">Delivery Address</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        onPress={() => setIsMapModalVisible(true)}
                        className="flex-row items-center gap-1"
                      >
                        <Navigation size={12} color="#0B6B3A" />
                        <Text className="text-[11px] font-poppins font-bold text-primary">Pick on Map</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleAutoDetectLocation}
                        disabled={detectingLocation}
                        className="flex-row items-center gap-1"
                      >
                        {detectingLocation ? (
                          <ActivityIndicator size="small" color="#0B6B3A" />
                        ) : (
                          <MapPin size={12} color="#0B6B3A" />
                        )}
                        <Text className="text-[11px] font-poppins font-bold text-primary">Auto Detect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Input
                    value={form.address}
                    onChangeText={(v) => setForm({ ...form, address: v })}
                    placeholder="Flat/House no, building, area details"
                  />
                </View>

                <View className="mb-3">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">City</Text>
                  <Input value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholder="Your city" />
                </View>

                <View className="mb-4">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Pincode</Text>
                  <Input
                    value={form.pincode}
                    onChangeText={(v) => setForm({ ...form, pincode: v })}
                    placeholder="6-digit pincode"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>

                <Button onPress={handleUpdate} loading={submitting} className="w-full h-12 rounded-xl mt-2">
                  Save Details
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <LocationMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={form.address || ""}
        initialCity={form.city || ""}
      />

      <PolicyModal
        visible={Boolean(policyType)}
        onClose={() => setPolicyType(null)}
        type={policyType || "privacy"}
      />
    </SafeAreaView>
  )
}
