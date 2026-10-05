import { useState, useEffect, useMemo } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { ArrowLeft, Minus, Plus, Trash2, Package, Truck, MapPin, ShoppingCart, AlertCircle } from "lucide-react-native"
import Button from "../../components/ui/Button"
import { useCart } from "../../context/CartContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

const packingOptions = [
  { id: "standard", label: "Standard Packaging", desc: "Basic hygienic food container", price: 0 },
]

const deliveryOptions = [
  { id: "free", label: "Seller Free Delivery", desc: "30-45 min", price: 0, icon: Truck },
  { id: "self", label: "Self Pickup", desc: "Ready in 20 min", price: 0, icon: MapPin },
]

export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { cart, addItem, removeItem, deleteItem, removeClosedOfferItems, closedOfferItems, syncAvailability, itemCount, total: itemTotal, requireCustomer } = useCart()
  const [packing, setPacking] = useState("standard")
  const [delivery, setDelivery] = useState("free")

  const packingCost = packingOptions.find((p) => p.id === packing)?.price || 0
  const deliveryCost = deliveryOptions.find((d) => d.id === delivery)?.price || 0

  // Group items by kitchen
  const kitchenGroups = useMemo(() => {
    const map = {}
    for (const item of cart) {
      const kId = String(item.kitchenId || item.kitchen_id || "default")
      if (!map[kId]) {
        map[kId] = {
          kitchenId: item.kitchenId || item.kitchen_id,
          kitchenName: item.kitchen || item.kitchenName || "Kitchen Store",
          items: [],
        }
      }
      map[kId].items.push(item)
    }
    return Object.values(map)
  }, [cart])

  const isMultiKitchen = kitchenGroups.length > 1

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
    (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false || item.isOfferClosed
  )

  const calcGroupTotals = (groupItems) => {
    const subtotal = groupItems.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)
    const festivalDiscount = Number(
      groupItems.reduce((sum, item) => {
        if (item.isOfferActive === false || item.isOfferClosed) return sum
        if (item.offerPrice && Number(item.offerPrice) < Number(item.price)) {
          return sum + (Number(item.price) - Number(item.offerPrice)) * Number(item.qty)
        }
        if (item.discountPercent && Number(item.discountPercent) > 0) {
          return sum + (Number(item.price) * Number(item.qty) * Number(item.discountPercent)) / 100
        }
        return sum
      }, 0).toFixed(2)
    )
    const discountedSubtotal = Math.max(0, subtotal - festivalDiscount)
    const gst = Number(
      groupItems.reduce((sum, item) => {
        const isGrocery = item.category === "grocery"
        const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
        const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
        const effectivePrice = (!item.isOfferClosed && item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
        return sum + (effectivePrice * Number(item.qty) * (rate / 100))
      }, 0).toFixed(2)
    )
    const grand = Number((discountedSubtotal + gst + packingCost + deliveryCost).toFixed(2))
    return { subtotal, festivalDiscount, gst, grand }
  }

  const globalFestivalDiscount = Number(
    cart.reduce((sum, item) => {
      if (item.isOfferActive === false || item.isOfferClosed) return sum
      if (item.offerPrice && Number(item.offerPrice) < Number(item.price)) {
        return sum + (Number(item.price) - Number(item.offerPrice)) * Number(item.qty)
      }
      if (item.discountPercent && Number(item.discountPercent) > 0) {
        return sum + (Number(item.price) * Number(item.qty) * Number(item.discountPercent)) / 100
      }
      return sum
    }, 0).toFixed(2)
  )

  const globalGst = Number(
    cart.reduce((sum, item) => {
      const isGrocery = item.category === "grocery"
      const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
      const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
      const effectivePrice = (!item.isOfferClosed && item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
      return sum + (effectivePrice * Number(item.qty) * (rate / 100))
    }, 0).toFixed(2)
  )
  const globalGrandTotal = Number((Math.max(0, itemTotal - globalFestivalDiscount) + globalGst + packingCost + deliveryCost).toFixed(2))

  const handleCheckoutKitchen = (group) => {
    const groupHasOfferClosed = group.items.some((item) => item.isOfferClosed)
    if (groupHasOfferClosed) {
      if (Platform.OS === "web") {
        window.alert("The seller has closed the festival offer for some items. Please remove them before checkout.")
      } else {
        Alert.alert("Offer Closed", "The seller has closed the festival offer for some items. Please remove them before checkout.")
      }
      return
    }
    const groupHasUnavailable = group.items.some(
      (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false
    )
    if (groupHasUnavailable) {
      if (Platform.OS === "web") {
        window.alert("Some items from this kitchen are currently unavailable. Please remove them before checkout.")
      } else {
        Alert.alert("Unavailable Items", "Some items from this kitchen are currently unavailable. Please remove them before checkout.")
      }
      return
    }
    if (!requireCustomer()) return

    const { subtotal, festivalDiscount, gst, grand } = calcGroupTotals(group.items)
    router.replace({
      pathname: "/checkout",
      params: {
        kitchenId: String(group.kitchenId),
        kitchenName: group.kitchenName,
        packing,
        delivery,
        packingCost: String(packingCost),
        deliveryCost: String(deliveryCost),
        gstAmount: String(gst),
        festivalDiscount: String(festivalDiscount),
      },
    })
  }

  if (cart.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center p-6">
        <View className="w-20 h-20 bg-gray-light/35 rounded-3xl items-center justify-center mb-6">
          <ShoppingCart size={36} color="#7A7A7A" />
        </View>
        <Text className="font-poppins font-bold text-xl text-dark">Your cart is empty</Text>
        <Text className="font-nunito text-gray text-sm mt-2 text-center max-w-xs leading-5">
          Explore kitchens and add your favorite homemade food & groceries
        </Text>
        <Button className="mt-6 px-6" onPress={() => router.replace("/home")}>
          Browse Kitchens
        </Button>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} className="mr-3">
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <View>
          <Text className="font-poppins font-bold text-lg text-dark">Your Cart</Text>
          {isMultiKitchen && (
            <Text className="font-nunito text-[10px] text-primary font-semibold">
              {kitchenGroups.length} Kitchens in cart
            </Text>
          )}
        </View>
        <View className="ml-auto bg-primary/10 px-3 py-1 rounded-full">
          <Text className="text-primary text-xs font-semibold">{itemCount} items</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 mt-4">
        {hasUnavailableItems && (
          <View className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3.5 flex-row items-center gap-2.5">
            <AlertCircle size={18} color="#B91C1C" />
            <Text className="text-red-700 text-xs font-nunito font-semibold flex-1">
              Some items in your cart are currently unavailable. Please remove them to proceed.
            </Text>
          </View>
        )}

        {isMultiKitchen && (
          <View className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex-row items-center gap-2.5">
            <Package size={18} color="#B45309" />
            <Text className="text-amber-900 text-xs font-nunito font-medium flex-1">
              Items from <Text className="font-bold">{kitchenGroups.length} different kitchens</Text>. You can order from each kitchen separately below.
            </Text>
          </View>
        )}

        {/* Kitchen Groups */}
        {kitchenGroups.map((group, groupIdx) => {
          const { subtotal, festivalDiscount, gst, grand } = calcGroupTotals(group.items)
          const groupHasUnavailable = group.items.some(
            (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false || item.isOfferClosed
          )

          return (
            <View key={group.kitchenId || groupIdx} className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-100">
              {/* Kitchen Header */}
              <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Text className="text-primary font-poppins font-bold text-xs">{groupIdx + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-poppins font-bold text-sm text-dark" numberOfLines={1}>
                      {group.kitchenName}
                    </Text>
                    <Text className="font-nunito text-[10px] text-gray">
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </Text>
                  </View>
                </View>
                {isMultiKitchen && (
                  <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-poppins font-bold text-primary">Kitchen #{groupIdx + 1}</Text>
                  </View>
                )}
              </View>

              {/* Items List */}
              {group.items.map((item, i) => {
                const isUnavail = item.is_available === 0 || item.is_available === false || item.isAvailable === false
                const isOfferClosed = Boolean(item.isOfferClosed)
                const isBlocked = isUnavail || isOfferClosed
                const isGrocery = item.category === "grocery"
                const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
                const itemRate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 18)

                return (
                  <View
                    key={item.id}
                    className={`flex-row items-center gap-3 py-3 ${
                      i < group.items.length - 1 ? "border-b border-gray-100" : ""
                    } ${isBlocked ? "opacity-85 bg-red-50/50 -mx-2 px-2 rounded-xl border border-red-200/60 my-1" : ""}`}
                  >
                    <View className="relative">
                      <Image
                        source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" }}
                        className="w-14 h-14 rounded-xl bg-gray-100"
                        resizeMode="cover"
                      />
                      {isBlocked && (
                        <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center p-1">
                          <Text className="text-[8px] font-poppins font-bold text-white uppercase text-center px-1 leading-tight">
                            {isOfferClosed ? "Offer Ended" : "Unavailable"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="font-poppins font-semibold text-sm text-dark flex-1" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {isOfferClosed && (
                          <View className="bg-red-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[8px] font-poppins font-bold text-red-700">Offer Closed</Text>
                          </View>
                        )}
                        {!isOfferClosed && isUnavail && (
                          <View className="bg-red-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[8px] font-poppins font-bold text-red-700">Unavailable</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Text className="text-[10px] text-gray">{item.weight || (isGrocery ? "Grocery" : "Food")}</Text>
                        <Text className="text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-700 font-medium">
                          GST: {itemRate}%
                        </Text>
                      </View>
                      {!isOfferClosed && item.offerPrice && Number(item.offerPrice) < Number(item.price) ? (
                        <View className="flex-row items-baseline gap-1.5 mt-1">
                          <Text className="font-poppins font-bold text-sm text-[#0B6B3A]">
                            ₹{(Number(item.offerPrice) * item.qty).toFixed(2)}
                          </Text>
                          <Text className="font-poppins text-xs text-gray-400 line-through">
                            ₹{item.price * item.qty}
                          </Text>
                        </View>
                      ) : (
                        <Text className="font-poppins font-bold text-sm text-dark mt-1">
                          ₹{item.price * item.qty}
                        </Text>
                      )}
                      {isOfferClosed && (
                        <Text className="text-[10px] text-red-600 font-bold mt-1">
                          ⚠️ Offer closed by seller. Please remove.
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-row items-center gap-2 bg-primary/10 rounded-xl px-2 py-1">
                        <TouchableOpacity onPress={() => removeItem(item.id)} className="p-0.5">
                          <Minus size={13} color="#0B6B3A" />
                        </TouchableOpacity>
                        <Text className="font-poppins font-bold text-primary text-xs min-w-[14] text-center">
                          {item.qty}
                        </Text>
                        <TouchableOpacity onPress={() => addItem(item)} disabled={isBlocked} className={`p-0.5 ${isBlocked ? "opacity-30" : ""}`}>
                          <Plus size={13} color="#0B6B3A" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => deleteItem(item.id)} className="p-2">
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}

              {/* Per Kitchen Checkout CTA for Multi-Kitchen */}
              {isMultiKitchen && (
                <View className="mt-3 pt-3 border-t border-gray-100 bg-cream/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs font-nunito text-gray">
                      Items: ₹{subtotal}{festivalDiscount > 0 ? ` | Disc: -₹${festivalDiscount}` : ""} | GST: ₹{gst}
                    </Text>
                    <Text className="font-poppins font-bold text-xs text-primary">₹{grand}</Text>
                  </View>
                  <Button
                    onPress={() => handleCheckoutKitchen(group)}
                    disabled={groupHasUnavailable}
                    size="md"
                    className="w-full mt-1.5 h-10"
                  >
                    {groupHasUnavailable ? "Unavailable Items" : `Order from ${group.kitchenName} (₹${grand})`}
                  </Button>
                </View>
              )}
            </View>
          )
        })}

        {/* Packing Option selection */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-50">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Packing Preference</Text>
          <View className="space-y-2">
            {packingOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setPacking(opt.id)}
                activeOpacity={0.8}
                className={`flex-row items-center justify-between p-4 rounded-2xl border-2 mb-2 ${
                  packing === opt.id ? "bg-primary/5 border-primary" : "bg-white border-gray-100"
                }`}
              >
                <View className="flex-1">
                  <Text className="font-poppins font-bold text-sm text-dark">{opt.label}</Text>
                  <Text className="text-xs text-gray mt-0.5 font-nunito">{opt.desc}</Text>
                </View>
                <Text className="font-poppins font-bold text-sm text-dark">
                  {opt.price === 0 ? "Free" : `+₹${opt.price}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery options selection */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-50">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Delivery Preference</Text>
          <View className="space-y-2">
            {deliveryOptions.map((opt) => {
              const Icon = opt.icon
              const active = delivery === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDelivery(opt.id)}
                  activeOpacity={0.8}
                  className={`flex-row items-center gap-3.5 p-4 rounded-2xl border-2 mb-2 ${
                    active ? "bg-primary/5 border-primary" : "bg-white border-gray-100"
                  }`}
                >
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${active ? "bg-primary" : "bg-gray-100"}`}>
                    <Icon size={18} color={active ? "#FFFFFF" : "#7A7A7A"} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-poppins font-bold text-sm text-dark">{opt.label}</Text>
                    <Text className="text-xs text-gray mt-0.5 font-nunito">{opt.desc}</Text>
                  </View>
                  <Text className="font-poppins font-bold text-sm text-dark">
                    {opt.price === 0 ? "Free" : `+₹${opt.price}`}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Bill Summary */}
        <View className={`bg-white rounded-2xl p-4 shadow-sm ${isMultiKitchen ? "mb-10" : "mb-28"}`}>
          <Text className="font-poppins font-semibold text-base text-dark mb-3">
            {isMultiKitchen ? "Cart Summary (All Kitchens)" : "Bill Summary"}
          </Text>
          <View className="space-y-3">
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Item Total ({itemCount} items)</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{itemTotal}</Text>
            </View>
            {globalFestivalDiscount > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="font-nunito text-sm text-[#0B6B3A] font-semibold">🎉 Festival Discount</Text>
                <Text className="font-nunito text-sm text-[#0B6B3A] font-bold">-₹{globalFestivalDiscount}</Text>
              </View>
            )}
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Packing</Text>
              <Text className="font-nunito text-sm text-dark font-medium">
                {packingCost === 0 ? "Free" : `₹${packingCost}`}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Delivery</Text>
              <Text className="font-nunito text-sm text-dark font-medium">
                {deliveryCost === 0 ? "Free" : `₹${deliveryCost}`}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Taxes & GST</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{globalGst}</Text>
            </View>
            <View className="border-t border-gray-100 pt-3 flex-row justify-between">
              <Text className="font-poppins font-bold text-dark text-base">Total Value</Text>
              <Text className="font-poppins font-bold text-dark text-lg">₹{globalGrandTotal}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar if single kitchen */}
      {!isMultiKitchen && (
        <View 
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 flex-row items-center justify-between shadow-2xl z-50"
          style={{
            paddingBottom: Math.max(16, insets.bottom + 8)
          }}
        >
          <View>
            <Text className="text-[10px] text-gray font-nunito">Total Amount</Text>
            <Text className="font-poppins font-bold text-xl text-dark">₹{globalGrandTotal}</Text>
          </View>
          <Button
            onPress={() => handleCheckoutKitchen(kitchenGroups[0])}
            disabled={hasUnavailableItems}
            size="lg"
            className={`px-8 h-12 ${hasUnavailableItems ? "opacity-50" : ""}`}
          >
            {hasUnavailableItems ? "Unavailable" : "Checkout"}
          </Button>
        </View>
      )}

      {/* Real-time Offer Closed Modal Popup Overlay in Cart Screen */}
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
              onPress={removeClosedOfferItems}
              style={{ backgroundColor: "#DC2626", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
            >
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 15 }}>
                OK, Remove from Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
