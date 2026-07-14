import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, Minus, Plus, Trash2, Package, Truck, MapPin, ShoppingCart } from "lucide-react-native"
import Button from "../../components/ui/Button"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"

const packingOptions = [
  { id: "standard", label: "Standard", desc: "Basic packaging", price: 0 },
  { id: "eco", label: "Eco-Friendly", desc: "Biodegradable containers", price: 15 },
  { id: "premium", label: "Premium", desc: "Insulated + sealed", price: 30 },
]

const deliveryOptions = [
  { id: "free", label: "Seller Free Delivery", desc: "30-45 min", price: 0, icon: Truck },
  { id: "self", label: "Self Pickup", desc: "Ready in 20 min", price: 0, icon: MapPin },
  { id: "express", label: "Express Delivery", desc: "15-20 min", price: 40, icon: Package },
]

export default function CartScreen() {
  const router = useRouter()
  const { cart, addItem, removeItem, deleteItem, itemCount, total: itemTotal, requireCustomer } = useCart()
  const [packing, setPacking] = useState("standard")
  const [delivery, setDelivery] = useState("free")

  const packingCost = packingOptions.find((p) => p.id === packing)?.price || 0
  const deliveryCost = deliveryOptions.find((d) => d.id === delivery)?.price || 0
  const grandTotal = itemTotal + packingCost + deliveryCost

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
        <Button className="mt-6 px-6" onPress={() => router.replace("/(customer)/home")}>
          Browse Kitchens
        </Button>
      </SafeAreaView>
    )
  }

  const handleCheckout = () => {
    if (!requireCustomer()) return
    router.push({
      pathname: "/(customer)/checkout",
      params: {
        packing,
        delivery,
        packingCost: String(packingCost),
        deliveryCost: String(deliveryCost),
      },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-lg text-dark">Your Cart</Text>
        <View className="ml-auto bg-primary/10 px-3 py-1 rounded-full">
          <Text className="text-primary text-xs font-semibold">{itemCount} items</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 mt-4">
        {/* Cart Items List */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="font-poppins font-semibold text-base text-dark mb-4">Cart Items</Text>
          {cart.map((item, i) => (
            <View
              key={item.id}
              className={`flex-row items-center gap-3 py-4 ${
                i < cart.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <Image
                source={{ uri: resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop" }}
                className="w-16 h-16 rounded-xl bg-gray-100"
                resizeMode="cover"
              />
              <View className="flex-1 min-w-0">
                <Text className="font-poppins font-semibold text-sm text-dark" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-gray mt-0.5" numberOfLines={1}>
                  {item.kitchen || item.weight || ""}
                </Text>
                <Text className="font-poppins font-bold text-sm text-dark mt-1.5">
                  ₹{item.price * item.qty}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-2 bg-primary/10 rounded-xl px-2 py-1">
                  <TouchableOpacity onPress={() => removeItem(item.id)} className="p-0.5">
                    <Minus size={13} color="#0B6B3A" />
                  </TouchableOpacity>
                  <Text className="font-poppins font-bold text-primary text-xs min-w-[14] text-center">
                    {item.qty}
                  </Text>
                  <TouchableOpacity onPress={() => addItem(item)} className="p-0.5">
                    <Plus size={13} color="#0B6B3A" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => deleteItem(item.id)} className="p-2">
                  <Trash2 size={16} color="#7A7A7A" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Packing Option selection */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-50">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Packing Type</Text>
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
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Delivery Method</Text>
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
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-28">
          <Text className="font-poppins font-semibold text-base text-dark mb-3">Bill Summary</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between mb-2">
              <Text className="font-nunito text-sm text-dark-light">Item Total ({itemCount} items)</Text>
              <Text className="font-nunito text-sm text-dark font-medium">₹{itemTotal}</Text>
            </View>
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
            <View className="border-t border-gray-100 pt-3 flex-row justify-between">
              <Text className="font-poppins font-bold text-dark text-base">Grand Total</Text>
              <Text className="font-poppins font-bold text-dark text-lg">₹{grandTotal}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex-row items-center justify-between shadow-2xl z-50">
        <View>
          <Text className="text-[10px] text-gray font-nunito">Total Amount</Text>
          <Text className="font-poppins font-bold text-xl text-dark">₹{grandTotal}</Text>
        </View>
        <Button onPress={handleCheckout} size="lg" className="px-8 h-12">
          Checkout
        </Button>
      </View>
    </SafeAreaView>
  )
}
