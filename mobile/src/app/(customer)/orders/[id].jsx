import { useCallback, useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image, Platform, ImageBackground } from "react-native"

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
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, CheckCircle2, ChefHat, Bike, Home, Phone, Truck, Check } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../../components/ui/Button"
import { api } from "../../../lib/api"
import { resolveMediaUrl } from "../../../lib/media"

const STEPS = [
  { id: "pending", label: "Order Placed", desc: "Your order has been placed successfully", icon: CheckCircle2 },
  { id: "confirmed", label: "Order Confirmed", desc: "Your order has been accepted by the kitchen", icon: ChefHat },
  { id: "preparing", label: "Being Prepared", desc: "Kitchen is cooking your delicious food", icon: Truck },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "Rider is on the way to you", icon: Bike },
  { id: "delivered", label: "Delivered", desc: "Enjoy your meal!", icon: Home },
]

const STATUS_ORDER = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]

function stepState(orderStatus, stepId) {
  const current = STATUS_ORDER.indexOf(orderStatus)
  const step = STATUS_ORDER.indexOf(stepId)
  if (current < 0 || step < 0) return { done: false, active: false }
  if (current > step) return { done: true, active: false }
  if (current === step) {
    if (stepId === "delivered") {
      return { done: true, active: false }
    }
    return { done: true, active: true }
  }
  return { done: false, active: false }
}

export default function OrderTrackingScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancelling, setCancelling] = useState(false)

  const loadOrder = useCallback(async (showLoader = false) => {
    if (!id) {
      router.replace("/(customer)/(tabs)/home")
      return
    }

    if (showLoader) {
      setLoading(true)
    }
    setError("")

    try {
      const data = await api(`/api/orders/${id}`)
      setOrder((prevOrder) => {
        if (prevOrder && prevOrder.status !== "delivered" && data.order.status === "delivered") {
          Alert.alert("Order Delivered! 🍕", "Your delicious meal has been delivered. Enjoy your food!\n\nThank you for ordering with Atleast80.")
        }
        return data.order
      })
    } catch (err) {
      setError(err.message || "Order not found")
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [id, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrder(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadOrder])

  useEffect(() => {
    if (!order) return
    const isFinalStatus = ["delivered", "cancelled"].includes(order.status)
    if (isFinalStatus) return

    const interval = setInterval(() => {
      loadOrder(false)
    }, 10000)

    return () => clearInterval(interval)
  }, [order, loadOrder])

  const handleCancelOrder = async () => {
    const isOutForDelivery = order.status === "out_for_delivery"
    const title = isOutForDelivery ? "Cancel Out-For-Delivery Order" : "Cancel Order"
    const message = isOutForDelivery 
      ? `This order is already out for delivery. To cancel, you must pay the delivery fee of ₹${order.deliveryFee || 30} online immediately. Do you want to pay and cancel?`
      : "Are you sure you want to cancel this order?"

    Alert.alert(
      title,
      message,
      [
        { text: "No", style: "cancel" },
        {
          text: isOutForDelivery ? "Pay & Cancel" : "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true)
            try {
              const body = isOutForDelivery ? { payOnline: true } : {}
              const data = await api(`/api/orders/${order.id}/cancel`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              })
              setOrder(data.order)
              Alert.alert(
                "Success", 
                isOutForDelivery 
                  ? "Cancellation fee paid successfully. Order cancelled." 
                  : "Order cancelled successfully"
              )
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to cancel order")
            } finally {
              setCancelling(false)
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator size="large" color="#0B6B3A" />
      </View>
    )
  }

  if (error || !order) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center p-6">
        <Text className="font-nunito text-gray text-base mb-4">{error || "Order not found"}</Text>
        <Button className="px-6" onPress={() => router.replace("/(customer)/(tabs)/home")}>
          Back to Home
        </Button>
      </SafeAreaView>
    )
  }

  const progress =
    order.status === "delivered"
      ? 100
      : order.status === "out_for_delivery"
        ? 75
        : order.status === "preparing"
          ? 50
          : 35

  const handleCall = (phoneNum) => {
    if (phoneNum) {
      Linking.openURL(`tel:${phoneNum}`).catch((err) => console.log("Call failed", err))
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF9F6" }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", px: 16, py: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }} className="px-4">
        <TouchableOpacity onPress={() => router.replace("/(customer)/orders")} style={{ marginRight: 12 }}>
          <ArrowLeft size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>
          Order #{order.orderNumber}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}>
        {order.status === "cancelled" && (
          <View style={{
            backgroundColor: "#FEE2E2",
            borderColor: "#FCA5A5",
            borderWidth: 1,
            borderRadius: 24,
            padding: 20,
            alignItems: "center",
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#B91C1C" }}>Order Cancelled</Text>
            <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#991B1B", marginTop: 4, textAlign: "center" }}>This order was cancelled.</Text>
          </View>
        )}

        {order.status !== "cancelled" && (
          <>
            {/* Estimated Arrival Banner */}
            <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          alignItems: "center",
          marginBottom: 16,
          ...Platform.select({
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }
          })
        }}>
          <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "900", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated Arrival</Text>
          <Text style={{ fontSize: 32, fontFamily: "Poppins", fontWeight: "extrabold", color: "#1F2937", marginTop: 4 }}>25-30 min</Text>
          <View style={{ width: "100%", backgroundColor: "#E5E7EB", borderRadius: 10, height: 6, marginTop: 16, overflow: "hidden" }}>
            <View
              style={{ width: `${progress}%`, height: "100%", backgroundColor: "#0B6B3A", borderRadius: 10 }}
            />
          </View>
        </View>

        {/* Delivery OTP Card */}
        {order.deliveryOtp && order.status !== "delivered" && order.status !== "cancelled" && (
          <View style={{
            backgroundColor: "#EAF7EE",
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: "#D6EAE7",
            alignItems: "center",
            marginBottom: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 20
          }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>Delivery Verification OTP</Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563", marginTop: 2 }}>Share this code with the rider at your door</Text>
            </View>
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#0B6B3A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 }}>
              <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "extrabold", color: "#0B6B3A", letterSpacing: 2 }}>
                {order.deliveryOtp}
              </Text>
            </View>
          </View>
        )}

        {/* Order Status Timeline */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          marginBottom: 16,
          ...Platform.select({
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }
          })
        }}>
          <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginBottom: 20 }}>Order Status</Text>
          <View>
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const { done, active } = stepState(order.status, step.id)
              const isCompleted = done && !active
              const isPending = !done && !active

              return (
                <View key={step.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, position: "relative" }}>
                  {/* Connecting line between circles */}
                  {i < STEPS.length - 1 && (
                    <View style={{
                      position: "absolute",
                      left: 17,
                      top: 36,
                      bottom: -20,
                      width: 2,
                      backgroundColor: isCompleted ? "#0B6B3A" : "#E5E7EB",
                      zIndex: 0
                    }} />
                  )}

                  {/* Icon Circle */}
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: isCompleted ? "#0B6B3A" : active ? "#FFFFFF" : "#FAF6F0",
                    borderWidth: active ? 2 : 0,
                    borderColor: "#0B6B3A",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                    marginRight: 12,
                    ...Platform.select({
                      default: active ? {
                        shadowColor: "#0B6B3A",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 1
                      } : {}
                    })
                  }}>
                    {isCompleted ? (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Icon size={14} color={active ? "#0B6B3A" : "#8D7355"} />
                    )}
                  </View>

                  {/* Step Card */}
                  <View style={{
                    flex: 1,
                    backgroundColor: active ? "#EAF7EE" : isCompleted ? "#F0FDF4" : "#FAF6F0",
                    borderWidth: 1,
                    borderColor: active ? "#D6EAE7" : isCompleted ? "#DCFCE7" : "#EADEC9",
                    borderRadius: 20,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{
                        fontSize: 14,
                        fontFamily: "Poppins",
                        fontWeight: "bold",
                        color: active ? "#0B6B3A" : "#1F2937"
                      }}>
                        {step.label}
                      </Text>
                      <Text style={{
                        fontSize: 11,
                        fontFamily: "Nunito",
                        color: active ? "#0B6B3A" : "#6B7280",
                        marginTop: 2
                      }}>{step.desc}</Text>
                      {active && (
                        <View style={{ marginTop: 6, backgroundColor: "#0B6B3A", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" }}>
                          <Text style={{ fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>In Progress</Text>
                        </View>
                      )}
                    </View>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: isCompleted || active ? "#EADEC9" : "#E5E7EB",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Check size={10} color={isCompleted || active ? "#8D7355" : "#9CA3AF"} strokeWidth={3} />
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
          </>
        )}
        {/* Items List */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          marginBottom: 16,
          ...Platform.select({
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }
          })
        }}>
          <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginBottom: 12 }}>Items</Text>
          {order.items?.map((item) => (
            <ImageBackground
              key={item.id}
              source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=200&fit=crop" }}
              style={{ width: "100%", height: 100, borderRadius: 20, overflow: "hidden", marginBottom: 12 }}
              resizeMode="cover"
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 14, justifyContent: "flex-end" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Image
                      source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" }}
                      style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: "#FFFFFF" }}
                    />
                    <View>
                      <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "rgba(255,255,255,0.85)", marginTop: 1 }}>x{item.qty}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>₹{item.price * item.qty}</Text>
                </View>
              </View>
            </ImageBackground>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 8, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "extrabold", color: "#1F2937" }}>Total</Text>
            <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "extrabold", color: "#1F2937" }}>₹{order.grandTotal}</Text>
          </View>
        </View>

        {/* Kitchen/Contact Information Card */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          justifyContent: "space-between",
          ...Platform.select({
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }
          })
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#0C4240", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>{order.kitchenName}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#6B7280", marginTop: 2 }}>Preparing your order</Text>
            </View>
          </View>
          {order.kitchenPhone ? (
            <TouchableOpacity
              onPress={() => handleCall(order.kitchenPhone)}
              style={{ overflow: "hidden", borderRadius: 20 }}
            >
              <LinearGradient
                colors={["#FAF6F0", "#EADEC9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#EADEC9"
                }}
              >
                <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>Contact Restaurant</Text>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={10} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>

        {["pending", "confirmed", "preparing", "out_for_delivery"].includes(order.status) && (
          <TouchableOpacity
            onPress={handleCancelOrder}
            disabled={cancelling}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: "#EF4444",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              marginBottom: 12
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "#EF4444", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.replace("/(customer)/home")}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#0B6B3A",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            marginBottom: 30
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: "#0B6B3A", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
