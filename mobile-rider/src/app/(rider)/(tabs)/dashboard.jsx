import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
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
import * as Clipboard from "expo-clipboard"

let WebViewComponent = null
if (Platform.OS !== "web") {
  try {
    WebViewComponent = require("react-native-webview").WebView
  } catch (e) {
    console.warn("react-native-webview not loaded", e)
  }
}

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

const KNOWN_CITY_COORDINATES = {
  roha: { lat: 18.4372, lng: 73.1084 },
  kolad: { lat: 18.4144, lng: 73.2174 },
  mangaon: { lat: 18.2520, lng: 73.2878 },
  goregaon: { lat: 18.1724, lng: 73.2982 },
  alibag: { lat: 18.6534, lng: 72.8777 },
  mahad: { lat: 18.0827, lng: 73.4187 },
  panvel: { lat: 18.9894, lng: 73.1175 },
  "navi mumbai": { lat: 19.0330, lng: 73.0297 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  thane: { lat: 19.2183, lng: 72.9781 },
  pune: { lat: 18.5204, lng: 73.8567 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 }
}

async function resolveCityCoordinates(cityName, stateName = "Maharashtra") {
  if (!cityName) return null
  const clean = cityName.trim().toLowerCase()
  if (KNOWN_CITY_COORDINATES[clean]) {
    return KNOWN_CITY_COORDINATES[clean]
  }
  try {
    const q = `${cityName}, ${stateName || "India"}`
    const res = await api(`/api/locations/search?q=${encodeURIComponent(q)}`)
    const items = res?.data || res?.results || []
    if (items.length > 0 && items[0].latitude && items[0].longitude) {
      return {
        lat: Number(items[0].latitude),
        lng: Number(items[0].longitude)
      }
    }
  } catch (e) {
    console.warn("Failed to geocode city:", cityName, e)
  }
  return null
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
  KeyRound,
  Copy
} from "lucide-react-native"
import { useAuth } from "../../../context/AuthContext"
import {
  api,
  getRiderDashboard,
  toggleRiderStatus,
  updateRiderLocation,
  getAvailableRiderDeliveries,
  performRiderDeliveryAction,
  getRouteDetails
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

// Haversine formula calculation for distance in KM
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const numLat1 = Number(lat1)
  const numLon1 = Number(lon1)
  const numLat2 = Number(lat2)
  const numLon2 = Number(lon2)
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null

  const R = 6371 // Earth radius in KM
  const dLat = (numLat2 - numLat1) * (Math.PI / 180)
  const dLon = (numLon2 - numLon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(numLat1 * (Math.PI / 180)) *
      Math.cos(numLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Multiplying by 1.25 to approximate realistic Indian road routes
  const roadKm = (R * c * 1.25).toFixed(1)
  return Number(roadKm) < 0.1 ? "0.1" : roadKm
}

// Drop trip delivery charge (Kitchen -> Customer): Base <= 2.0 km = ₹30.00, Above 2.0 km = ₹30.00 + (extra km * ₹10)
function calculateDeliveryCharge(dropDistanceKm) {
  const km = Number(dropDistanceKm) || 0;
  const baseKm = 2.0;
  const baseRate = 30.0;
  const perKmRate = 10.0;
  if (km <= baseKm) return baseRate;
  const extraKm = km - baseKm;
  return Number((baseRate + extraKm * perKmRate).toFixed(2));
}

// Total Rider Payout: Flat ₹20 (Rider -> Kitchen Pickup) + Drop Delivery Pay
function calculateRiderPayout(dropDistanceKm, baseDeliveryFee = null) {
  const PICKUP_PAY = 20.0;
  let dropPay = 30.0;
  if (baseDeliveryFee && Number(baseDeliveryFee) > 0) {
    dropPay = Number(baseDeliveryFee);
  } else if (dropDistanceKm) {
    dropPay = calculateDeliveryCharge(dropDistanceKm);
  }
  return Number((PICKUP_PAY + dropPay).toFixed(2));
}

// Open Google Maps turn-by-turn navigation or search address directly
function openInMaps(address, lat, lng, originLat, originLng) {
  let destQuery = ""
  if (lat && lng) {
    destQuery = `${lat},${lng}`
  } else if (address) {
    destQuery = encodeURIComponent(address)
  }
  if (!destQuery) return

  let originParam = ""
  if (originLat && originLng) {
    originParam = `&origin=${originLat},${originLng}`
  }

  const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destQuery}&travelmode=driving`

  // On Web browser, directly open Google Maps in a new tab to prevent Expo Router /undefined route navigation
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.open) {
      window.open(googleMapsWebUrl, "_blank")
    } else {
      Linking.openURL(googleMapsWebUrl)
    }
    return
  }

  // Native Android and iOS
  const nativeUrl = Platform.select({
    ios: `maps:0,0?q=${destQuery}`,
    android: `google.navigation:q=${destQuery}&mode=d`,
    default: googleMapsWebUrl
  })

  if (nativeUrl) {
    Linking.canOpenURL(nativeUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(nativeUrl)
        } else {
          return Linking.openURL(googleMapsWebUrl)
        }
      })
      .catch(() => {
        Linking.openURL(googleMapsWebUrl).catch(() => {
          Alert.alert("Navigation Error", "Unable to open Google Maps.")
        })
      })
  } else {
    Linking.openURL(googleMapsWebUrl)
  }
}

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyDdkmLpJjLrOLBkqceMQ63ZZodNgksd1Uc"

// 1. Transparent Split Distance Breakdown Component
function TripDistanceBreakdown({ pickupKm, dropKm, totalKm, isPickupDone = false }) {
  return (
    <View style={{ backgroundColor: "#F7FDF9", borderWidth: 1.5, borderColor: "#D1FAE5", borderRadius: 14, padding: 12, marginVertical: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Navigation size={12} color="#0B6B3A" />
          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#065F46", letterSpacing: 0.3 }}>
            TRIP DISTANCE BREAKDOWN
          </Text>
        </View>
        <View style={{ backgroundColor: "#EAF7EE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ fontSize: 9.5, color: "#0B6B3A", fontFamily: "Nunito", fontWeight: "bold" }}>
            Google Road Kilometers
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        {/* Leg 1: Rider -> Kitchen */}
        <View style={{ flex: 1, alignItems: "center", backgroundColor: isPickupDone ? "#ECFDF5" : "#FFFFFF", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: isPickupDone ? "#A7F3D0" : "#E5E7EB" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isPickupDone ? "#059669" : "#0B6B3A" }} />
            <Text style={{ fontSize: 10, color: "#4B5563", fontFamily: "Nunito", fontWeight: "600" }}>To Kitchen</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins", marginTop: 2 }}>
            {pickupKm ? `${pickupKm} km` : "--"}
          </Text>
          <Text style={{ fontSize: 9, color: "#059669", fontFamily: "Nunito", fontWeight: "bold" }}>₹20 Pickup</Text>
        </View>

        <Text style={{ fontSize: 14, color: "#9CA3AF", fontWeight: "bold" }}>+</Text>

        {/* Leg 2: Kitchen -> Customer */}
        <View style={{ flex: 1, alignItems: "center", backgroundColor: "#FFFFFF", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6B00" }} />
            <Text style={{ fontSize: 10, color: "#4B5563", fontFamily: "Nunito", fontWeight: "600" }}>To Customer</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#FF6B00", fontFamily: "Poppins", marginTop: 2 }}>
            {dropKm ? `${dropKm} km` : "--"}
          </Text>
          <Text style={{ fontSize: 9, color: "#FF6B00", fontFamily: "Nunito", fontWeight: "bold" }}>
            ₹{calculateDeliveryCharge(dropKm).toFixed(0)} Drop
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: "#9CA3AF", fontWeight: "bold" }}>=</Text>

        {/* Total Trip */}
        <View style={{ flex: 1.25, alignItems: "center", backgroundColor: "#0B6B3A", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, shadowColor: "#0B6B3A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}>
          <Text style={{ fontSize: 10, color: "#EAF7EE", fontFamily: "Nunito", fontWeight: "700" }}>Total Trip</Text>
          <Text style={{ fontSize: 13.5, fontWeight: "bold", color: "#FFFFFF", fontFamily: "Poppins", marginTop: 1 }}>
            {totalKm ? `${totalKm} km` : "--"}
          </Text>
          <Text style={{ fontSize: 9, color: "#A7F3D0", fontFamily: "Nunito", fontWeight: "bold" }}>
            ₹{calculateRiderPayout(dropKm).toFixed(0)} Payout
          </Text>
        </View>
      </View>
    </View>
  )
}

// 2. Interactive In-App Route Navigation Card (Pickup & Drop-off 2-Step Flow)
function InAppRouteNavigation({ order, riderCoords, routeInfo, onStartNavigation }) {
  if (!order) return null

  const isPickupPhase = ["accepted", "arrived_kitchen"].includes(order.delivery_status)
  const isDropPhase = ["picked_up", "arrived_customer"].includes(order.delivery_status)

  const originLat = riderCoords?.latitude
  const originLng = riderCoords?.longitude

  const destLat = isPickupPhase ? (order.kitchen_latitude || order.kitchen_lat) : (order.delivery_latitude || order.delivery_lat)
  const destLng = isPickupPhase ? (order.kitchen_longitude || order.kitchen_lng) : (order.delivery_longitude || order.delivery_lng)

  const destAddress = isPickupPhase
    ? [order.kitchen_address, order.kitchen_city, order.kitchen_pincode].filter(Boolean).join(", ")
    : [order.delivery_address, order.customer_city, order.customer_pincode].filter(Boolean).join(", ")

  const destName = isPickupPhase ? order.kitchen_name : (order.customer_name || "Customer")

  const destPinColor = isPickupPhase ? "0xFF6B00" : "0xEF4444"
  const destPinLabel = isPickupPhase ? "K" : "C"

  // Road distance & ETA
  const realTimeKm = calculateDistanceKm(originLat, originLng, destLat, destLng)
  const displayKm = realTimeKm || routeInfo?.distanceKm || "~"
  const displayDuration = (displayKm && displayKm !== "~") ? `${Math.max(1, Math.round((Number(displayKm) / 25) * 60))} mins` : (routeInfo?.durationText || null)

  // Google Static Map route preview URL with rider & destination markers and road polyline
  let staticMapUrl = null
  if (originLat && originLng && destLat && destLng) {
    const polyline = routeInfo?.encodedPolyline
    const pathParam = polyline
      ? `enc:${encodeURIComponent(polyline)}`
      : `${originLat},${originLng}%7C${destLat},${destLng}`
    staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=640x300&scale=2&maptype=roadmap&markers=color:0x0B6B3A%7Clabel:R%7C${originLat},${originLng}&markers=color:${destPinColor}%7Clabel:${destPinLabel}%7C${destLat},${destLng}&path=color:0x0B6B3Aff|weight:5|${pathParam}&key=${GOOGLE_MAPS_KEY}`
  }

  return (
    <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: isPickupPhase ? "#FED7AA" : "#FECACA", backgroundColor: "#FFFFFF", marginVertical: 4 }}>
      {/* Step Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: isPickupPhase ? "#FFF7ED" : "#FEF2F2", borderBottomWidth: 1, borderBottomColor: isPickupPhase ? "#FED7AA" : "#FECACA" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isPickupPhase ? "#EA580C" : "#DC2626" }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: isPickupPhase ? "#9A3412" : "#991B1B", textTransform: "uppercase" }}>
              {isPickupPhase ? "Step 1: Route to Kitchen" : "Step 2: Route to Customer"}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "600", color: "#1F1F1F" }}>
              {destName}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: isPickupPhase ? "#FDBA74" : "#FCA5A5", flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Navigation size={11} color="#0B6B3A" />
          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
            {displayKm} km {displayDuration ? `• ${displayDuration}` : ""}
          </Text>
        </View>
      </View>

      {/* Map visual preview with Live Moving Map */}
      <View style={{ position: "relative", width: "100%", height: 185, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
        {originLat && originLng && destLat && destLng ? (
          <InteractiveGoogleMap
            originLat={originLat}
            originLng={originLng}
            originHeading={riderCoords?.heading}
            destLat={destLat}
            destLng={destLng}
            encodedPolyline={routeInfo?.encodedPolyline}
            isPickupPhase={isPickupPhase}
            destName={destName}
            isAutoFollowing={true}
            isPreview={true}
          />
        ) : staticMapUrl ? (
          <Image
            source={{ uri: staticMapUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F9FAFB" }}>
            <MapPin size={26} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: "#6B7280", fontFamily: "Nunito" }}>Loading live Google route map...</Text>
          </View>
        )}

        {/* Floating Google Maps Turn-by-Turn Button */}
        <TouchableOpacity
          onPress={onStartNavigation}
          activeOpacity={0.88}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            backgroundColor: "#0B6B3A",
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 15,
            paddingVertical: 9.5,
            borderRadius: 22,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 5
          }}
        >
          <Navigation size={14} color="#FFFFFF" />
          <Text style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>
            Start In-App Navigation
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}


// Polyline decoder utility for Google Routes API
function decodePolyline(encoded) {
  if (!encoded) return []
  const points = []
  let index = 0, len = encoded.length
  let lat = 0, lng = 0

  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

// 100% Real Interactive Navigation Map component (Fast, Draggable, Smooth, No Billing/API Restrictions)

function generateInteractiveMapHtml({ originLat, originLng, originHeading = 0, destLat, destLng, encodedPolyline, isPickupPhase, isPreview = false }) {
  const centerLat = Number(originLat) || 28.580
  const centerLng = Number(originLng) || 77.380
  const dLat = destLat ? Number(destLat) : null
  const dLng = destLng ? Number(destLng) : null
  const destColor = isPickupPhase ? "#FF6B00" : "#DC2626"
  const destLetter = isPickupPhase ? "K" : "C"

  const polylinePoints = encodedPolyline ? decodePolyline(encodedPolyline) : []
  const polylineJson = JSON.stringify(polylinePoints.map(p => [p.lat, p.lng]))

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #e5e7eb; overflow: hidden; }
    .rider-pulse-halo {
      animation: riderPulse 2s ease-in-out infinite;
    }
    @keyframes riderPulse {
      0% { transform: scale(0.85); opacity: 0.85; }
      50% { transform: scale(1.6); opacity: 0.2; }
      100% { transform: scale(0.85); opacity: 0.85; }
    }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var centerLat = ${centerLat};
    var centerLng = ${centerLng};
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([centerLat, centerLng], 16);

    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3']
    }).addTo(map);

    // Live Rider Marker with Directional Pointer
    var riderIcon = L.divIcon({
      className: 'rider-live-marker',
      html: '<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">' +
            '<div class="rider-pulse-halo" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.4);"></div>' +
            '<div id="rider-arrow-wrap" style="width: 28px; height: 28px; border-radius: 50%; background: #0B6B3A; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2; transform: rotate(${originHeading}deg); transition: transform 0.3s ease;">' +
            '<span style="color: #FFFFFF; font-size: 13px; font-weight: 900; line-height: 1; transform: translateY(-1px);">▲</span>' +
            '</div></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    var riderMarker = L.marker([centerLat, centerLng], { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);

    ${dLat && dLng ? `
    var destIcon = L.divIcon({
      className: 'dest-marker',
      html: '<div style="width: 32px; height: 32px; background: ${destColor}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">' +
            '<span style="transform: rotate(45deg); font-weight: 800; font-size: 13px; color: #FFFFFF; font-family: sans-serif;">${destLetter}</span>' +
            '</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    var destMarker = L.marker([${dLat}, ${dLng}], { icon: destIcon, zIndexOffset: 900 }).addTo(map);
    ` : ''}

    var polylinePoints = ${polylineJson};
    var polyline = null;
    var padTL = ${isPreview ? "[15, 15]" : "[30, 80]"};
    var padBR = ${isPreview ? "[15, 15]" : "[30, 150]"};

    if (polylinePoints && polylinePoints.length > 0) {
      polyline = L.polyline(polylinePoints, { color: '#0B6B3A', weight: ${isPreview ? 5 : 6}, opacity: 0.9, lineJoin: 'round' }).addTo(map);
      try {
        map.fitBounds(polyline.getBounds(), { paddingTopLeft: padTL, paddingBottomRight: padBR, maxZoom: 17 });
      } catch (e) {
        map.setView([centerLat, centerLng], 15);
      }
    } else if (${dLat && dLng ? 'true' : 'false'}) {
      try {
        var bounds = L.latLngBounds([[centerLat, centerLng], [${dLat || centerLat}, ${dLng || centerLng}]]);
        map.fitBounds(bounds, { paddingTopLeft: padTL, paddingBottomRight: padBR, maxZoom: 17 });
      } catch (e) {
        map.setView([centerLat, centerLng], 15);
      }
    }

    setTimeout(function() {
      try { map.invalidateSize(); } catch(e) {}
    }, 250);

    var autoFollowEnabled = true;
    map.on('dragstart', function() {
      autoFollowEnabled = false;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dragstart' }));
      }
    });

    window.updateRoutePolyline = function(newPoints) {
      if (!newPoints || !newPoints.length) return;
      if (polyline) {
        polyline.setLatLngs(newPoints);
      } else {
        polyline = L.polyline(newPoints, { color: '#0B6B3A', weight: ${isPreview ? 5 : 6}, opacity: 0.9, lineJoin: 'round' }).addTo(map);
      }
    };

    window.updateRiderPosition = function(lat, lng, heading, autoFollow) {
      if (!lat || !lng) return;
      var newPos = L.latLng(lat, lng);
      riderMarker.setLatLng(newPos);
      var arrow = document.getElementById('rider-arrow-wrap');
      if (arrow && heading !== undefined) {
        arrow.style.transform = 'rotate(' + (heading || 0) + 'deg)';
      }
      if (autoFollow && autoFollowEnabled) {
        map.panTo(newPos, { animate: true, duration: 0.8 });
      }
    };

    window.recenterMap = function(lat, lng) {
      autoFollowEnabled = true;
      map.setView([lat, lng], 17, { animate: true });
    };
  </script>
</body>
</html>`
}

function InteractiveGoogleMap({
  originLat,
  originLng,
  originHeading = 0,
  destLat,
  destLng,
  encodedPolyline,
  isPickupPhase,
  destName,
  isAutoFollowing = true,
  setIsAutoFollowing,
  recenterTrigger,
  mapRef,
  isPreview = false,
}) {
  const containerRef = useRef(null)
  const webViewRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const polylineRef = useRef(null)
  const internalMapRef = useRef(null)
  const activeMapRef = mapRef || internalMapRef
  const [mapLoaded, setMapLoaded] = useState(false)

  const initialOriginRef = useRef({
    lat: originLat || 28.580,
    lng: originLng || 77.380,
    heading: originHeading || 0,
  })

  if ((!initialOriginRef.current.lat || initialOriginRef.current.lat === 28.580) && originLat) {
    initialOriginRef.current.lat = originLat
    initialOriginRef.current.lng = originLng
    initialOriginRef.current.heading = originHeading || 0
  }

  // Stable HTML string that does NOT reload the WebView when rider moves
  const mapHtml = useMemo(() => {
    return generateInteractiveMapHtml({
      originLat: initialOriginRef.current.lat,
      originLng: initialOriginRef.current.lng,
      originHeading: initialOriginRef.current.heading,
      destLat,
      destLng,
      encodedPolyline,
      isPickupPhase,
      isPreview,
    })
  }, [destLat, destLng, isPickupPhase, isPreview])

  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml])

  // Web Leaflet initialization
  useEffect(() => {
    if (Platform.OS !== "web") return
    let isMounted = true

    if (typeof document !== "undefined" && !document.getElementById("nav-map-styles")) {
      const styleEl = document.createElement("style")
      styleEl.id = "nav-map-styles"
      styleEl.innerHTML = `
        @keyframes riderPulse {
          0% { transform: scale(0.85); opacity: 0.85; }
          50% { transform: scale(1.6); opacity: 0.2; }
          100% { transform: scale(0.85); opacity: 0.85; }
        }
        .rider-pulse-halo {
          animation: riderPulse 2s ease-in-out infinite;
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background: #E5E7EB !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `
      document.head.appendChild(styleEl)
    }

    const loadLeafletAndInit = async () => {
      try {
        if (!window.L) {
          if (!document.getElementById("leaflet-css")) {
            const link = document.createElement("link")
            link.id = "leaflet-css"
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            document.head.appendChild(link)
          }

          await new Promise((resolve, reject) => {
            const existing = document.getElementById("leaflet-js")
            if (existing) {
              if (window.L) return resolve()
              existing.addEventListener("load", resolve)
              existing.addEventListener("error", reject)
              return
            }
            const script = document.createElement("script")
            script.id = "leaflet-js"
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            script.async = true
            script.onload = () => resolve()
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        if (!isMounted || !containerRef.current || !window.L) return

        if (activeMapRef.current) {
          try {
            activeMapRef.current.remove()
          } catch (e) {}
          activeMapRef.current = null
        }
        if (containerRef.current) {
          try {
            if (containerRef.current._leaflet_id) {
              containerRef.current._leaflet_id = null
            }
            containerRef.current.innerHTML = ""
          } catch (e) {}
        }

        const centerLat = Number(originLat) || 28.580
        const centerLng = Number(originLng) || 77.380

        let map = null
        try {
          map = window.L.map(containerRef.current, {
            center: [centerLat, centerLng],
            zoom: 16,
            zoomControl: false,
            attributionControl: false,
          })
        } catch (initErr) {
          if (containerRef.current) {
            containerRef.current._leaflet_id = null
            containerRef.current.innerHTML = ""
            map = window.L.map(containerRef.current, {
              center: [centerLat, centerLng],
              zoom: 16,
              zoomControl: false,
              attributionControl: false,
            })
          }
        }

        activeMapRef.current = map

        window.L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["0", "1", "2", "3"],
        }).addTo(map)

        // Live Rider Marker with Directional Pointer
        const riderIcon = window.L.divIcon({
          className: "rider-live-marker",
          html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <div class="rider-pulse-halo" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.4);"></div>
              <div id="rider-arrow-wrap-web" style="width: 28px; height: 28px; border-radius: 50%; background: #0B6B3A; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2; transform: rotate(${originHeading || 0}deg); transition: transform 0.3s ease;">
                <span style="color: #FFFFFF; font-size: 13px; font-weight: 900; line-height: 1; transform: translateY(-1px);">▲</span>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })

        const riderMarker = window.L.marker([centerLat, centerLng], {
          icon: riderIcon,
          zIndexOffset: 1000,
        }).addTo(map)
        riderMarkerRef.current = riderMarker

        // Destination Marker
        if (destLat && destLng) {
          const destColor = isPickupPhase ? "#FF6B00" : "#DC2626"
          const destLetter = isPickupPhase ? "K" : "C"
          const destIcon = window.L.divIcon({
            className: "dest-live-marker",
            html: `
              <div style="width: 32px; height: 32px; background: ${destColor}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                <span style="transform: rotate(45deg); font-weight: 800; font-size: 13px; color: #FFFFFF; font-family: sans-serif;">
                  ${destLetter}
                </span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })

          const destMarker = window.L.marker([Number(destLat), Number(destLng)], {
            icon: destIcon,
            zIndexOffset: 900,
          }).addTo(map)
          destMarkerRef.current = destMarker
        }

        // Draw Route Polyline
        let polyline = null
        if (encodedPolyline) {
          const points = decodePolyline(encodedPolyline)
          if (points.length > 0) {
            const latLngs = points.map((p) => [p.lat, p.lng])
            polyline = window.L.polyline(latLngs, {
              color: "#0B6B3A",
              weight: 6,
              opacity: 0.9,
              lineJoin: "round",
            }).addTo(map)
            polylineRef.current = polyline
          }
        }

        const padTL = isPreview ? [15, 15] : [30, 80]
        const padBR = isPreview ? [15, 15] : [30, 150]
        if (polyline) {
          try {
            map.fitBounds(polyline.getBounds(), {
              paddingTopLeft: padTL,
              paddingBottomRight: padBR,
              maxZoom: 17,
            })
          } catch (e) {
            map.setView([centerLat, centerLng], 15)
          }
        } else if (originLat && originLng && destLat && destLng) {
          try {
            const group = window.L.latLngBounds([
              [Number(originLat), Number(originLng)],
              [Number(destLat), Number(destLng)],
            ])
            map.fitBounds(group, {
              paddingTopLeft: padTL,
              paddingBottomRight: padBR,
              maxZoom: 17,
            })
          } catch (e) {
            map.setView([centerLat, centerLng], 15)
          }
        }

        setTimeout(() => {
          try { map.invalidateSize() } catch (e) {}
        }, 250)

        map.on("dragstart", () => {
          if (setIsAutoFollowing) setIsAutoFollowing(false)
        })

        if (isMounted) setMapLoaded(true)
      } catch (err) {
        console.error("Interactive Navigation Map Init Error:", err)
      }
    }

    loadLeafletAndInit()

    return () => {
      isMounted = false
      if (activeMapRef?.current) {
        try {
          activeMapRef.current.remove()
        } catch (e) {}
        activeMapRef.current = null
      }
      riderMarkerRef.current = null
      destMarkerRef.current = null
      polylineRef.current = null
      if (containerRef.current) {
        try {
          containerRef.current._leaflet_id = null
          containerRef.current.innerHTML = ""
        } catch (e) {}
      }
    }
  }, [destLat, destLng, encodedPolyline, isPickupPhase])

  // Real-time rider location updates on Web
  useEffect(() => {
    if (
      Platform.OS === "web" &&
      riderMarkerRef.current &&
      riderMarkerRef.current._map &&
      riderMarkerRef.current._icon &&
      originLat &&
      originLng
    ) {
      try {
        const pos = [Number(originLat), Number(originLng)]
        riderMarkerRef.current.setLatLng(pos)
        const arrowEl = document.getElementById("rider-arrow-wrap-web")
        if (arrowEl && originHeading !== undefined) {
          arrowEl.style.transform = `rotate(${originHeading || 0}deg)`
        }
        if (isAutoFollowing && activeMapRef?.current && activeMapRef.current._loaded) {
          activeMapRef.current.panTo(pos, { animate: false })
        }
      } catch (err) {
        // Silently guard against detached DOM node or animation frame race
      }
    }
  }, [originLat, originLng, originHeading, isAutoFollowing])

  // Real-time rider location updates on Native (WebView injection)
  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current && originLat && originLng) {
      const js = `if (window.updateRiderPosition) { window.updateRiderPosition(${originLat}, ${originLng}, ${originHeading || 0}, ${isAutoFollowing ? "true" : "false"}); }; true;`
      webViewRef.current.injectJavaScript(js)
    }
  }, [originLat, originLng, originHeading, isAutoFollowing])

  // Real-time polyline route update without page reload
  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current && encodedPolyline) {
      try {
        const points = decodePolyline(encodedPolyline)
        if (points && points.length > 0) {
          const latLngs = points.map((p) => [p.lat, p.lng])
          const js = `if (window.updateRoutePolyline) { window.updateRoutePolyline(${JSON.stringify(latLngs)}); }; true;`
          webViewRef.current.injectJavaScript(js)
        }
      } catch (_) {}
    }
  }, [encodedPolyline])

  // Recenter trigger
  useEffect(() => {
    if (recenterTrigger && originLat && originLng) {
      try {
        if (Platform.OS === "web" && activeMapRef?.current && activeMapRef.current._loaded) {
          activeMapRef.current.setView([Number(originLat), Number(originLng)], 17, { animate: true })
        } else if (Platform.OS !== "web" && webViewRef.current) {
          webViewRef.current.injectJavaScript(`if (window.recenterMap) { window.recenterMap(${originLat}, ${originLng}); }; true;`)
        }
      } catch (err) {}
      if (setIsAutoFollowing) setIsAutoFollowing(true)
    }
  }, [recenterTrigger])

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#E5E7EB" }}>
      {Platform.OS === "web" ? (
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      ) : WebViewComponent ? (
        <WebViewComponent
          ref={webViewRef}
          originWhitelist={["*"]}
          source={mapSource}
          style={{ width: "100%", height: "100%", backgroundColor: "#E5E7EB" }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          scrollEnabled={false}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data)
              if (data?.type === "dragstart" && setIsAutoFollowing) {
                setIsAutoFollowing(false)
              }
            } catch (_) {}
          }}
          onLoadEnd={() => {
            setMapLoaded(true)
            if (webViewRef.current && originLat && originLng) {
              const js = `if (window.updateRiderPosition) { window.updateRiderPosition(${originLat}, ${originLng}, ${originHeading || 0}, ${isAutoFollowing ? "true" : "false"}); }; true;`
              webViewRef.current.injectJavaScript(js)
            }
          }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      )}

      {!mapLoaded && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", zIndex: 5 }}>
          <ActivityIndicator size="large" color="#0B6B3A" />
          <Text style={{ marginTop: 10, fontSize: 13, color: "#4B5563", fontFamily: "Poppins" }}>
            Loading Interactive Navigation Map...
          </Text>
        </View>
      )}
    </View>
  )
}

// 3. 100% Full-Screen Edge-to-Edge Map Navigation (Floating Turn HUD & Floating Action Sheet)
function InAppNavigationScreen({
  order,
  riderCoords,
  setRiderCoords,
  routeInfo,
  onClose,
  handleOrderAction,
  onCompleteDeliveryPress,
  onCancelDoorstepPress,
  actionLoading,
  otpInput,
  setOtpInput,
  handleCall,
  updateRiderLocationOnServer
}) {
  const mapRef = useRef(null)
  const [isAutoFollowing, setIsAutoFollowing] = useState(true)
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  // Live GPS tracking watcher (Continuous 2.5s / 5m high-accuracy updates)
  useEffect(() => {
    let isMounted = true
    let sub = null

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (pos) => {
        if (isMounted && pos?.coords) {
          let lat = pos.coords.latitude
          let lng = pos.coords.longitude
          let heading = pos.coords.heading || 0
          let speed = pos.coords.speed || 0

          const refLat = order?.kitchen_latitude || order?.kitchen_lat
          const refLng = order?.kitchen_longitude || order?.kitchen_lng
          if (refLat && refLng) {
            const distFromRef = calculateDistanceKm(lat, lng, refLat, refLng)
            if (distFromRef && Number(distFromRef) > 35) {
              lat = Number(refLat)
              lng = Number(refLng)
            }
          }

          const coords = {
            latitude: lat,
            longitude: lng,
            heading,
            speed,
          }
          if (setRiderCoords) setRiderCoords(coords)
          if (updateRiderLocationOnServer) {
            updateRiderLocationOnServer(lat, lng).catch(() => {})
          }
        }
      }
    ).then((s) => {
      if (isMounted) sub = s
      else s.remove()
    }).catch((err) => {
      console.warn("In-app nav GPS watch error:", err?.message)
    })

    return () => {
      isMounted = false
      if (sub) sub.remove()
    }
  }, [])

  if (!order) return null

  const isPickupPhase = ["accepted", "arrived_kitchen"].includes(order.delivery_status)
  const originLat = riderCoords?.latitude
  const originLng = riderCoords?.longitude

  const destLat = isPickupPhase ? (order.kitchen_latitude || order.kitchen_lat) : (order.delivery_latitude || order.delivery_lat)
  const destLng = isPickupPhase ? (order.kitchen_longitude || order.kitchen_lng) : (order.delivery_longitude || order.delivery_lng)

  const destAddress = isPickupPhase
    ? [order.kitchen_address, order.kitchen_city, order.kitchen_pincode].filter(Boolean).join(", ")
    : [order.delivery_address, order.customer_city, order.customer_pincode].filter(Boolean).join(", ")

  const destName = isPickupPhase ? order.kitchen_name : (order.customer_name || "Customer")
  const destPhone = isPickupPhase ? order.kitchen_phone : order.customer_phone

  const realTimeKm = calculateDistanceKm(originLat, originLng, destLat, destLng)
  const displayKm = realTimeKm || routeInfo?.distanceKm || "~"
  const displayDuration = (displayKm && displayKm !== "~") ? `${Math.max(1, Math.round((Number(displayKm) / 25) * 60))} mins` : (routeInfo?.durationText || null)

  const steps = (routeInfo?.steps && routeInfo.steps.length > 0) ? routeInfo.steps : [
    { id: 1, distanceText: `${displayKm} km`, maneuver: "STRAIGHT", instruction: `Proceed toward ${destName}` }
  ]

  const currentStep = steps[activeStepIndex] || steps[0]

  const getManeuverArrow = (maneuver) => {
    const m = String(maneuver || "").toUpperCase()
    if (m.includes("LEFT")) return "↰"
    if (m.includes("RIGHT")) return "↱"
    if (m.includes("U_TURN")) return "⮌"
    return "⬆"
  }

  return (
    <View style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#E5E7EB",
      zIndex: 50,
      overflow: "hidden"
    }}>
        {/* 1. 100% REAL INTERACTIVE GOOGLE MAP BACKGROUND (Draggable, Zoomable, Pannable) */}
        <InteractiveGoogleMap
          originLat={originLat}
          originLng={originLng}
          originHeading={riderCoords?.heading}
          destLat={destLat}
          destLng={destLng}
          encodedPolyline={routeInfo?.encodedPolyline}
          isPickupPhase={isPickupPhase}
          destName={destName}
          isAutoFollowing={isAutoFollowing}
          setIsAutoFollowing={setIsAutoFollowing}
          recenterTrigger={recenterTrigger}
          mapRef={mapRef}
        />

        {/* 2. MINIMALIST SLIM FLOATING TOP TURN HUD */}
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 50 : 16, left: 14, right: 14, zIndex: 10 }}>
          <View style={{
            backgroundColor: "#064E3B",
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
            borderWidth: 1,
            borderColor: "rgba(52, 211, 153, 0.3)"
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              {/* Turn Icon */}
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: "#064E3B", lineHeight: 26 }}>
                  {getManeuverArrow(currentStep?.maneuver)}
                </Text>
              </View>

              {/* Turn Text & ETA */}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>
                  {currentStep?.distanceText ? `${currentStep.distanceText} • ` : ""}{currentStep?.instruction || `Head to ${destName}`}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 11.5, color: "#A7F3D0", fontFamily: "Nunito", fontWeight: "bold" }}>
                    {displayKm} km • {displayDuration || "Calculating..."}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAllSteps(!showAllSteps)}
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 10 }}
                  >
                    <Text style={{ fontSize: 10, color: "#6EE7B7", fontFamily: "Poppins", fontWeight: "600" }}>
                      {showAllSteps ? "Hide" : `${steps.length} Turns ▾`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exit Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 14
                }}
              >
                <X size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 11.5, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible Turns Dropdown */}
          {showAllSteps && (
            <View style={{ maxHeight: 180, backgroundColor: "#022C22", borderRadius: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }}>
              <ScrollView showsVerticalScrollIndicator={true}>
                {steps.map((st, idx) => (
                  <TouchableOpacity
                    key={st.id || idx}
                    onPress={() => {
                      setActiveStepIndex(idx)
                      setShowAllSteps(false)
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 6,
                      borderBottomWidth: idx === steps.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(255,255,255,0.06)",
                      opacity: idx === activeStepIndex ? 1 : 0.7
                    }}
                  >
                    <Text style={{ fontSize: 15, color: idx === activeStepIndex ? "#34D399" : "#9CA3AF" }}>
                      {getManeuverArrow(st.maneuver)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11.5, fontFamily: "Poppins", fontWeight: idx === activeStepIndex ? "bold" : "500", color: idx === activeStepIndex ? "#34D399" : "#E5E7EB" }}>
                        {st.instruction}
                      </Text>
                      <Text style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: "Nunito" }}>
                        {st.distanceText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 3. FLOATING RECENTER BUTTON (Appears when rider drags away from live position) */}
        {!isAutoFollowing && (
          <TouchableOpacity
            onPress={() => {
              setRecenterTrigger((t) => t + 1)
              setIsAutoFollowing(true)
            }}
            activeOpacity={0.85}
            style={{
              position: "absolute",
              right: 14,
              bottom: 175,
              backgroundColor: "#FFFFFF",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.28,
              shadowRadius: 6,
              elevation: 7,
              borderWidth: 1.5,
              borderColor: "#0B6B3A",
              zIndex: 20
            }}
          >
            <Navigation size={15} color="#0B6B3A" />
            <Text style={{ fontSize: 12.5, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
              Recenter
            </Text>
          </TouchableOpacity>
        )}

        {/* 4. FLOATING ZOOM BUTTONS */}
        <View style={{
          position: "absolute",
          right: 14,
          bottom: !isAutoFollowing ? 225 : 175,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 5,
          elevation: 7,
          overflow: "hidden",
          zIndex: 20
        }}>
          <TouchableOpacity
            onPress={() => {
              if (mapRef.current) {
                if (mapRef.current.zoomIn) mapRef.current.zoomIn()
                else if (mapRef.current.setZoom) mapRef.current.setZoom(mapRef.current.getZoom() + 1)
              }
            }}
            style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937", lineHeight: 22 }}>+</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />
          <TouchableOpacity
            onPress={() => {
              if (mapRef.current) {
                if (mapRef.current.zoomOut) mapRef.current.zoomOut()
                else if (mapRef.current.setZoom) mapRef.current.setZoom(mapRef.current.getZoom() - 1)
              }
            }}
            style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1F2937", lineHeight: 22 }}>−</Text>
          </TouchableOpacity>
        </View>

        {/* 5. SLIM FLOATING BOTTOM ACTION SHEET */}
        <View style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: Platform.OS === "ios" ? 30 : 14,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
          gap: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
          zIndex: 20
        }}>
          {/* Destination info & Call button */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isPickupPhase ? "#EA580C" : "#DC2626" }} />
                <Text style={{ fontSize: 10.5, fontFamily: "Nunito", color: "#6B7280", fontWeight: "700", textTransform: "uppercase" }}>
                  {isPickupPhase ? "Step 1: Pickup Restaurant" : "Step 2: Customer Drop-off"}
                </Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", marginTop: 1 }}>
                {destName}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 11, color: "#6B7280", fontFamily: "Nunito" }}>
                {destAddress}
              </Text>
            </View>

            {destPhone ? (
              <TouchableOpacity
                onPress={() => handleCall(destPhone)}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#EAF7EE", borderWidth: 1, borderColor: "#A7F3D0", alignItems: "center", justifyContent: "center" }}
              >
                <Phone size={16} color="#0B6B3A" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Action Button: Arrived at Kitchen / Confirm Pickup / Arrived at Customer / Deliver */}
          {order.delivery_status === "accepted" && (
            <TouchableOpacity
              onPress={() => handleOrderAction(order.id, "arrive_kitchen")}
              disabled={actionLoading}
              style={{ backgroundColor: "#0B6B3A", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#0B6B3A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4 }}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                  Mark: Arrived at Kitchen
                </Text>
              )}
            </TouchableOpacity>
          )}

          {order.delivery_status === "arrived_kitchen" && (
            <View style={{ gap: 8 }}>
              <TextInput
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Enter 4-digit Kitchen Code"
                keyboardType="numeric"
                maxLength={4}
                style={{ borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13.5, fontFamily: "Nunito" }}
              />
              <TouchableOpacity
                onPress={() => handleOrderAction(order.id, "pickup", { pickupCode: otpInput })}
                disabled={actionLoading}
                style={{ backgroundColor: "#FF6B00", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                    Confirm Pickup & Switch to Customer Route
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {order.delivery_status === "picked_up" && (
            <TouchableOpacity
              onPress={() => handleOrderAction(order.id, "arrive_customer")}
              disabled={actionLoading}
              style={{ backgroundColor: "#0B6B3A", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                  Mark: Arrived at Customer Doorstep
                </Text>
              )}
            </TouchableOpacity>
          )}

          {order.delivery_status === "arrived_customer" && (
            <View style={{ gap: 8 }}>
              <TextInput
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Enter 4-digit Customer Delivery OTP"
                keyboardType="numeric"
                maxLength={4}
                style={{ borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13.5, fontFamily: "Nunito" }}
              />
              <TouchableOpacity
                onPress={onCompleteDeliveryPress || (() => handleOrderAction(order.id, "deliver", { deliveryOtp: otpInput }))}
                disabled={actionLoading}
                style={{ backgroundColor: "#0B6B3A", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                    Verify OTP & Complete Delivery
                  </Text>
                )}
              </TouchableOpacity>
              {onCancelDoorstepPress && !Boolean(
                order.is_rescue === 1 ||
                (order.original_order_id && Number(order.original_order_id) > 0) ||
                order.delivery_status === "rescue_claimed"
              ) && (
                <TouchableOpacity
                  onPress={onCancelDoorstepPress}
                  disabled={actionLoading}
                  style={{ borderWidth: 1.5, borderColor: "#EF4444", height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins", fontSize: 12 }}>
                    Cancel at Doorstep (Customer Paid)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Optional: Open in External Google Maps App */}
          {originLat && originLng && destLat && destLng && (
            <TouchableOpacity
              onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`
                Linking.openURL(url).catch(console.warn)
              }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingTop: 2 }}
            >
              <Navigation size={12} color="#0B6B3A" />
              <Text style={{ fontSize: 11, color: "#0B6B3A", fontFamily: "Nunito", fontWeight: "700" }}>
                Open Turn-by-Turn in Google Maps App ↗
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  const [riderCoords, setRiderCoords] = useState(() => {
    const activeCity = user?.city || "Roha"
    const match = KNOWN_CITY_COORDINATES[activeCity.toLowerCase()]
    if (match) return { latitude: match.lat, longitude: match.lng, heading: 0, speed: 0, isManual: true }
    return null
  })
  const [activeRouteInfo, setActiveRouteInfo] = useState(null)
  const [isNavigatingInApp, setIsNavigatingInApp] = useState(false)
  const lastRouteFetchRef = useRef({ lat: null, lng: null, time: 0, orderId: null, phase: null })

  // Fetch live route details with Google Routes API for active delivery
  useEffect(() => {
    const activeOrder = metrics?.activeOrder
    if (!activeOrder || !riderCoords?.latitude || !riderCoords?.longitude) {
      setActiveRouteInfo(null)
      return
    }

    const isPickupPhase = ["accepted", "arrived_kitchen"].includes(activeOrder.delivery_status)
    const targetLat = isPickupPhase ? (activeOrder.kitchen_latitude || activeOrder.kitchen_lat) : (activeOrder.delivery_latitude || activeOrder.delivery_lat)
    const targetLng = isPickupPhase ? (activeOrder.kitchen_longitude || activeOrder.kitchen_lng) : (activeOrder.delivery_longitude || activeOrder.delivery_lng)

    if (!targetLat || !targetLng) return

    const currentPhase = isPickupPhase ? "pickup" : "drop"
    const now = Date.now()
    const last = lastRouteFetchRef.current

    // Don't refetch full route on every 2-second GPS jitter!
    // Refetch ONLY if:
    // 1. Order changed or delivery status phase changed (pickup vs drop)
    // 2. OR Rider moved significantly (> 350 meters) from where route was last calculated AND at least 30s passed
    const isNewOrderOrPhase = last.orderId !== activeOrder.id || last.phase !== currentPhase
    const distFromLastFetch = (last.lat && last.lng)
      ? calculateDistanceKm(riderCoords.latitude, riderCoords.longitude, last.lat, last.lng)
      : 999
    const isSignificantMove = distFromLastFetch && Number(distFromLastFetch) >= 0.35 && (now - last.time) >= 30000

    if (!isNewOrderOrPhase && !isSignificantMove && activeRouteInfo) {
      return
    }

    lastRouteFetchRef.current = {
      lat: riderCoords.latitude,
      lng: riderCoords.longitude,
      time: now,
      orderId: activeOrder.id,
      phase: currentPhase,
    }

    let isSubscribed = true
    getRouteDetails(riderCoords.latitude, riderCoords.longitude, targetLat, targetLng)
      .then((res) => {
        if (isSubscribed && res) {
          setActiveRouteInfo({
            phase: currentPhase,
            distanceKm: res.distanceKm,
            durationText: res.durationText,
            encodedPolyline: res.encodedPolyline,
            steps: res.steps || []
          })
        }
      })
      .catch((err) => {
        console.warn("Could not fetch Google Route details:", err?.message)
      })

    return () => {
      isSubscribed = false
    }
  }, [
    metrics?.activeOrder?.id,
    metrics?.activeOrder?.delivery_status,
    metrics?.activeOrder?.kitchen_latitude,
    metrics?.activeOrder?.kitchen_longitude,
    metrics?.activeOrder?.delivery_latitude,
    metrics?.activeOrder?.delivery_longitude,
    riderCoords?.latitude,
    riderCoords?.longitude
  ])

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
  const [unreachableSecondsLeft, setUnreachableSecondsLeft] = useState(600)

  useEffect(() => {
    const activeOrder = metrics?.activeOrder
    if (!activeOrder || activeOrder.delivery_status !== "arrived_customer") {
      setUnreachableSecondsLeft(600)
      return
    }

    let arrivedTime = Date.now()
    const arrivedAtRaw = activeOrder.arrived_at_customer_at || activeOrder.updated_at
    if (arrivedAtRaw) {
      let str = String(arrivedAtRaw).replace(" ", "T")
      if (!str.includes("Z") && !str.includes("+")) str += "Z"
      const parsed = new Date(str).getTime()
      if (!isNaN(parsed)) arrivedTime = parsed
    }

    const computeRemaining = () => {
      const elapsed = Math.floor((Date.now() - arrivedTime) / 1000)
      return Math.max(0, 600 - Math.max(0, elapsed))
    }

    setUnreachableSecondsLeft(computeRemaining())

    const interval = setInterval(() => {
      const rem = computeRemaining()
      setUnreachableSecondsLeft(rem)
      if (rem <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    metrics?.activeOrder?.id,
    metrics?.activeOrder?.delivery_status,
    metrics?.activeOrder?.arrived_at_customer_at,
    metrics?.activeOrder?.updated_at,
  ])

  // Rider Payouts Modal States
  const [riderPayoutsModalVisible, setRiderPayoutsModalVisible] = useState(false)
  const [riderPayoutsList, setRiderPayoutsList] = useState([])
  const [riderPayoutsLoading, setRiderPayoutsLoading] = useState(false)
  const [hasNewPayout, setHasNewPayout] = useState(false)

  // Track if admin has settled a new payout that rider hasn't viewed yet
  useEffect(() => {
    async function checkUnseenPayout() {
      if (!metrics?.latestPayoutId) {
        setHasNewPayout(false)
        return
      }
      try {
        const lastSeen = await AsyncStorage.getItem("rider_last_seen_payout_id")
        if (!lastSeen) {
          if (Number(metrics.latestPayoutId) > 0 && Number(metrics.totalPayoutsCount || 0) > 0) {
            setHasNewPayout(true)
          }
        } else if (Number(metrics.latestPayoutId) > Number(lastSeen)) {
          setHasNewPayout(true)
        } else {
          setHasNewPayout(false)
        }
      } catch (e) {
        console.log("Error checking seen payout:", e)
      }
    }
    checkUnseenPayout()
  }, [metrics?.latestPayoutId, metrics?.totalPayoutsCount])

  const handleOpenRiderPayoutsModal = async () => {
    setRiderPayoutsModalVisible(true)
    setRiderPayoutsLoading(true)

    // Mark latest payout as seen so red badge clears immediately on rider click
    if (metrics?.latestPayoutId) {
      try {
        await AsyncStorage.setItem("rider_last_seen_payout_id", String(metrics.latestPayoutId))
        setHasNewPayout(false)
      } catch (e) {
        console.log("Failed to save seen payout:", e)
      }
    }

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
    await handleOrderAction(metrics.activeOrder.id, "cancel_doorstep", { note: unreachableNote, isUnreachable: true })
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

  // Ensure riderCoords immediately anchors to active city when city becomes available
  useEffect(() => {
    const activeCity = user?.city || tempCity
    if (activeCity) {
      const match = KNOWN_CITY_COORDINATES[activeCity.toLowerCase()]
      if (match && (!riderCoords || calculateDistanceKm(riderCoords.latitude, riderCoords.longitude, match.lat, match.lng) > 35)) {
        setRiderCoords({ latitude: match.lat, longitude: match.lng, heading: 0, speed: 0, isManual: true })
      }
    }
  }, [user?.city, tempCity])

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
      const cityCoords = await resolveCityCoordinates(tempCity, tempState)
      const lat = cityCoords?.lat || (tempCity && tempCity.toLowerCase() === "roha" ? 18.4372 : null)
      const lng = cityCoords?.lng || (tempCity && tempCity.toLowerCase() === "roha" ? 73.1084 : null)

      await api("/api/auth/location", {
        method: "PATCH",
        body: JSON.stringify({
          state: tempState,
          city: tempCity,
          stateIso: tempStateIso,
          latitude: lat,
          longitude: lng,
        }),
      })
      if (user) {
        user.city = tempCity
        user.state = tempState
      }

      if (lat && lng) {
        const manualCoords = {
          latitude: lat,
          longitude: lng,
          heading: 0,
          speed: 0,
          isManual: true,
          cityName: tempCity,
        }
        setRiderCoords(manualCoords)
        await updateRiderLocation(lat, lng).catch(() => {})
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

    let locationSubscription = null

    const trackRiderLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          console.warn("Rider location permission denied.")
          return
        }

        // Immediate initial high-accuracy lock
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          if (isMounted && loc?.coords) {
            let lat = loc.coords.latitude
            let lng = loc.coords.longitude
            let heading = loc.coords.heading || 0
            let speed = loc.coords.speed || 0

            const activeCity = user?.city || tempCity
            const activeOrder = metrics?.activeOrder
            const cityMatch = activeCity ? KNOWN_CITY_COORDINATES[activeCity.toLowerCase()] : null
            const refLat = cityMatch?.lat || activeOrder?.kitchen_latitude
            const refLng = cityMatch?.lng || activeOrder?.kitchen_longitude

            if (refLat && refLng) {
              const distFromRef = calculateDistanceKm(lat, lng, refLat, refLng)
              if (distFromRef && Number(distFromRef) > 35) {
                lat = Number(refLat)
                lng = Number(refLng)
              }
            }

            const coords = { latitude: lat, longitude: lng, heading, speed }
            setRiderCoords(coords)
            updateRiderLocation(lat, lng).catch(() => {})
          }
        } catch (initErr) {
          console.warn("Initial GPS lock fallback:", initErr.message)
        }

        // Real-time continuous GPS tracking (2.5s / 5m intervals)
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2500,
            distanceInterval: 5,
          },
          (currentLoc) => {
            if (isMounted && currentLoc?.coords) {
              let lat = currentLoc.coords.latitude
              let lng = currentLoc.coords.longitude
              let heading = currentLoc.coords.heading || 0
              let speed = currentLoc.coords.speed || 0

              const activeCity = user?.city || tempCity
              const activeOrder = metrics?.activeOrder
              const cityMatch = activeCity ? KNOWN_CITY_COORDINATES[activeCity.toLowerCase()] : null
              const refLat = cityMatch?.lat || activeOrder?.kitchen_latitude
              const refLng = cityMatch?.lng || activeOrder?.kitchen_longitude

              if (refLat && refLng) {
                const distFromRef = calculateDistanceKm(lat, lng, refLat, refLng)
                if (distFromRef && Number(distFromRef) > 35) {
                  lat = Number(refLat)
                  lng = Number(refLng)
                }
              }

              const newCoords = { latitude: lat, longitude: lng, heading, speed }
              setRiderCoords(newCoords)
              updateRiderLocation(lat, lng).catch(() => {})
            }
          }
        )

      } catch (err) {
        console.warn("Rider location tracking initialization error:", err.message)
      }
    }

    trackRiderLocation()

    return () => {
      isMounted = false
      if (locationSubscription) locationSubscription.remove()
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
        setIsNavigatingInApp(false)
        Alert.alert("Delivery Completed! 🎉", "Success! The order has been delivered successfully. Your delivery fee earnings have been credited to your wallet.")
      } else if (action === "cancel_doorstep") {
        setIsNavigatingInApp(false)
        Alert.alert("Success", res.message || "Order cancelled at doorstep successfully.")
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

  const handleCopyAddress = async (label, addressText) => {
    if (!addressText) return
    try {
      await Clipboard.setStringAsync(addressText)
      Alert.alert("Address Copied! 📋", `${label} address copied to clipboard.`)
    } catch (_) {
      Alert.alert("Notice", "Unable to copy address to clipboard.")
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

  // Note: InAppNavigationScreen is rendered as full-screen overlay in the main JSX tree so modals overlay properly

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
            <View style={{ flex: 1, paddingVertical: 14, alignItems: "center", gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <CheckCircle size={14} color="#0B6B3A" />
                <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>{metrics?.totalDeliveries || 0}</Text>
              </View>
              <Text style={{ fontSize: 10, color: "#8A8A8A", fontFamily: "Nunito" }}>Deliveries</Text>
            </View>

            <View style={{ width: 1, backgroundColor: "#F1F1EF" }} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenRiderPayoutsModal}
              style={{ flex: 1, paddingVertical: 14, alignItems: "center", gap: 3 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Wallet size={14} color="#059669" />
                <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#059669" }}>
                  ₹{metrics?.nextPayout ?? metrics?.unsettledEarnings ?? 0}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: "#059669", fontFamily: "Nunito", fontWeight: "600" }}>Next Payout</Text>
            </TouchableOpacity>

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
              style={{ flex: 1, paddingVertical: 14, alignItems: "center", gap: 3 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <CreditCard size={14} color={cashCollected > 0 ? "#F59E0B" : "#0B6B3A"} />
                <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>₹{cashCollected}</Text>
              </View>
              <Text style={{ fontSize: 10, color: cashCollected > 0 ? "#B7791F" : "#8A8A8A", fontFamily: "Nunito", fontWeight: cashCollected > 0 ? "bold" : "400" }}>
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
            borderColor: hasNewPayout ? "#FCA5A5" : "#E5E7EB",
            shadowColor: hasNewPayout ? "#EF4444" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: hasNewPayout ? 0.08 : 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
            <View style={{ position: "relative" }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: hasNewPayout ? "#FEE2E2" : "#ECFDF5",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: hasNewPayout ? "#FCA5A5" : "#A7F3D0"
              }}>
                <Wallet size={22} color={hasNewPayout ? "#DC2626" : "#059669"} />
              </View>
              {hasNewPayout && (
                <View style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: "#EF4444",
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: "#FFFFFF"
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", fontFamily: "Poppins", color: "#FFFFFF", lineHeight: 12 }}>
                    1
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }} numberOfLines={1}>
                Payouts & Bank Settlements
              </Text>
              {hasNewPayout ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#DC2626" }} />
                  <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#DC2626", fontWeight: "700" }}>
                    New transfer received · View UTR
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                  View all bank transfers & UTR receipts
                </Text>
              )}
            </View>
          </View>

          <View style={{ backgroundColor: "#059669", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}>
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
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Poppins", fontWeight: "600" }}>
                  #{metrics.activeOrder.order_number}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>
                  Payout: ₹{calculateRiderPayout(calculateDistanceKm(metrics.activeOrder.kitchen_latitude, metrics.activeOrder.kitchen_longitude, metrics.activeOrder.delivery_latitude, metrics.activeOrder.delivery_longitude), metrics.activeOrder.delivery_fee).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Progress stepper */}
            <DeliveryStepper currentStatus={metrics.activeOrder.delivery_status} />

            {/* Addresses info */}
            {(() => {
              const activeOrder = metrics.activeOrder
              const kitchenFullAddr = [activeOrder.kitchen_address, activeOrder.kitchen_city, activeOrder.kitchen_state, activeOrder.kitchen_pincode]
                .filter(Boolean)
                .join(", ")
              const customerFullAddr = [activeOrder.delivery_address, activeOrder.customer_city, activeOrder.customer_state, activeOrder.customer_pincode]
                .filter(Boolean)
                .join(", ")

              const isPickupDone = ["picked_up", "arrived_customer", "handover_pending"].includes(activeOrder.delivery_status)
              const effectiveRiderLat = riderCoords?.latitude || activeOrder.kitchen_latitude
              const effectiveRiderLng = riderCoords?.longitude || activeOrder.kitchen_longitude

              const pickupKm = (!isPickupDone && activeRouteInfo?.phase === "pickup" && activeRouteInfo?.distanceKm)
                ? String(activeRouteInfo.distanceKm)
                : calculateDistanceKm(
                    effectiveRiderLat,
                    effectiveRiderLng,
                    activeOrder.kitchen_latitude,
                    activeOrder.kitchen_longitude
                  )
              const dropKm = (isPickupDone && activeRouteInfo?.phase === "drop" && activeRouteInfo?.distanceKm)
                ? String(activeRouteInfo.distanceKm)
                : calculateDistanceKm(
                    isPickupDone ? effectiveRiderLat : activeOrder.kitchen_latitude,
                    isPickupDone ? effectiveRiderLng : activeOrder.kitchen_longitude,
                    activeOrder.delivery_latitude,
                    activeOrder.delivery_longitude
                  )
              const totalKm = pickupKm && dropKm
                ? (Number(pickupKm) + Number(dropKm)).toFixed(1)
                : (pickupKm || dropKm || null)

              return (
                <View style={{ gap: 12 }}>
                  {/* Transparent Split Distance Breakdown */}
                  <TripDistanceBreakdown
                    pickupKm={pickupKm}
                    dropKm={dropKm}
                    totalKm={totalKm}
                    isPickupDone={isPickupDone}
                  />

                  {/* 2-Step In-App Route & Google Navigation */}
                  <InAppRouteNavigation
                    order={activeOrder}
                    riderCoords={riderCoords}
                    routeInfo={activeRouteInfo}
                    onStartNavigation={() => setIsNavigatingInApp(true)}
                  />
                  {/* Pickup Kitchen */}
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0B6B3A", marginTop: 6 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                        <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito" }}>Pickup Kitchen</Text>
                        {pickupKm && (
                          <Text style={{ fontSize: 10.5, color: "#0B6B3A", fontFamily: "Nunito", fontWeight: "bold" }}>
                            ~{pickupKm} km away
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                        {activeOrder.kitchen_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito", marginTop: 2, lineHeight: 17 }}>
                        {kitchenFullAddr || activeOrder.kitchen_address || "Address not provided"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleCopyAddress("Kitchen", kitchenFullAddr || activeOrder.kitchen_address)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#EAF7EE",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#B7E4C7"
                        }}
                      >
                        <Copy size={15} color="#0B6B3A" />
                      </TouchableOpacity>
                      {activeOrder.kitchen_phone ? (
                        <TouchableOpacity
                          onPress={() => handleCall(activeOrder.kitchen_phone)}
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

                  <View style={{ height: 1, backgroundColor: "#E8E8E8", marginVertical: 2 }} />

                  {/* Drop Customer */}
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF6B00", marginTop: 6 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                        <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito" }}>Drop Address</Text>
                        {dropKm && (
                          <Text style={{ fontSize: 10.5, color: "#FF6B00", fontFamily: "Nunito", fontWeight: "bold" }}>
                            ~{dropKm} km away
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                        {activeOrder.customer_name || "Customer"}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito", marginTop: 2, lineHeight: 17 }}>
                        {customerFullAddr || activeOrder.delivery_address || "Address not provided"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleCopyAddress("Customer", customerFullAddr || activeOrder.delivery_address)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#FFF1E6",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#FFD8BF"
                        }}
                      >
                        <Copy size={15} color="#FF6B00" />
                      </TouchableOpacity>
                      {activeOrder.customer_phone ? (
                        <TouchableOpacity
                          onPress={() => handleCall(activeOrder.customer_phone)}
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
                </View>
              )
            })()}

            {/* Cash details */}
            <View style={{ backgroundColor: "#F8F8F5", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: "#4A4A4A", fontFamily: "Nunito" }}>Payment Method:</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: metrics.activeOrder.payment_method === "cod" ? "#EF4444" : "#0B6B3A", fontFamily: "Poppins" }}>
                {metrics.activeOrder.payment_method === "cod" ? `COLLECT CASH: ₹${metrics.activeOrder.remaining_amount !== undefined ? metrics.activeOrder.remaining_amount : metrics.activeOrder.grand_total}` : "PREPAID - DO NOT COLLECT CASH"}
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
                  {!Boolean(
                    metrics.activeOrder.is_rescue === 1 ||
                    (metrics.activeOrder.original_order_id && Number(metrics.activeOrder.original_order_id) > 0) ||
                    metrics.activeOrder.delivery_status === "rescue_claimed"
                  ) && (
                    <TouchableOpacity
                      onPress={handleCancelDoorstepPress}
                      disabled={actionLoading}
                      style={{ borderWidth: 1.5, borderColor: "#EF4444", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                    >
                      <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel at Doorstep (Customer Paid)</Text>
                    </TouchableOpacity>
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
                  {!Boolean(
                    metrics.activeOrder.is_rescue === 1 ||
                    (metrics.activeOrder.original_order_id && Number(metrics.activeOrder.original_order_id) > 0) ||
                    metrics.activeOrder.delivery_status === "rescue_claimed"
                  ) && (
                    <TouchableOpacity
                      onPress={handleCancelDoorstepPress}
                      disabled={actionLoading}
                      style={{ borderWidth: 1.5, borderColor: "#EF4444", paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: actionLoading ? 0.7 : 1 }}
                    >
                      <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel at Doorstep (Customer Paid)</Text>
                    </TouchableOpacity>
                  )}

                  {/* Customer Unreachable button with 10-minute countdown */}
                  {unreachableSecondsLeft > 0 ? (
                    <View
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#D1D5DB",
                        backgroundColor: "#F3F4F6",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#6B7280", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                        Customer Unreachable? (Wait {Math.floor(unreachableSecondsLeft / 60).toString().padStart(2, "0")}:{(unreachableSecondsLeft % 60).toString().padStart(2, "0")})
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setUnreachableModalVisible(true)}
                      disabled={actionLoading}
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#F59E0B",
                        backgroundColor: "#FEF3C7",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        opacity: actionLoading ? 0.7 : 1,
                      }}
                    >
                      <Text style={{ color: "#B45309", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                        Customer Unreachable? (Cancel Order)
                      </Text>
                    </TouchableOpacity>
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
                    Please hand over the collected cash of ₹{metrics.activeOrder.remaining_amount !== undefined ? metrics.activeOrder.remaining_amount : metrics.activeOrder.grand_total} to the kitchen owner ({metrics.activeOrder.kitchen_name || "Kitchen"}).
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
                    {(() => {
                      const pickupDistance = calculateDistanceKm(
                        riderCoords?.latitude,
                        riderCoords?.longitude,
                        order.kitchen_latitude,
                        order.kitchen_longitude
                      )
                      const dropDistance = calculateDistanceKm(
                        order.kitchen_latitude,
                        order.kitchen_longitude,
                        order.delivery_latitude,
                        order.delivery_longitude
                      )
                      const totalDistance = pickupDistance && dropDistance
                        ? (Number(pickupDistance) + Number(dropDistance)).toFixed(1)
                        : (pickupDistance || dropDistance || null)

                      const kitchenFullAddr = [order.kitchen_address, order.kitchen_city, order.kitchen_state, order.kitchen_pincode]
                        .filter(Boolean)
                        .join(", ")
                      const customerFullAddr = [order.delivery_address, order.customer_city, order.customer_state, order.customer_pincode]
                        .filter(Boolean)
                        .join(", ")

                      return (
                        <>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFF1E6", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                                <Zap size={9} color="#FF6B00" />
                                <Text style={{ fontSize: 9, color: "#FF6B00", fontFamily: "Poppins", fontWeight: "bold" }}>NEW</Text>
                              </View>
                              <Text style={{ fontSize: 12, color: "#7A7A7A", fontFamily: "Poppins" }}>#{order.order_number}</Text>
                              {totalDistance && (
                                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 3 }}>
                                  <Navigation size={9} color="#0B6B3A" />
                                  <Text style={{ fontSize: 10, color: "#0B6B3A", fontFamily: "Poppins", fontWeight: "bold" }}>~{totalDistance} km</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontSize: 9.5, color: "#9E9E9E", fontFamily: "Nunito" }}>Estimated payout</Text>
                              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>
                                ₹{calculateRiderPayout(dropDistance, order.delivery_fee).toFixed(2)}
                              </Text>
                              <Text style={{ fontSize: 8.5, color: "#7A7A7A", fontFamily: "Nunito", marginTop: 1 }}>
                                ₹20 pickup + ₹{(order.delivery_fee && Number(order.delivery_fee) > 0 ? Number(order.delivery_fee) : calculateDeliveryCharge(dropDistance)).toFixed(0)} drop
                              </Text>
                            </View>
                          </View>

                          <View style={{ height: 1, backgroundColor: "#F1F1EF" }} />

                          {/* Split Distance Breakdown */}
                          <TripDistanceBreakdown
                            pickupKm={pickupDistance}
                            dropKm={dropDistance}
                            totalKm={totalDistance}
                          />

                          {/* Full Addresses with Distance */}
                          <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                              <View style={{ marginTop: 2 }}>
                                <MapPin size={15} color="#0B6B3A" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                                  <Text style={{ fontSize: 12.5, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                                    Pickup: {order.kitchen_name}
                                  </Text>
                                  {pickupDistance && (
                                    <Text style={{ fontSize: 10.5, color: "#0B6B3A", fontFamily: "Nunito", fontWeight: "bold" }}>
                                      {pickupDistance} km away
                                    </Text>
                                  )}
                                </View>
                                <Text style={{ fontSize: 11.5, color: "#555555", fontFamily: "Nunito", marginTop: 2, lineHeight: 16 }}>
                                  {kitchenFullAddr || order.kitchen_address || "Address not provided"}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                              <View style={{ marginTop: 2 }}>
                                <MapPin size={15} color="#FF6B00" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                                  <Text style={{ fontSize: 12.5, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                                    Drop: {order.customer_name || "Customer"}
                                  </Text>
                                  {dropDistance && (
                                    <Text style={{ fontSize: 10.5, color: "#FF6B00", fontFamily: "Nunito", fontWeight: "bold" }}>
                                      {dropDistance} km delivery
                                    </Text>
                                  )}
                                </View>
                                <Text style={{ fontSize: 11.5, color: "#555555", fontFamily: "Nunito", marginTop: 2, lineHeight: 16 }}>
                                  {customerFullAddr || order.delivery_address || "Address not provided"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </>
                      )
                    })()}

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

      {/* Full-Screen Edge-to-Edge In-App Navigation Overlay */}
      {isNavigatingInApp && metrics?.activeOrder && (
        <InAppNavigationScreen
          order={metrics.activeOrder}
          riderCoords={riderCoords}
          setRiderCoords={setRiderCoords}
          routeInfo={activeRouteInfo}
          onClose={() => setIsNavigatingInApp(false)}
          handleOrderAction={handleOrderAction}
          onCompleteDeliveryPress={handleCompleteDeliveryPress}
          onCancelDoorstepPress={handleCancelDoorstepPress}
          actionLoading={actionLoading}
          otpInput={otpInput}
          setOtpInput={setOtpInput}
          handleCall={handleCall}
          updateRiderLocationOnServer={updateRiderLocation}
        />
      )}

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
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 20,
            width: "100%",
            maxWidth: 350,
            maxHeight: "92%",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10
          }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center", width: "100%" }}
              style={{ width: "100%" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center", marginBottom: 2 }}>
                {qrModalConfig?.title || "Scan & Pay"}
              </Text>
              <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", textAlign: "center", marginBottom: 12 }}>
                Show this QR code to the customer to scan
              </Text>

              {qrModalConfig && (
                <View style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 10,
                  elevation: 3,
                  width: 250,
                }}>
                  {/* Standee Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#0C2340", fontFamily: "Poppins" }}>
                      Powered by <Text style={{ color: "#0B72E7" }}>Razorpay</Text>
                    </Text>
                    <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", fontFamily: "Poppins" }}>BHIM UPI</Text>
                    </View>
                  </View>

                  {/* Real Razorpay Dynamic UPI QR with Order Amount */}
                  <View style={{ padding: 8, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB" }}>
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                          `upi://pay?cu=INR&mc=5817&mode=19&pa=elifeloprivatel145363.rzp@rxairtel&pn=ELIFELO%20PRIVATE%20LIMITED&am=${qrModalConfig.amount || 0}&tn=Payment%20To%20ELIFELO%20PRIVATE%20LIMITED&tr=Tr1YqpqixdypvTqrv2`
                        )}`
                      }}
                      style={{ width: 200, height: 200, borderRadius: 8 }}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Standee Footer */}
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#111827", fontFamily: "Poppins", textAlign: "center", marginTop: 12 }}>
                    ELIFELO PRIVATE LIMITED
                  </Text>
                  <Text style={{ fontSize: 10, color: "#6B7280", fontFamily: "Nunito", textAlign: "center", marginTop: 2 }}>
                    Scan & Pay with GPay / PhonePe / Paytm
                  </Text>
                </View>
              )}

              <Text style={{ fontSize: 12, color: "#8A8A8A", fontFamily: "Nunito" }}>Total Amount to Collect</Text>
              <Text style={{ fontSize: 30, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A", marginTop: 2, marginBottom: 16 }}>
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

              <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 4 }}>
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
            </ScrollView>
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
                riderPayoutsList.map((p) => {
                  const gross = Number(p.grossAmount) || Number(p.netPayout)
                  const deductions = Number(p.commissionDeduction) || 0
                  return (
                    <View key={p.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 }}>
                      {/* Header: Net Paid Amount & Status */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 8 }}>
                        <View>
                          <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#6B7280", textTransform: "uppercase", fontWeight: "600" }}>
                            Net Bank Settlement
                          </Text>
                          <Text style={{ fontSize: 18, fontWeight: "bold", fontFamily: "Poppins", color: "#059669" }}>
                            ₹{p.netPayout}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", fontFamily: "Poppins", color: "#065F46" }}>
                            PAID ✅
                          </Text>
                        </View>
                      </View>

                      {/* Transparent Breakdown */}
                      <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, gap: 4 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>Delivery Fees Earned:</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#111827" }}>₹{gross}</Text>
                        </View>
                        {deductions > 0 ? (
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>Cash / Deductions Adjusted:</Text>
                            <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#DC2626" }}>-₹{deductions}</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563" }}>Platform Commission:</Text>
                            <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "600", color: "#059669" }}>₹0 (Free)</Text>
                          </View>
                        )}
                      </View>

                      {/* Bank & UTR Reference */}
                      <View style={{ gap: 2 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#6B7280" }}>UTR Reference:</Text>
                          <Text style={{ fontSize: 11, fontWeight: "bold", fontFamily: "monospace", color: "#1F2937" }}>
                            {p.utrNumber || "—"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#6B7280" }}>Paid on:</Text>
                          <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#4B5563" }}>
                            {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "—"}
                          </Text>
                        </View>
                      </View>

                      {/* Admin Note / Remarks */}
                      {p.notes ? (
                        <View style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 8, padding: 8 }}>
                          <Text style={{ fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", color: "#92400E", textTransform: "uppercase" }}>
                            💬 ADMIN NOTE:
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#78350F", marginTop: 2 }}>
                            {p.notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )
                })
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
