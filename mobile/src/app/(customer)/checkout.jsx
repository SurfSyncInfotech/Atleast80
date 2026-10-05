import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Platform } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, CheckCircle, X, QrCode, ShieldCheck } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../components/ui/Button"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { getLocationPreference } from "../../lib/locationPreference"

let WebViewComponent = null
if (Platform.OS !== "web") {
  try {
    WebViewComponent = require("react-native-webview").WebView
  } catch (e) {
    console.warn("react-native-webview not loaded", e)
  }
}

export default function CheckoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const { cart, clearCart, clearKitchenCart, removeClosedOfferItems, closedOfferItems, syncAvailability } = useCart()
  const [payment, setPayment] = useState("")
  const [upiModalVisible, setUpiModalVisible] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [headerAddrStr, setHeaderAddrStr] = useState("")

  const [kitchenCity, setKitchenCity] = useState("")
  const [kitchenName, setKitchenName] = useState(params?.kitchenName || "")

  const targetKitchenId = params?.kitchenId || cart[0]?.kitchenId
  const checkoutItems = cart.filter(
    (item) => String(item.kitchenId || item.kitchen_id) === String(targetKitchenId)
  )
  const itemsToOrder = checkoutItems.length > 0 ? checkoutItems : cart

  const checkoutItemCount = itemsToOrder.reduce((sum, item) => sum + item.qty, 0)
  const checkoutItemTotal = itemsToOrder.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)

  const packingType = params?.packing || "standard"
  const deliveryMethod = params?.delivery || "free"
  const packingFee = Number(params?.packingCost || 0)
  const deliveryFee = Number(params?.deliveryCost || 0)
  const festivalDiscount = Number(
    itemsToOrder.reduce((sum, item) => {
      if (item.isOfferActive === false) return sum
      if (item.offerPrice && Number(item.offerPrice) < Number(item.price)) {
        return sum + (Number(item.price) - Number(item.offerPrice)) * Number(item.qty)
      }
      if (item.discountPercent && Number(item.discountPercent) > 0) {
        return sum + (Number(item.price) * Number(item.qty) * Number(item.discountPercent)) / 100
      }
      return sum
    }, 0).toFixed(2)
  )

  const gstAmount = Number(
    itemsToOrder.reduce((sum, item) => {
      const isGrocery = item.category === "grocery"
      const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
      const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
      const effectivePrice = (item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
      return sum + (effectivePrice * Number(item.qty) * (rate / 100))
    }, 0).toFixed(2)
  )
  const grandTotal = Number((Math.max(0, checkoutItemTotal - festivalDiscount) + gstAmount + packingFee + deliveryFee).toFixed(2))

  const kitchenId = targetKitchenId
  const profileAddrStr = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ")
  const deliveryAddress = profileAddrStr || headerAddrStr

  useEffect(() => {
    getLocationPreference().then((pref) => {
      if (pref) {
        const parts = [pref.address || pref.suburb, pref.city, pref.state, pref.pincode].filter(Boolean)
        if (parts.length > 0) {
          setHeaderAddrStr(parts.join(", "))
        }
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (kitchenId) {
      api(`/api/kitchens/${kitchenId}`)
        .then((res) => {
          if (res?.kitchen) {
            setKitchenCity(res.kitchen.city || "")
            if (!kitchenName) {
              setKitchenName(res.kitchen.name || "")
            }
          }
        })
        .catch(() => {})
    }
  }, [kitchenId, kitchenName])

  const cartItemIdsKey = cart.map((i) => i.id).join(",")

  useEffect(() => {
    const itemIds = cart.map((i) => i.id).filter(Boolean)
    if (itemIds.length === 0) return

    const syncMenu = () => {
      api("/api/menu/check-availability", {
        method: "POST",
        body: JSON.stringify({ itemIds }),
      })
        .then((res) => {
          if (res) {
            syncAvailability(res)
          }
        })
        .catch(() => {})
    }

    syncMenu()
    const interval = setInterval(syncMenu, 3000)
    return () => clearInterval(interval)
  }, [cartItemIdsKey, syncAvailability])

  const hasUnavailableItems = cart.some(
    (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false
  )

  const custCityNorm = (user?.city || headerAddrStr?.split(",")?.slice(-3)?.[0] || "").trim().toLowerCase()
  const kitCityNorm = (kitchenCity || "").trim().toLowerCase()
  const isDeliveryUnavailable = deliveryMethod !== "self" && Boolean(custCityNorm) && Boolean(kitCityNorm) && custCityNorm !== kitCityNorm

  useEffect(() => {
    if (cart.length === 0 && !orderPlaced && !loading) {
      router.replace("/cart")
    }
  }, [cart.length, orderPlaced, loading, router])

  const [rzpData, setRzpData] = useState(null)
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false)

  const executeOrderPlacement = async (selectedPayment, paymentRef = null) => {
    setLoading(true)
    setError("")
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          kitchenId,
          items: itemsToOrder.map((item) => ({
            id: item.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            image: item.image,
            category: item.category,
            gst_rate: item.gst_rate,
            offerPrice: item.isOfferActive !== false ? item.offerPrice : null,
            discountPercent: item.isOfferActive !== false ? item.discountPercent : 0,
          })),
          festivalDiscount,
          paymentMethod: selectedPayment,
          packingType,
          deliveryMethod,
          packingFee,
          deliveryFee,
          deliveryAddress,
        }),
      })

      setUpiModalVisible(false)
      setRazorpayModalVisible(false)
      setOrderPlaced(true)
      
      const newOrderId = data?.order?.id

      if (paymentRef && newOrderId) {
        await api("/api/payments/razorpay/verify", {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: paymentRef.razorpay_order_id,
            razorpay_payment_id: paymentRef.razorpay_payment_id,
            razorpay_signature: paymentRef.razorpay_signature,
            orderId: newOrderId,
          }),
        }).catch(() => {})
      }

      setTimeout(() => {
        router.replace({
          pathname: "/orders/[id]",
          params: { id: String(newOrderId) }
        })
        setTimeout(() => {
          if (itemsToOrder.length === cart.length) {
            clearCart()
          } else {
            clearKitchenCart(kitchenId)
          }
        }, 300)
      }, 2500)
    } catch (err) {
      setError(err.message || "Failed to place order")
      setUpiModalVisible(false)
      setRazorpayModalVisible(false)
      // If offer was closed or updated, trigger an availability/offer refresh
      const itemIds = cart.map((i) => i.id).filter(Boolean)
      if (itemIds.length > 0) {
        api("/api/menu/check-availability", { method: "POST", body: JSON.stringify({ itemIds }) })
          .then((res) => { if (res) syncAvailability(res) })
          .catch(() => {})
      }
    } finally {
      setLoading(false)
    }
  }

  const initiateRazorpayPayment = async (payAmount, targetMethod) => {
    setLoading(true)
    setError("")
    try {
      const rzpRes = await api("/api/payments/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({
          amount: payAmount,
          kitchenId,
          deliveryMethod,
          festivalDiscount,
          hasOffer: festivalDiscount > 0,
        }),
      })

      if (!rzpRes || !rzpRes.rzpOrderId) {
        throw new Error("Failed to create Razorpay payment order")
      }

      setRzpData({ ...rzpRes, targetMethod })
      setUpiModalVisible(false)

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          const loadScript = () =>
            new Promise((resolve) => {
              if (window.Razorpay) return resolve(true)
              const script = document.createElement("script")
              script.src = "https://checkout.razorpay.com/v1/checkout.js"
              script.onload = () => resolve(true)
              script.onerror = () => resolve(false)
              document.body.appendChild(script)
            })
          const loaded = await loadScript()
          if (loaded && window.Razorpay) {
            const options = {
              key: rzpRes.keyId,
              amount: rzpRes.amount,
              currency: rzpRes.currency || "INR",
              name: "Atleast80",
              description: "Order Payment",
              order_id: rzpRes.rzpOrderId,
              handler: async (response) => {
                await executeOrderPlacement(targetMethod, response)
              },
              modal: {
                ondismiss: () => setLoading(false),
              },
              prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.phone || "",
              },
              theme: { color: "#0B6B3A" },
            }
            const rzp = new window.Razorpay(options)
            rzp.on("payment.failed", (res) => {
              setError(`Payment Failed: ${res.error?.description || ""}`)
              setLoading(false)
            })
            rzp.open()
            return
          }
        }
      }

      setRazorpayModalVisible(true)
    } catch (err) {
      setError(err.message || "Failed to launch Razorpay gateway")
      setLoading(false)
    }
  }

  const handleRazorpayWebMessage = async (eventData) => {
    try {
      const parsed = typeof eventData === "string" ? JSON.parse(eventData) : eventData
      if (!parsed || !parsed.event) return

      if (parsed.event === "payment.success") {
        setRazorpayModalVisible(false)
        await executeOrderPlacement(rzpData?.targetMethod || "online", parsed)
      } else if (parsed.event === "payment.failed" || parsed.event === "payment.cancel") {
        setRazorpayModalVisible(false)
        setLoading(false)
        if (parsed.error) setError(`Payment Error: ${parsed.error}`)
      }
    } catch (err) {
      console.warn("Error parsing Razorpay message:", err)
    }
  }

  const hasClosedOfferItems = itemsToOrder.some((item) => item.isOfferClosed)

  const handlePlaceOrder = () => {
    if (hasClosedOfferItems) {
      setError("The festival offer from this kitchen has ended or was closed by the seller. Please remove the affected items before proceeding.")
      return
    }
    if (hasUnavailableItems) {
      setError("Some items in your cart are currently unavailable. Please go back to your cart and remove them before proceeding.")
      return
    }
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

    if (user?.city && kitchenCity) {
      const custCityNorm = String(user.city).trim().toLowerCase()
      const kitCityNorm = String(kitchenCity).trim().toLowerCase()
      if (custCityNorm !== kitCityNorm) {
        setError(`Delivery unavailable. ${kitchenName || 'This kitchen'} only delivers within ${kitchenCity}. Please select items from a kitchen in ${user.city}!`)
        return
      }
    }

    if (payment === "upi" || payment === "online") {
      initiateRazorpayPayment(grandTotal, "online")
    } else if (payment === "cod" && deliveryMethod !== "self") {
      const advanceFee = deliveryFee || 30
      initiateRazorpayPayment(advanceFee, "cod")
    } else {
      executeOrderPlacement("cod")
    }
  }

  if (cart.length === 0 && !orderPlaced) return null

  return (
    <SafeAreaView className="flex-1 bg-cream relative" edges={["top"]}>
      {/* Fullscreen Order Placed Success Modal */}
      <Modal visible={orderPlaced} transparent animationType="fade">
        <LinearGradient
          colors={["#0B6B3A", "#064d29", "#04331b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}
        >
          <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 100, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }}>
            <CheckCircle size={90} color="#FFFFFF" strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF", fontSize: 32, textAlign: "center" }}>
            Order Placed!
          </Text>
          <Text style={{ fontFamily: "Nunito", color: "rgba(255,255,255,0.85)", fontSize: 16, marginTop: 8, textAlign: "center", maxWidth: 290, lineHeight: 24 }}>
            Your food is being prepared with pure love and hygiene.
          </Text>
        </LinearGradient>
      </Modal>

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/cart"))} className="mr-3">
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-lg text-dark">Checkout</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 mt-4">
        {hasUnavailableItems ? (
          <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="font-poppins font-bold text-sm text-red-800 mb-1">⚠️ Items Unavailable</Text>
            <Text className="font-nunito text-xs text-red-700 leading-5">
              Some items in your cart are currently unavailable. Please return to your cart and remove them before placing your order.
            </Text>
          </View>
        ) : isDeliveryUnavailable ? (
          <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="font-poppins font-bold text-sm text-red-800 mb-1">⚠️ Delivery Unavailable for this Kitchen</Text>
            <Text className="font-nunito text-xs text-red-700 leading-5">
              {kitchenName || "This kitchen"} only delivers within <Text className="font-bold">{kitchenCity}</Text>. Please change your location or pick a kitchen in {user?.city || "your area"}.
            </Text>
          </View>
        ) : error ? (
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

          {payment === "cod" && deliveryMethod !== "self" && (
            <View style={{ backgroundColor: "#FFF9E6", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#F59E0B", marginTop: 10, gap: 4 }}>
              <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#B45309", fontSize: 12.5 }}>
                ⚡ COD Advance Delivery Fee Notice
              </Text>
              <Text style={{ fontFamily: "Nunito", color: "#92400E", fontSize: 11.5, lineHeight: 17 }}>
                To confirm your Cash on Delivery order, the ₹30 delivery fee is paid online via UPI now. The remaining ₹{Math.max(0, grandTotal - 30)} will be collected in cash by the rider at your doorstep.
              </Text>
            </View>
          )}
        </View>

        {/* Items List */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-poppins font-semibold text-sm text-dark">
              Your Items {kitchenName ? `(${kitchenName})` : ""}
            </Text>
            <Text className="font-poppins font-semibold text-xs text-primary">
              {checkoutItemCount} {checkoutItemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          <View className="space-y-2">
            {itemsToOrder.map((item) => {
              const isUnavail = item.is_available === 0 || item.is_available === false || item.isAvailable === false
              return (
                <View key={item.id} className={`flex-row items-center gap-3 py-2 border-b border-gray-50 last:border-0 ${isUnavail ? "opacity-70" : ""}`}>
                  <Image
                    source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" }}
                    className="w-10 h-10 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="font-nunito text-sm text-dark truncate flex-1">{item.name}</Text>
                      {isUnavail && (
                        <View className="bg-red-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[8px] font-poppins font-bold text-red-700">Unavailable</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray">x{item.qty}</Text>
                  </View>
                  {item.offerPrice && Number(item.offerPrice) < Number(item.price) ? (
                    <View className="items-end">
                      <Text className="font-poppins font-semibold text-sm text-[#0B6B3A]">₹{(Number(item.offerPrice) * item.qty).toFixed(2)}</Text>
                      <Text className="font-poppins text-xs text-gray-400 line-through">₹{item.price * item.qty}</Text>
                    </View>
                  ) : (
                    <Text className="font-poppins font-semibold text-sm text-dark">₹{item.price * item.qty}</Text>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-28">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Order Summary</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Items ({checkoutItemCount})</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{checkoutItemTotal}</Text>
            </View>
            {festivalDiscount > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="font-nunito text-sm text-[#0B6B3A] font-semibold">🎉 Festival Discount</Text>
                <Text className="font-nunito text-sm text-[#0B6B3A] font-bold">-₹{festivalDiscount}</Text>
              </View>
            )}
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
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Taxes & GST</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{gstAmount}</Text>
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
        <Button onPress={handlePlaceOrder} size="lg" className="w-full h-12" loading={loading} disabled={loading || isDeliveryUnavailable || hasUnavailableItems}>
          <Text className="text-white text-base font-bold">
            {hasUnavailableItems
              ? "Unavailable Items in Cart"
              : isDeliveryUnavailable
              ? "Delivery Unavailable"
              : loading
              ? "Placing order..."
              : payment === "cod" && deliveryMethod !== "self"
              ? `Pay Advance Delivery Fee - ₹${deliveryFee || 30}`
              : `Place Order - ₹${grandTotal}`}
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
              <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#64748B" }}>
                {payment === "cod" ? "COD Advance Delivery Fee" : "Total Payable Amount"}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", fontFamily: "Poppins", color: "#0B6B3A", marginVertical: 4 }}>
                ₹{payment === "cod" ? (deliveryFee || 30) : grandTotal}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <ShieldCheck size={14} color="#10B981" />
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#10B981", fontWeight: "600" }}>
                  {payment === "cod" ? "Pay ₹30 Now • Remaining ₹" + Math.max(0, grandTotal - 30) + " as Cash at Doorstep" : "Secured by Atleast80 UPI Gateway"}
                </Text>
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
              onPress={() => executeOrderPlacement(payment === "cod" ? "cod" : "upi")}
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
                  {payment === "cod" ? `Pay ₹${deliveryFee || 30} Delivery Fee & Confirm COD` : `Verify & Pay ₹${grandTotal}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Razorpay WebView Payment Modal (Native Apps) */}
      {Platform.OS !== "web" && WebViewComponent && rzpData && (
        <Modal
          visible={razorpayModalVisible}
          animationType="slide"
          onRequestClose={() => {
            setRazorpayModalVisible(false)
            setLoading(false)
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>Razorpay Payment Gateway</Text>
              <TouchableOpacity
                onPress={() => {
                  setRazorpayModalVisible(false)
                  setLoading(false)
                }}
              >
                <X size={24} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
            <WebViewComponent
              originWhitelist={["*"]}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                      <style>
                        body { margin: 0; padding: 0; background-color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
                        .loader { font-size: 16px; color: #0B6B3A; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <div class="loader">Loading Secure Razorpay Checkout...</div>
                      <script>
                        var options = {
                          "key": "${rzpData.keyId}",
                          "amount": "${rzpData.amount}",
                          "currency": "${rzpData.currency || 'INR'}",
                          "name": "Atleast80",
                          "description": "Order Payment",
                          "order_id": "${rzpData.rzpOrderId}",
                          "handler": function (response){
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              event: "payment.success",
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_order_id: response.razorpay_order_id,
                              razorpay_signature: response.razorpay_signature
                            }));
                          },
                          "modal": {
                            "ondismiss": function() {
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                event: "payment.cancel"
                              }));
                            }
                          },
                          "prefill": {
                            "name": "${user?.name || ''}",
                            "email": "${user?.email || ''}",
                            "contact": "${user?.phone || ''}"
                          },
                          "theme": {
                            "color": "#0B6B3A"
                          }
                        };
                        var rzp1 = new Razorpay(options);
                        rzp1.on('payment.failed', function (response){
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            event: "payment.failed",
                            error: response.error ? response.error.description : 'Payment Failed'
                          }));
                        });
                        window.onload = function() {
                          rzp1.open();
                        };
                      </script>
                    </body>
                  </html>
                `,
              }}
              onMessage={(event) => handleRazorpayWebMessage(event.nativeEvent.data)}
              style={{ flex: 1 }}
            />
          </SafeAreaView>
        </Modal>
      )}

      {/* Real-time Offer Closed Modal Popup Overlay in Checkout Screen */}
      {closedOfferItems && closedOfferItems.length > 0 && (
        <View
          style={{
            position: Platform.OS === "web" ? "fixed" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              width: "100%",
              maxWidth: 380,
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 20,
              zIndex: 1000000,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={26} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins-Bold", fontSize: 17, color: "#111827" }}>
                  Festival Offer Closed
                </Text>
                <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "700", marginTop: 2 }}>
                  ऑफ़र बंद हो चुका है
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#FECACA", marginBottom: 18 }}>
              <Text style={{ fontSize: 12, color: "#374151", marginBottom: 8, fontWeight: "500" }}>
                The kitchen seller has turned off or ended the festival offer for:
              </Text>
              {closedOfferItems.map((item) => (
                <Text key={item.id} style={{ fontSize: 13, fontWeight: "700", color: "#1F2937", marginVertical: 3 }} numberOfLines={1}>
                  • {item.name}
                </Text>
              ))}
              <Text style={{ fontSize: 11, color: "#B91C1C", fontWeight: "600", marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#FECACA" }}>
                You cannot place this order at the discounted offer price.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                removeClosedOfferItems()
                router.replace("/cart")
              }}
              style={{ backgroundColor: "#DC2626", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
            >
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 15 }}>
                OK, Remove & Return to Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
