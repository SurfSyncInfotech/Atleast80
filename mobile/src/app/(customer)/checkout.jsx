import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, CheckCircle, X, QrCode, ShieldCheck } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../components/ui/Button"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

export default function CheckoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const { cart, itemCount, total, clearCart } = useCart()
  const [payment, setPayment] = useState("")
  const [upiModalVisible, setUpiModalVisible] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const packingType = params?.packing || "standard"
  const deliveryMethod = params?.delivery || "free"
  const packingFee = Number(params?.packingCost || 0)
  const deliveryFee = Number(params?.deliveryCost || 0)
  const grandTotal = total + packingFee + deliveryFee

  const kitchenId = cart[0]?.kitchenId
  const deliveryAddress = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ")

  useEffect(() => {
    if (cart.length === 0 && !orderPlaced) {
      router.replace("/(customer)/cart")
    }
  }, [cart, orderPlaced, router])

  const executeOrderPlacement = async (selectedPayment) => {
    setLoading(true)
    setError("")
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          kitchenId,
          items: cart.map((item) => ({
            id: item.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            image: item.image,
          })),
          paymentMethod: selectedPayment,
          packingType,
          deliveryMethod,
          packingFee,
          deliveryFee,
          deliveryAddress,
        }),
      })

      setUpiModalVisible(false)
      setOrderPlaced(true)
      clearCart()
      setTimeout(() => {
        router.replace(`/(customer)/orders/${data.order.id}`)
      }, 2000)
    } catch (err) {
      setError(err.message || "Failed to place order")
      setUpiModalVisible(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = () => {
    if (!payment) {
      setError("Please select a payment method (UPI / Google Pay or Cash on Delivery) to proceed.")
      return
    }
    if (!kitchenId) {
      setError("Missing kitchen information. Please add items from a kitchen page.")
      return
    }
    if (!deliveryAddress) {
      setError("Please add a delivery address in your Profile before placing an order.")
      return
    }

    if (payment === "upi") {
      setUpiModalVisible(true)
    } else {
      executeOrderPlacement("cod")
    }
  }

  if (cart.length === 0 && !orderPlaced) return null

  return (
    <SafeAreaView className="flex-1 bg-cream relative" edges={["top"]}>
      {/* Success Overlay Modal */}
      {orderPlaced ? (
        <LinearGradient
          colors={["#0B6B3A", "#064d29", "#04331b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0 items-center justify-center z-50 px-6"
        >
          <View className="bg-white/10 rounded-full p-6 mb-6 border border-white/10 shadow-sm">
            <CheckCircle size={84} color="#FFFFFF" strokeWidth={1.5} />
          </View>
          <Text className="font-poppins font-bold text-white text-3xl mt-2 text-center">Order Placed!</Text>
          <Text className="font-nunito text-white/80 text-base mt-2 text-center max-w-xs leading-relaxed">
            Your food is being prepared with pure love and hygiene.
          </Text>
        </LinearGradient>
      ) : null}

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-lg text-dark">Checkout</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 mt-4">
        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="font-nunito text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Delivery Address Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
              <MapPin size={20} color="#0B6B3A" />
            </View>
            <View className="flex-1">
              <Text className="font-poppins font-semibold text-sm text-dark">Delivery Address</Text>
              <Text className="font-nunito text-gray text-xs mt-1 leading-5">
                {deliveryAddress || "Add your address in Profile for delivery"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(customer)/profile")}>
              <Text className="text-primary text-xs font-semibold underline">
                {deliveryAddress ? "Change" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Estimated Delivery Time */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-secondary/20 items-center justify-center">
              <Clock size={20} color="#1F1F1F" />
            </View>
            <View>
              <Text className="font-poppins font-semibold text-sm text-dark">Estimated Delivery</Text>
              <Text className="font-nunito text-gray text-xs mt-0.5">30-45 minutes</Text>
            </View>
          </View>
        </View>

        {/* Payment Method Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-50">
          <Text className="font-poppins font-semibold text-sm text-dark mb-3">Payment Method</Text>
          <View className="space-y-2">
            {[
              { id: "upi", label: "UPI / Google Pay", icon: Wallet },
              { id: "cod", label: "Cash on Delivery", icon: CreditCard },
            ].map((opt) => {
              const Icon = opt.icon
              const active = payment === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setPayment(opt.id)}
                  activeOpacity={0.8}
                  className={`flex-row items-center gap-3.5 p-4 rounded-2xl border-2 mb-2 ${
                    active ? "bg-primary/5 border-primary" : "bg-white border-gray-100"
                  }`}
                >
                  <View className={`w-9 h-9 rounded-lg items-center justify-center ${active ? "bg-primary" : "bg-gray-100"}`}>
                    <Icon size={18} color={active ? "#FFFFFF" : "#7A7A7A"} />
                  </View>
                  <Text className="font-poppins font-bold text-sm text-dark mt-0.5">{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Items List */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="font-poppins font-semibold text-sm text-dark mb-3">Your Items</Text>
          <View className="space-y-2">
            {cart.map((item) => (
              <View key={item.id} className="flex-row items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <Image
                  source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" }}
                  className="w-10 h-10 rounded-lg bg-gray-100"
                  resizeMode="cover"
                />
                <View className="flex-1 min-w-0">
                  <Text className="font-nunito text-sm text-dark truncate">{item.name}</Text>
                  <Text className="text-xs text-gray">x{item.qty}</Text>
                </View>
                <Text className="font-poppins font-semibold text-sm text-dark">₹{item.price * item.qty}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-28">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Order Summary</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Items ({itemCount})</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{total}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Packing</Text>
              <Text className="font-nunito text-sm text-dark font-medium">
                {packingFee === 0 ? "Free" : `₹${packingFee}`}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Delivery</Text>
              <Text className="font-nunito text-sm text-dark font-medium">
                {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
              </Text>
            </View>
            <View className="border-t border-gray-100 pt-3 flex-row justify-between">
              <Text className="font-poppins font-bold text-dark text-base">Total</Text>
              <Text className="font-poppins font-bold text-dark text-lg">₹{grandTotal}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order CTA Bottom bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 shadow-2xl">
        <Button onPress={handlePlaceOrder} size="lg" className="w-full h-12" loading={loading}>
          <Text className="text-white text-base font-bold">
            {loading ? "Placing order..." : `Place Order - ₹${grandTotal}`}
          </Text>
        </Button>
      </View>

      {/* UPI / Google Pay Payment Modal */}
      <Modal visible={upiModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUpiModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                  <Wallet size={20} color="#0B6B3A" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>Pay via UPI / Google Pay</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A" }}>Instant & Secure Payment</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setUpiModalVisible(false)}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#64748B" }}>Total Payable Amount</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A", marginVertical: 4 }}>₹{grandTotal}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <ShieldCheck size={14} color="#10B981" />
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#10B981", fontWeight: "600" }}>Secured by Atleast80 UPI Gateway</Text>
              </View>
            </View>

            <View style={{ marginBottom: 24, gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", fontFamily: "Poppins", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>Select UPI App</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {["Google Pay", "PhonePe", "Paytm", "BHIM"].map((appName) => (
                  <View key={appName} style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", fontFamily: "Poppins", color: "#1E293B" }}>{appName}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => executeOrderPlacement("upi")}
              disabled={loading}
              style={{
                backgroundColor: "#0B6B3A",
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                  Verify & Pay ₹{grandTotal}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
