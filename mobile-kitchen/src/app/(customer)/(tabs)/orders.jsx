import { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, Package } from "lucide-react-native"
import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import Button from "../../../components/ui/Button"
import FloatingCart from "../../../components/common/FloatingCart"

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export default function OrdersScreen() {
  const router = useRouter()
  const { isCustomer, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadOrders = async (showLoader = false) => {
      if (!isCustomer) {
        if (isActive) {
          setLoading(false)
        }
        return
      }

      if (showLoader && isActive) {
        setLoading(true)
      }

      try {
        const [ordersRes, currentRes] = await Promise.all([
          api("/api/orders"),
          api("/api/orders/current"),
        ])

        if (!isActive) return
        setOrders(ordersRes.orders || [])
        setCurrentOrder(currentRes.order || null)
      } catch (err) {
        if (!isActive) return
        console.log("Failed to load orders", err)
        setOrders([])
        setCurrentOrder(null)
      } finally {
        if (showLoader && isActive) {
          setLoading(false)
        }
      }
    }

    const timer = setTimeout(() => {
      loadOrders(true)
    }, 0)

    const interval = setInterval(() => {
      loadOrders(false)
    }, 15000)

    return () => {
      isActive = false
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [isCustomer])

  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#0B6B3A" />
      </SafeAreaView>
    )
  }

  if (!isCustomer) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center p-6" edges={["top"]}>
        <View className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Package size={32} color="#0B6B3A" />
        </View>
        <Text className="font-poppins font-semibold text-dark text-base text-center">
          Sign in to view orders
        </Text>
        <Text className="font-nunito text-gray text-xs text-center mt-2 max-w-xs leading-5">
          Please log in as a customer to view your current orders and order history.
        </Text>
        <Button onPress={() => router.push("/(auth)/login")} className="mt-6 px-6">
          Sign In
        </Button>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity
          onPress={() => router.replace("/(customer)/home")}
          className="mr-3 p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-lg text-dark">
          Your Orders
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 mt-4">
        {currentOrder ? (
          <View className="mb-6">
            <Text className="font-poppins font-semibold text-sm text-primary mb-3 flex-row items-center gap-2">
              <Package size={16} color="#0B6B3A" />{" "}Current Order
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/(customer)/orders/${currentOrder.id}`)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-primary/20"
            >
              <Text className="font-poppins font-semibold text-dark text-base">{currentOrder.kitchenName}</Text>
              <Text className="font-nunito text-xs text-gray mt-1">#{currentOrder.orderNumber}</Text>
              <Text className="font-poppins text-sm text-primary mt-3">
                {STATUS_LABELS[currentOrder.status]} · Track order →
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="mb-6">
          <Text className="font-poppins font-semibold text-dark text-base mb-3">Order History</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0B6B3A" className="py-8" />
          ) : orders.filter((o) => o.id !== currentOrder?.id).length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-light/20">
              <Text className="font-nunito text-gray text-sm">No orders yet</Text>
              <Button className="mt-4" onPress={() => router.replace("/(customer)/home")}>
                Start Ordering
              </Button>
            </View>
          ) : (
            <View className="space-y-3">
              {orders
                .filter((o) => o.id !== currentOrder?.id)
                .map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    onPress={() => router.push(`/(customer)/orders/${order.id}`)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <Text className="font-poppins font-semibold text-sm text-dark" numberOfLines={1}>
                          {order.kitchenName}
                        </Text>
                        <Text className="font-nunito text-xs text-gray">#{order.orderNumber}</Text>
                      </View>
                      <Text className="text-xs font-poppins font-semibold text-gray">
                        {STATUS_LABELS[order.status]}
                      </Text>
                    </View>
                    <Text className="font-nunito text-xs text-gray mt-3">
                      ₹{order.grandTotal} · {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
