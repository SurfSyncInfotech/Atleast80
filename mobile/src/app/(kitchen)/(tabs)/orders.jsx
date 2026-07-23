import { useEffect, useState, useCallback, useMemo } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Modal
} from "react-native"

const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === "web") {
      const formattedMessage = title ? `${title}\n\n${message || ""}` : message;
      window.alert(formattedMessage);
      if (buttons) {
        const actionBtn = buttons.find(b => b.onPress);
        if (actionBtn) actionBtn.onPress();
      }
    } else {
      const { Alert: RNAlert } = require("react-native");
      RNAlert.alert(title, message, buttons);
    }
  }
};
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Package,
  Phone,
  MapPin,
  RefreshCw,
  XCircle,
  Star,
  X
} from "lucide-react-native"
import { api } from "../../../lib/api"
import { cn } from "../../../lib/utils"

const STATUS_LABELS = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-emerald-100 text-emerald-800 border-emerald-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-slate-100 text-slate-800 border-slate-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
}

const NEXT_STATUS = {
  pending: { status: "confirmed", label: "Accept Order" },
  confirmed: { status: "preparing", label: "Start Cooking" },
  preparing: { status: "out_for_delivery", label: "Dispatch Order" },
  out_for_delivery: { status: "delivered", label: "Mark Delivered" },
}

const TABS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
]

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ order, status }) {
  const targetOrder = order || { status: status }
  const isHandoverPending = targetOrder.paymentMethod === "cod" && targetOrder.deliveryStatus === "handover_pending"
  const displayStatus = targetOrder.showCancelledAlert ? "cancelled" : targetOrder.status
  const label = isHandoverPending ? "Pending Handover" : (STATUS_LABELS[displayStatus] || displayStatus)
  const colorClass = isHandoverPending
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : (STATUS_COLORS[displayStatus] || "bg-gray-100 text-gray border-gray-200")

  return (
    <View className={cn("px-2.5 py-0.5 rounded-full border", colorClass)}>
      <Text className="font-poppins font-bold text-[9px] uppercase tracking-wide">
        {label}
      </Text>
    </View>
  )
}

export default function KitchenOrdersScreen() {
  const [allOrders, setAllOrders] = useState([])
  const [tab, setTab] = useState("active")
  const [detailOrder, setDetailOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api("/api/orders/kitchen")
      const newOrders = data.orders || []

      setAllOrders((prevOrders) => {
        const prevList = prevOrders || []
        return newOrders.map((newO) => {
          if (newO.status === "cancelled") {
            const oldO = prevList.find((o) => o.id === newO.id)
            const wasActive = oldO && ["pending", "confirmed", "preparing"].includes(oldO.status)
            const wasShowingAlert = oldO && oldO.showCancelledAlert
            if (wasActive || wasShowingAlert) {
              return {
                ...newO,
                status: oldO.status, // Keep in old tab visually
                actualStatus: "cancelled",
                showCancelledAlert: true,
              }
            }
          }
          return newO
        })
      })
    } catch (err) {
      console.log("Failed to load kitchen orders:", err)
      setAllOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadOrders])

  // Poll orders dynamically: 1s if active orders exist, 25s otherwise
  useEffect(() => {
    const hasActive = allOrders.some((o) => ["pending", "confirmed", "preparing"].includes(o.status))
    const intervalTime = hasActive ? 1000 : 25000
    const interval = setInterval(() => {
      loadOrders()
    }, intervalTime)

    return () => clearInterval(interval)
  }, [allOrders, loadOrders])

  const tabCounts = useMemo(() => {
    const counts = { active: 0, all: allOrders.length }
    for (const o of allOrders) {
      if (!["delivered", "cancelled"].includes(o.status) || o.deliveryStatus === "handover_pending") counts.active++
      counts[o.status] = (counts[o.status] || 0) + 1
    }
    return counts
  }, [allOrders])

  const filteredOrders = useMemo(() => {
    if (tab === "all") return allOrders
    if (tab === "active") return allOrders.filter((o) => !["delivered", "cancelled"].includes(o.status) || o.deliveryStatus === "handover_pending")
    return allOrders.filter((o) => o.status === tab)
  }, [allOrders, tab])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders(false)
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true)
    try {
      const data = await api(`/api/orders/kitchen/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)))
      setDetailOrder((prev) => (prev?.id === orderId ? data.order : prev))
      if (newStatus === "out_for_delivery") {
        Alert.alert(
          "Order Dispatched Successfully",
          `Awaiting rider assignment.\n\nRider Pickup Code: ${data.order.pickupCode}`
        )
      } else {
        Alert.alert("Success", `Order status updated to ${STATUS_LABELS[newStatus]}`)
      }
    } catch (err) {
      if (err.status === 400 || err.message?.toLowerCase().includes("cancel")) {
        Alert.alert(
          "Order Cancelled ⚠️",
          "This order has already been cancelled by the customer.",
          [
            {
              text: "OK",
              onPress: () => {
                loadOrders()
              }
            }
          ]
        )
      } else {
        Alert.alert("Failed to update status", err.message || "Something went wrong")
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleAcknowledgeCancellation = (orderId) => {
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: "cancelled",
            showCancelledAlert: false,
          }
        }
        return o
      })
    )
  }

  const handleConfirmHandover = async (orderId) => {
    setUpdating(true)
    try {
      const data = await api(`/api/orders/kitchen/${orderId}/confirm-handover`, {
        method: "PATCH",
      })
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)))
      setDetailOrder((prev) => (prev?.id === orderId ? data.order : prev))
      Alert.alert("Success 🎉", "Cash handover confirmed! Order has been marked as fully delivered.")
    } catch (err) {
      Alert.alert("Failed to confirm handover", err.message || "Something went wrong")
    } finally {
      setUpdating(false)
    }
  }

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:+91${phone}`).catch(() => {
        Alert.alert("Error", "Unable to place phone call")
      })
    }
  }

  const handleAddressPress = (address) => {
    if (address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {
        Alert.alert("Error", "Unable to open maps")
      })
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-light/35">
        <View>
          <Text className="font-poppins font-bold text-lg text-dark">Orders Management</Text>
          <Text className="font-nunito text-xs text-gray">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} in list
            { (tabCounts.pending || 0) > 0 ? ` · ${tabCounts.pending} new` : "" }
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          className="w-10 h-10 bg-cream items-center justify-center rounded-xl border border-gray-light/20"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <RefreshCw size={16} color="#0B6B3A" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-light/20">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {TABS.map((t) => {
            const isActive = tab === t.key
            const count = tabCounts[t.key] || 0
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2 rounded-xl border",
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-cream-dark/30 border-gray-light/40"
                )}
              >
                <Text
                  className={cn(
                    "font-poppins font-semibold text-[11px]",
                    isActive ? "text-white" : "text-gray"
                  )}
                >
                  {t.label} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0B6B3A" />
          <Text className="font-nunito text-xs text-gray mt-2">Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Package size={42} color="#D8D8D8" className="mb-3" />
          <Text className="font-poppins font-semibold text-dark text-base text-center">
            No orders found
          </Text>
          <Text className="font-nunito text-sm text-gray text-center mt-1">
            No orders match the selected category right now.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ paddingBottom: 110, gap: 12 }}
        >
          {filteredOrders.map((order) => {
            const next = NEXT_STATUS[order.status]
            return (
              <View
                key={order.id}
                className="bg-white rounded-2xl border border-gray-light/50 p-4 shadow-sm"
              >
                {/* ID & Date & Badge */}
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-poppins font-bold text-[15px] text-dark">
                      #{order.orderNumber}
                    </Text>
                    <Text className="font-nunito text-[10px] text-gray mt-0.5">
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  <StatusBadge order={order} />
                </View>

                {/* Customer Info */}
                <View className="border-t border-gray-light/20 py-2.5 gap-1.5">
                  <Text className="font-poppins font-semibold text-xs text-dark-light">
                    Customer: {order.customerName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleAddressPress(order.deliveryAddress)}
                    className="flex-row items-center gap-1"
                  >
                    <MapPin size={12} color="#0B6B3A" />
                    <Text className="font-nunito text-xs text-gray flex-1" numberOfLines={1}>
                      {order.deliveryAddress}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items Summary */}
                <View className="bg-cream/40 rounded-xl p-3 mb-3 border border-gray-light/20">
                  {order.items?.map((item, idx) => (
                    <Text key={item.id || idx} className="font-nunito text-xs text-dark mt-0.5">
                      • {item.name} <Text className="text-gray font-bold">× {item.qty}</Text>
                    </Text>
                  ))}
                  <View className="flex-row justify-between border-t border-gray-light/20 mt-2 pt-2">
                    <Text className="font-poppins font-semibold text-xs text-dark">Total</Text>
                    <Text className="font-poppins font-bold text-xs text-primary">
                      ₹{order.grandTotal}
                    </Text>
                  </View>
                </View>

                 {/* Actions */}
                 {order.showCancelledAlert ? (
                   <View style={{
                     flexDirection: "row",
                     backgroundColor: "#FEE2E2",
                     borderColor: "#FCA5A5",
                     borderWidth: 1,
                     borderRadius: 12,
                     padding: 10,
                     alignItems: "center",
                     justifyContent: "space-between",
                     width: "100%",
                     gap: 10
                   }}>
                     <Text style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "bold", color: "#B91C1C", flex: 1 }}>
                       ⚠️ Order Cancelled by Customer
                     </Text>
                     <TouchableOpacity
                       onPress={() => handleAcknowledgeCancellation(order.id)}
                       style={{
                         backgroundColor: "#EF4444",
                         paddingHorizontal: 16,
                         paddingVertical: 6,
                         borderRadius: 8
                       }}
                     >
                       <Text style={{ fontSize: 12, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>
                         OK
                       </Text>
                     </TouchableOpacity>
                   </View>
                 ) : (
                   <View className="flex-row gap-2">
                     <TouchableOpacity
                       onPress={() => setDetailOrder(order)}
                       className="flex-1 py-2.5 border border-gray-light rounded-xl items-center justify-center bg-white"
                     >
                       <Text className="font-poppins font-bold text-xs text-dark">Details</Text>
                     </TouchableOpacity>

                     {order.paymentMethod === "cod" && order.deliveryStatus === "handover_pending" ? (
                       <TouchableOpacity
                         onPress={() => handleConfirmHandover(order.id)}
                         disabled={updating}
                         className="flex-[2] py-2.5 bg-amber-500 rounded-xl items-center justify-center"
                       >
                         {updating ? (
                           <ActivityIndicator size="small" color="#FFFFFF" />
                         ) : (
                           <Text className="font-poppins font-bold text-xs text-white">
                             Received Cash (₹{order.grandTotal})
                           </Text>
                         )}
                       </TouchableOpacity>
                     ) : (
                       next && (
                         <TouchableOpacity
                           onPress={() => handleStatusUpdate(order.id, next.status)}
                           disabled={updating}
                           className="flex-[2] py-2.5 bg-primary rounded-xl items-center justify-center"
                         >
                           {updating ? (
                             <ActivityIndicator size="small" color="#FFFFFF" />
                           ) : (
                             <Text className="font-poppins font-bold text-xs text-white">
                               {next.label}
                             </Text>
                           )}
                         </TouchableOpacity>
                       )
                     )}

                     {["pending", "confirmed", "preparing"].includes(order.status) && (
                       <TouchableOpacity
                         onPress={() => handleStatusUpdate(order.id, "cancelled")}
                         disabled={updating}
                         className="p-2.5 bg-red-50 border border-red-100 rounded-xl items-center justify-center"
                       >
                         <XCircle size={18} color="#EF4444" />
                       </TouchableOpacity>
                     )}
                   </View>
                 )}
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Details Modal */}
      {detailOrder && (
        <Modal
          visible={Boolean(detailOrder)}
          animationType="slide"
          transparent
          onRequestClose={() => setDetailOrder(null)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[85%] pb-6">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                <View>
                  <Text className="font-poppins font-bold text-base text-dark">
                    #{detailOrder.orderNumber}
                  </Text>
                  <Text className="font-nunito text-[10px] text-gray mt-0.5">
                    {formatDate(detailOrder.createdAt)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <StatusBadge order={detailOrder} />
                  <TouchableOpacity
                    onPress={() => setDetailOrder(null)}
                    className="p-1.5 rounded-full bg-cream-dark/50"
                  >
                    <X size={18} color="#1F1F1F" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Modal Content */}
              <ScrollView className="px-5 py-4 space-y-4" showsVerticalScrollIndicator={false}>
                {/* Customer Section */}
                <View className="bg-cream/40 rounded-2xl border border-gray-light/30 p-4 gap-2">
                  <Text className="font-poppins font-bold text-[10px] uppercase tracking-wider text-gray">
                    Customer details
                  </Text>
                  <Text className="font-poppins font-semibold text-sm text-dark">
                    {detailOrder.customerName}
                  </Text>
                  {detailOrder.customerPhone && (
                    <TouchableOpacity
                      onPress={() => handleCall(detailOrder.customerPhone)}
                      className="flex-row items-center gap-2 py-0.5"
                    >
                      <Phone size={14} color="#0B6B3A" />
                      <Text className="font-nunito text-xs text-primary font-bold underline">
                        +91 {detailOrder.customerPhone}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleAddressPress(detailOrder.deliveryAddress)}
                    className="flex-row items-start gap-2"
                  >
                    <MapPin size={14} color="#0B6B3A" className="mt-0.5" />
                    <Text className="font-nunito text-xs text-gray flex-1 underline">
                      {detailOrder.deliveryAddress}
                    </Text>
                  </TouchableOpacity>
                  {detailOrder.pickupCode ? (
                    <View className="flex-row justify-between items-center bg-emerald-50 border border-emerald-100/50 rounded-xl p-3 mt-1.5">
                      <Text className="font-poppins font-bold text-[9px] uppercase tracking-wider text-emerald-800">
                        Rider Pickup Code:
                      </Text>
                      <Text className="font-poppins font-bold text-sm text-primary tracking-widest bg-white border border-primary/20 rounded px-2.5 py-0.5">
                        {detailOrder.pickupCode}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Items detail list */}
                <View>
                  <Text className="font-poppins font-bold text-[10px] uppercase tracking-wider text-gray mb-2">
                    Order items
                  </Text>
                  <View className="rounded-xl border border-gray-light/50 overflow-hidden bg-white">
                    {detailOrder.items?.map((item, idx) => (
                      <View
                        key={item.id || idx}
                        className={cn(
                          "flex-row justify-between items-center px-4 py-3 border-gray-light/10",
                          idx < detailOrder.items.length - 1 && "border-b"
                        )}
                      >
                        <Text className="font-nunito text-xs text-dark flex-1">
                          {item.name} <Text className="font-bold text-gray">× {item.qty}</Text>
                        </Text>
                        <Text className="font-poppins font-semibold text-xs text-dark">
                          ₹{item.price * item.qty}
                        </Text>
                      </View>
                    ))}
                    <View className="flex-row justify-between px-4 py-3 bg-cream-dark/10 border-t border-gray-light/20">
                      <Text className="font-poppins font-bold text-xs text-dark">Grand Total</Text>
                      <Text className="font-poppins font-bold text-xs text-primary">
                        ₹{detailOrder.grandTotal}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Packing and payment methods */}
                <View className="flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-gray-light/50 p-3 bg-white">
                    <Text className="font-poppins text-[9px] font-bold uppercase text-gray">Payment Method</Text>
                    <Text className="font-nunito text-xs text-dark mt-1 capitalize">
                      {detailOrder.paymentMethod || "COD"}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-gray-light/50 p-3 bg-white">
                    <Text className="font-poppins text-[9px] font-bold uppercase text-gray">Packing Type</Text>
                    <Text className="font-nunito text-xs text-dark mt-1 capitalize">
                      {detailOrder.packingType || "Standard"}
                    </Text>
                  </View>
                </View>

                {/* Review if any */}
                {detailOrder.review && (
                  <View className="rounded-xl bg-amber-50 border border-amber-100 p-4 gap-2">
                    <Text className="font-poppins font-bold text-[10px] uppercase tracking-wider text-amber-800">
                      Customer Review
                    </Text>
                    <View className="flex-row gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          color="#F4C400"
                          fill={i < detailOrder.review.rating ? "#F4C400" : "transparent"}
                        />
                      ))}
                    </View>
                    {detailOrder.review.review ? (
                      <Text className="font-nunito text-xs text-dark leading-relaxed">
                        {detailOrder.review.review}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Update status action inside detail view */}
                  {detailOrder.showCancelledAlert ? (
                    <View style={{
                      backgroundColor: "#FEE2E2",
                      borderColor: "#FCA5A5",
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 16,
                      alignItems: "center",
                      gap: 12,
                      marginTop: 12
                    }}>
                      <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#B91C1C", textAlign: "center" }}>
                        ⚠️ This order was cancelled by the customer.
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          handleAcknowledgeCancellation(detailOrder.id)
                          setDetailOrder(null)
                        }}
                        style={{
                          backgroundColor: "#EF4444",
                          paddingHorizontal: 24,
                          paddingVertical: 10,
                          borderRadius: 12,
                          width: "100%",
                          alignItems: "center"
                        }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF" }}>
                          OK
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {NEXT_STATUS[detailOrder.status] && (
                        <TouchableOpacity
                          onPress={() => {
                            handleStatusUpdate(detailOrder.id, NEXT_STATUS[detailOrder.status].status)
                          }}
                          disabled={updating}
                          className="w-full py-3 bg-primary rounded-xl items-center justify-center mt-2"
                        >
                          {updating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="font-poppins font-bold text-sm text-white">
                              {NEXT_STATUS[detailOrder.status].label}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {["pending", "confirmed", "preparing"].includes(detailOrder.status) && (
                        <TouchableOpacity
                          onPress={() => {
                            handleStatusUpdate(detailOrder.id, "cancelled")
                            setDetailOrder(null)
                          }}
                          disabled={updating}
                          className="w-full py-3 bg-red-50 border border-red-200 rounded-xl items-center justify-center mt-2"
                        >
                          <Text className="font-poppins font-bold text-sm text-red-600">
                            Cancel Order
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
