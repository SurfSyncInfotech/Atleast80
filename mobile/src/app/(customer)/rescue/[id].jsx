import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, MapPin, ChefHat, Bike, Heart } from "lucide-react-native"
import { api } from "../../../lib/api"
import { useAuth } from "../../../context/AuthContext"

// Custom Alert wrapper to support React Native Web / Browser environment
const Alert = {
  alert: (title, message) => {
    if (Platform.OS === "web") {
      window.alert(title ? `${title}\n\n${message || ""}` : message)
    } else {
      const { Alert: RNAlert } = require("react-native")
      RNAlert.alert(title, message)
    }
  }
}

export default function RescueDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")

  const loadRescueOrder = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await api(`/api/orders/rescue/${id}`)
      setOrder(res.order)
    } catch (err) {
      console.warn("Failed to load rescue order details:", err)
      setError(err.message || "Rescue order is no longer available.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadRescueOrder()
  }, [id])

  const handleClaimOrder = async () => {
    if (!order) return
    try {
      setClaiming(true)
      const res = await api(`/api/orders/rescue/${order.id}/claim`, {
        method: "POST",
      })
      Alert.alert("Rescue Claimed! 🎉", "Your food rescue has been accepted with FREE Delivery. Track your delivery partner in real-time.")
      
      // Redirect to the customer orders details screen to show progress and OTP
      if (res.order && res.order.id) {
        router.replace(`/(customer)/orders/${res.order.id}`)
      } else {
        router.replace("/(customer)/(tabs)/orders")
      }
    } catch (err) {
      Alert.alert("Claim Failed ❌", err.message || "Failed to claim this rescue order. It might have been claimed by another user.")
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0B6B3A" />
      </SafeAreaView>
    )
  }

  if (error || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/(tabs)/home"))} style={{ padding: 8, borderRadius: 12, backgroundColor: "#F5F5F3" }}>
            <ArrowLeft size={20} color="#1F1F1F" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 16, color: "#1F1F1F", fontFamily: "Poppins" }}>Food Rescue Details</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, gap: 16 }}>
          <Text style={{ fontSize: 24, color: "#EF4444" }}>🛑</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center" }}>
            {error || "This rescue order is no longer available."}
          </Text>
          <Text style={{ fontSize: 13, color: "#7A7A7A", fontFamily: "Nunito", textAlign: "center" }}>
            No nearby active rescue food was found matching this notification link. It may have expired or been claimed by another customer.
          </Text>
          <TouchableOpacity 
            onPress={() => router.replace("/(customer)/(tabs)/home")}
            style={{ backgroundColor: "#0B6B3A", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, marginTop: 12 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>Go to Homepage</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const deliveryAddress = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ") || "Address not set"
  const originalGrandTotal = Number(order.grandTotal || order.itemTotal || 0)
  const deliveryDiscount = 30.00
  const grandTotal = Math.max(0, originalGrandTotal - deliveryDiscount)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFC" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F1F1F1", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/(tabs)/home"))} style={{ padding: 8, borderRadius: 12, backgroundColor: "#F5F5F3" }}>
          <ArrowLeft size={20} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 16, color: "#1F1F1F", fontFamily: "Poppins" }}>Claim Food Rescue</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={{ backgroundColor: "#EAF7EE", borderWidth: 1.5, borderColor: "#A3D3B8", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 24 }}>🍕</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>FREE Delivery Applied!</Text>
            <Text style={{ fontSize: 12, color: "#0B6B3A", fontFamily: "Nunito" }}>Rescue this fresh meal from going to waste. Delivery charges are completely waived!</Text>
          </View>
        </View>

        {/* Kitchen card */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 12, marginBottom: 16, borderWidth: 1, borderColor: "#EAEAEA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: "#FFF5EB", padding: 8, borderRadius: 12 }}>
              <ChefHat size={20} color="#FF6B00" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>{order.kitchenName}</Text>
              <Text style={{ fontSize: 12, color: "#7A7A7A", fontFamily: "Nunito" }}>{order.kitchenAddress}</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 12, marginBottom: 16, borderWidth: 1, borderColor: "#EAEAEA" }}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", borderBottomWidth: 1, borderBottomColor: "#F5F5F5", paddingBottom: 8 }}>Order Items</Text>
          {order.items?.map((item, idx) => (
            <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: "#4A4A4A", fontFamily: "Nunito", flex: 1 }}>
                <Text style={{ fontWeight: "bold", color: "#1F1F1F" }}>{item.qty}x</Text>  {item.name}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>₹{Number(item.price) * item.qty}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Address Details */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 10, marginBottom: 16, borderWidth: 1, borderColor: "#EAEAEA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MapPin size={18} color="#0B6B3A" />
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Delivering To Address</Text>
          </View>
          <Text style={{ fontSize: 13, color: "#4A4A4A", fontFamily: "Nunito", lineHeight: 18 }}>
            {deliveryAddress}
          </Text>
          <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", fontStyle: "italic" }}>
            Note: The rider will arrive directly at this doorstep address. Make sure it is correct.
          </Text>
        </View>

        {/* Price Details */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 12, marginBottom: 24, borderWidth: 1, borderColor: "#EAEAEA" }}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", borderBottomWidth: 1, borderBottomColor: "#F5F5F5", paddingBottom: 8 }}>Payment Details</Text>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: "#7A7A7A", fontFamily: "Nunito" }}>Original Order Amount</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Nunito" }}>₹{originalGrandTotal}</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#7A7A7A", fontFamily: "Nunito" }}>Food Rescue Free Delivery Discount</Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#EF4444", textDecorationLine: "line-through", fontFamily: "Nunito" }}>₹30</Text>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Nunito" }}>-₹30 (FREE)</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F5F5F5", paddingTop: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Grand Total Payable</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins" }}>₹{grandTotal}</Text>
          </View>
        </View>

        {/* Claim button */}
        <TouchableOpacity
          onPress={handleClaimOrder}
          disabled={claiming}
          style={{
            backgroundColor: "#0B6B3A",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            opacity: claiming ? 0.7 : 1,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          {claiming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
              Claim Rescue Order (Cash on Delivery)
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
