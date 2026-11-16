import { useCallback, useEffect, useState, useRef } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image, Platform, ImageBackground, Modal, TextInput, KeyboardAvoidingView, Keyboard } from "react-native"

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
import { ArrowLeft, CheckCircle2, ChefHat, Bike, Home, Phone, Truck, Check, AlertTriangle, Star } from "lucide-react-native"
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

function StarRating({ value = 0, onChange, readonly = false }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginVertical: 6, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value
        return (
          <TouchableOpacity
            key={star}
            disabled={readonly}
            onPress={() => onChange && onChange(star)}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Star
              size={readonly ? 22 : 32}
              color={isFilled ? "#F59E0B" : "#D1D5DB"}
              fill={isFilled ? "#F59E0B" : "transparent"}
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function ReviewSection({ order, onReviewSubmitted, scrollViewRef }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({ animated: true })
    }, 120)
  }

  if (order.review) {
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 18,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          marginBottom: 20,
          ...Platform.select({
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 1,
            },
          }),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>
            Your Rating & Review
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Star size={13} color="#D97706" fill="#D97706" />
            <Text style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "bold", color: "#B45309", marginLeft: 4 }}>
              {Number(order.review.rating).toFixed(1)}
            </Text>
          </View>
        </View>
        <StarRating value={order.review.rating} readonly />
        {order.review.review ? (
          <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 8, lineHeight: 19 }}>
            "{order.review.review}"
          </Text>
        ) : null}
        <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#9CA3AF", marginTop: 8 }}>
          Submitted on {new Date(order.review.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </View>
    )
  }

  if (order.status !== "delivered") return null

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please tap a star to give a rating (1 to 5 stars)")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const data = await api(`/api/orders/${order.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, review: review.trim() || null }),
      })
      if (onReviewSubmitted) {
        onReviewSubmitted(data.review)
      }
      Alert.alert("Thank you! ⭐", "Your review has been submitted successfully.")
    } catch (err) {
      setError(err.message || "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  const sentimentLabel =
    rating === 5 ? "Loved it! Excellent food 😍" :
    rating === 4 ? "Very good food & taste 👍" :
    rating === 3 ? "Average experience 🙂" :
    rating === 2 ? "Below expectations 😕" :
    rating === 1 ? "Disappointed 😞" : "Tap a star to rate your food"

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 18,
        borderWidth: 1.5,
        borderColor: "#FEF3C7",
        marginBottom: 20,
        ...Platform.select({
          default: {
            shadowColor: "#D97706",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          },
        }),
      }}
    >
      <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>
        Rate your experience
      </Text>
      <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#6B7280", marginTop: 2, marginBottom: 10 }}>
        How was your meal from {order.kitchenName || "the kitchen"}?
      </Text>

      {error ? (
        <View style={{ backgroundColor: "#FEE2E2", borderRadius: 10, padding: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#DC2626" }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ alignItems: "center", marginVertical: 6, backgroundColor: "#FFFBEB", borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: "#FEF3C7" }}>
        <StarRating
          value={rating}
          onChange={(val) => {
            setRating(val)
            scrollToBottom()
          }}
        />
        <Text style={{ fontSize: 12, fontFamily: "Nunito", fontWeight: "600", color: rating > 0 ? "#B45309" : "#9CA3AF", marginTop: 4 }}>
          {sentimentLabel}
        </Text>
      </View>

      <TextInput
        value={review}
        onChangeText={setReview}
        onFocus={scrollToBottom}
        placeholder="Share details about the taste, packaging or portion (optional)..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontFamily: "Nunito",
          color: "#1F2937",
          backgroundColor: "#F9FAFB",
          marginTop: 12,
          minHeight: 70,
          textAlignVertical: "top",
        }}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || rating < 1}
        activeOpacity={0.8}
        style={{
          marginTop: 14,
          backgroundColor: rating >= 1 ? "#0B6B3A" : "#D1D5DB",
          borderRadius: 22,
          height: 46,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 14 }}>
            Submit Review
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

export default function OrderTrackingScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const scrollViewRef = useRef(null)

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    return () => {
      showSub.remove()
    }
  }, [])

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
    }, 3000)

    return () => clearInterval(interval)
  }, [order, loadOrder])

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("")

  const openCancelModal = () => {
    setCancelSuccessMsg("")
    setCancelModalOpen(true)
  }

  const confirmCancelOrder = async () => {
    setCancelling(true)
    try {
      const data = await api(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      })
      setOrder(data.order)

      const isOutForDelivery = order.status === "out_for_delivery"
      const isOnline = ["online", "upi", "razorpay"].includes(order.paymentMethod)
      const deliveryFee = Number(order.deliveryFee) > 0 ? Number(order.deliveryFee) : 30
      const refundAmt = Math.max(0, Number(order.grandTotal) - deliveryFee)

      let successMsg = ""
      if (isOutForDelivery) {
        if (isOnline) {
          successMsg = `Your order has been cancelled. Note: ₹${deliveryFee} delivery charge is non-refundable for rider trip. The remaining ₹${refundAmt} will be refunded to your account within 24-48 hours.`
        } else {
          successMsg = `Your order has been cancelled. Advance ₹${deliveryFee} delivery charge is non-refundable for rider trip.`
        }
      } else if (isOnline) {
        successMsg = `Your order has been cancelled. Your full payment of ₹${order.grandTotal} will be refunded to your account within 24-48 hours.`
      } else {
        successMsg = `Your order has been cancelled. Your ₹30 advance delivery charge will be refunded to your account within 24-48 hours.`
      }

      setCancelSuccessMsg(successMsg)
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to cancel order")
      setCancelModalOpen(false)
    } finally {
      setCancelling(false)
    }
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

  const isSelfPickup = order?.deliveryMethod === "self" || order?.delivery_method === "self"

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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 260 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
        {order.status === "cancelled" && (
          <View style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: "#FECACA",
            alignItems: "center",
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#DC2626" }}>Order Cancelled</Text>
            <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#991B1B", marginTop: 4, textAlign: "center" }}>This order was cancelled.</Text>
          </View>
        )}

        {(order.cancellationOtp || order.cancellation_otp) && order.status !== "cancelled" && (
          <View style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 24,
            padding: 18,
            borderWidth: 1.5,
            borderColor: "#FCA5A5",
            alignItems: "center",
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#B91C1C", textTransform: "uppercase", letterSpacing: 0.5 }}>
              🔑 Doorstep Cancellation OTP
            </Text>
            <Text style={{ fontSize: 28, fontFamily: "Poppins", fontWeight: "800", color: "#DC2626", marginTop: 4, letterSpacing: 4 }}>
              {order.cancellationOtp || order.cancellation_otp}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#991B1B", marginTop: 6, textAlign: "center", lineHeight: 18 }}>
              {["online", "upi", "razorpay"].includes(order.paymentMethod)
                ? `Doorstep cancellation requested. Note: ₹30 delivery fee is non-refundable for rider trip, and ₹${Math.max(0, Number(order.grandTotal) - 30)} will be refunded to your account within 24-48 hours. Share this OTP with rider to confirm:`
                : "Doorstep cancellation requested. Note: ₹30 advance delivery fee is non-refundable for rider trip. Share this OTP with rider to confirm:"}
            </Text>
          </View>
        )}

        {/* Estimated Arrival Header Card */}
        {order.status !== "cancelled" && (
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
            <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>
              {isSelfPickup
                ? (order.status === "delivered" ? "Order Picked Up" : order.status === "out_for_delivery" ? "Ready for Pickup" : "Self Pickup Order")
                : (order.status === "delivered" ? "Order Delivered" : order.status === "out_for_delivery" ? "Out for Delivery" : "Estimated Arrival")}
            </Text>
            <Text style={{ fontSize: 28, fontFamily: "Poppins", fontWeight: "extrabold", color: "#1F2937", marginTop: 4 }}>
              {isSelfPickup
                ? (order.status === "delivered" ? "Order Collected! 🎉" : order.status === "out_for_delivery" ? "Ready at Kitchen! 🛍️" : "Being Prepared 🍲")
                : (order.status === "delivered" ? "Enjoy Your Meal! 🍕" : order.status === "out_for_delivery" ? "Rider On The Way! 🚲" : "25-30 min")}
            </Text>
            <View style={{ width: "100%", height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
              <View style={{ width: `${progress}%`, height: "100%", backgroundColor: "#0B6B3A", borderRadius: 3 }} />
            </View>
            {isSelfPickup && order.status === "out_for_delivery" && (
              <View style={{ backgroundColor: "#ECFDF5", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginTop: 14, width: "100%", alignItems: "center" }}>
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", color: "#065F46", fontSize: 13, textAlign: "center" }}>
                  📍 Please visit the kitchen to pick up your order
                </Text>
                <Text style={{ fontFamily: "Nunito", color: "#047857", fontSize: 11.5, marginTop: 2, textAlign: "center" }}>
                  Share the 4-digit Pickup Verification OTP below at the kitchen counter.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Assigned Rider Contact Card */}
        {!isSelfPickup && order.riderPhone && order.status !== "cancelled" && (
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: "#D1FAE5",
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            ...Platform.select({
              default: {
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }
            })
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "#ECFDF5",
                borderWidth: 1,
                borderColor: "#A7F3D0",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12
              }}>
                <Bike size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
                  <Text style={{ fontSize: 10, fontFamily: "Poppins", fontWeight: "bold", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Delivery Partner
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", marginTop: 2 }} numberOfLines={1}>
                  {order.riderName || "Assigned Rider"}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#6B7280", marginTop: 1 }}>
                  {order.riderPhone}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL(`tel:${order.riderPhone}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#0B6B3A",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
              }}
            >
              <Phone size={14} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Poppins", fontWeight: "bold" }}>
                Call
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
              <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
                {isSelfPickup ? "Pickup Verification OTP" : "Delivery Verification OTP"}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#4B5563", marginTop: 2 }}>
                {isSelfPickup ? "Share this code with the kitchen when you pick up your order" : "Share this code with the rider at your door"}
              </Text>
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
            {(isSelfPickup ? [
              { id: "pending", label: "Order Placed", desc: "Your order has been placed successfully", icon: CheckCircle2 },
              { id: "confirmed", label: "Order Confirmed", desc: "Your order has been accepted by the kitchen", icon: ChefHat },
              { id: "preparing", label: "Being Prepared", desc: "Kitchen is cooking your delicious food", icon: Truck },
              { id: "out_for_delivery", label: "Ready for Pickup", desc: "Your order is ready at the kitchen for pickup", icon: CheckCircle2 },
              { id: "delivered", label: "Picked Up", desc: "Order collected successfully!", icon: Home },
            ] : STEPS).map((step, i) => {
              const Icon = step.icon
              const { done, active } = stepState(order.status, step.id)

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
                      backgroundColor: done ? "#0B6B3A" : "#E5E7EB",
                      zIndex: 0
                    }} />
                  )}

                  {/* Icon Circle */}
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: done ? "#0B6B3A" : "#FAF6F0",
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
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 2
                      } : {}
                    })
                  }}>
                    {done ? (
                      active ? (
                        <Icon size={16} color="#FFFFFF" strokeWidth={2.5} />
                      ) : (
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                      )
                    ) : (
                      <Icon size={16} color="#8D7355" />
                    )}
                  </View>

                  {/* Step Card */}
                  <View style={{
                    flex: 1,
                    backgroundColor: active ? "#EAF7EE" : done ? "#F0FDF4" : "#FAF6F0",
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? "#0B6B3A" : done ? "#DCFCE7" : "#EADEC9",
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
                      }}>
                        {step.desc}
                      </Text>
                    </View>

                    {active ? (
                      <View style={{ backgroundColor: "#0B6B3A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: "Poppins", fontWeight: "bold" }}>
                          {step.id === "out_for_delivery" ? "ON THE WAY" : "IN PROGRESS"}
                        </Text>
                      </View>
                    ) : done ? (
                      <Check size={16} color="#0B6B3A" strokeWidth={2.5} />
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        </View>
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
          <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 8, paddingTop: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#6B7280" }}>Item Total</Text>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#1F2937", fontWeight: "600" }}>₹{order.itemTotal}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#6B7280" }}>Taxes & GST</Text>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#1F2937", fontWeight: "600" }}>₹{order.gstAmount !== undefined && order.gstAmount !== null ? order.gstAmount : Number((order.itemTotal * 0.05).toFixed(2))}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#6B7280" }}>Delivery Fee</Text>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#1F2937", fontWeight: "600" }}>{order.deliveryFee === 0 ? "Free" : `₹${order.deliveryFee}`}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "extrabold", color: "#1F2937" }}>Grand Total</Text>
              <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "extrabold", color: "#0B6B3A" }}>₹{order.grandTotal}</Text>
            </View>
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

        {/* Rating & Review Section (Delivered Orders) */}
        {order.status === "delivered" && (
          <ReviewSection
            order={order}
            scrollViewRef={scrollViewRef}
            onReviewSubmitted={(review) => {
              setOrder((prev) => (prev ? { ...prev, review } : prev))
            }}
          />
        )}

        {["pending", "confirmed", "preparing", "out_for_delivery"].includes(order.status) && (
          <TouchableOpacity
            onPress={openCancelModal}
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
      </KeyboardAvoidingView>

      {/* Custom Refund & Cancellation Modal */}
      <Modal visible={cancelModalOpen} transparent animationType="fade" onRequestClose={() => setCancelModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center" }}>
            {cancelSuccessMsg ? (
              <>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <CheckCircle2 size={36} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 18, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", textAlign: "center" }}>
                  Order Cancelled 🛑
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                  {cancelSuccessMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCancelModalOpen(false)
                    setCancelSuccessMsg("")
                  }}
                  style={{ marginTop: 24, width: "100%", height: 48, borderRadius: 24, backgroundColor: "#0B6B3A", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>OK, Got It</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <AlertTriangle size={32} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 18, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937", textAlign: "center" }}>
                  {order?.status === "out_for_delivery" ? "Cancel In-Transit Order?" : "Cancel Order?"}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                  {(() => {
                    const isOutForDelivery = order?.status === "out_for_delivery"
                    const isOnline = ["online", "upi", "razorpay"].includes(order?.paymentMethod)
                    const deliveryFee = Number(order?.deliveryFee) > 0 ? Number(order?.deliveryFee) : 30
                    const refundAmt = Math.max(0, Number(order?.grandTotal || 0) - deliveryFee)

                    if (isOutForDelivery) {
                      if (isOnline) {
                        return `Since the order is out for delivery, ₹${deliveryFee} delivery fee is non-refundable for rider trip. Your remaining ₹${refundAmt} will be refunded within 24-48 hours.`
                      }
                      return `Since the order is out for delivery, your advance ₹${deliveryFee} delivery fee is non-refundable to cover rider trip expenses.`
                    }

                    if (isOnline) {
                      return `Are you sure you want to cancel? Your full payment of ₹${order?.grandTotal} will be refunded within 24-48 hours.`
                    }

                    return `Are you sure you want to cancel? Your ₹30 advance delivery charge will be refunded within 24-48 hours.`
                  })()}
                </Text>

                <View style={{ width: "100%", marginTop: 24, gap: 10 }}>
                  <TouchableOpacity
                    onPress={confirmCancelOrder}
                    disabled={cancelling}
                    style={{ width: "100%", height: 48, borderRadius: 24, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>
                      {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCancelModalOpen(false)}
                    disabled={cancelling}
                    style={{ width: "100%", height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}
                  >
                    <Text style={{ color: "#374151", fontFamily: "Poppins", fontWeight: "bold", fontSize: 15 }}>Keep Order</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
