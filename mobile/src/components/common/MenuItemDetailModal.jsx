import { useState } from "react"
import { View, Text, Modal, Image, TouchableOpacity, ScrollView, Platform } from "react-native"
import { X, ChevronLeft, ChevronRight, Plus, Minus, Play } from "lucide-react-native"
import { router } from "expo-router"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"
import { useVideoPlayer, VideoView } from "expo-video"
import { LinearGradient } from "expo-linear-gradient"

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"

function MenuItemVideoPlayer({ src }) {
  const player = useVideoPlayer(src, (playerInstance) => {
    playerInstance.loop = false
  })

  return (
    <View className="rounded-2xl overflow-hidden bg-black border border-gray-100 mb-4" style={{ height: 210 }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        allowsFullscreen
        nativeControls
      />
    </View>
  )
}

export default function MenuItemDetailModal({ item, onClose }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const [activeImage, setActiveImage] = useState(0)
  const [prevItemId, setPrevItemId] = useState(null)

  // Reset active image index during render when a different item is viewed
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id)
    setActiveImage(0)
  }

  if (!item) return null

  const images = (item.images?.length ? item.images : item.image ? [item.image] : [])
    .map(resolveMediaUrl)
    .filter(Boolean)
  const displayImages = images.length > 0 ? images : [PLACEHOLDER]
  
  const videos = (item.videos?.length ? item.videos : item.video ? [item.video] : [])
    .map(resolveMediaUrl)
    .filter(Boolean)

  const qty = getItemQty(item.id)
  const isVeg = item.itemType === "veg" || item.item_type === "veg"

  const prevImage = () => setActiveImage((i) => (i === 0 ? displayImages.length - 1 : i - 1))
  const nextImage = () => setActiveImage((i) => (i === displayImages.length - 1 ? 0 : i + 1))

  return (
    <Modal visible={Boolean(item)} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[28px] overflow-hidden max-h-[90%] flex-col">
          
          {/* Close button - Styled as floating transparent card */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-md border border-gray-100"
          >
            <X size={20} color="#1F1F1F" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Image gallery */}
          <View className="relative bg-gray-100 w-full" style={{ aspectRatio: 4 / 3 }}>
            <Image
              source={{ uri: displayImages[activeImage] }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Soft Gradient Overlay at bottom */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              className="absolute inset-x-0 bottom-0 h-20"
            />

            {displayImages.length > 1 ? (
              <>
                <TouchableOpacity
                  onPress={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-md border border-gray-100"
                >
                  <ChevronLeft size={22} color="#1F1F1F" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-md border border-gray-100"
                >
                  <ChevronRight size={22} color="#1F1F1F" strokeWidth={2.5} />
                </TouchableOpacity>
                
                {/* Modern Pill Slide Indicators */}
                <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
                  {displayImages.map((_, i) => (
                    <View
                      key={i}
                      style={{ width: i === activeImage ? 18 : 6 }}
                      className={`h-1.5 rounded-full ${i === activeImage ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>

          {/* Thumbnail strip directly below the main image if multiple images */}
          {displayImages.length > 1 && (
            <View className="border-b border-gray-100 py-3.5 px-5 bg-gray-50/50">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {displayImages.map((src, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setActiveImage(i)}
                    className="mr-2"
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 12,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: i === activeImage ? "#0B6B3A" : "transparent",
                      opacity: i === activeImage ? 1 : 0.7,
                    }}
                  >
                    <Image source={{ uri: src }} className="w-full h-full" resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Details ScrollView */}
          <ScrollView showsVerticalScrollIndicator={false} className="p-6 flex-grow">
            <View className="flex-row items-center gap-2 mb-3">
              {/* Veg/Non-Veg tag */}
              <View
                style={{ 
                  borderColor: isVeg ? "#10B981" : "#EF4444",
                  backgroundColor: isVeg ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)"
                }}
                className="w-4.5 h-4.5 rounded-[4px] border flex items-center justify-center"
              >
                <View
                  style={{ backgroundColor: isVeg ? "#10B981" : "#EF4444" }}
                  className="w-2 h-2 rounded-full"
                />
              </View>

              <View className="bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                <Text className="text-[10px] font-poppins font-bold uppercase tracking-wider text-primary">
                  {item.category === "grocery" ? "Ration" : "Homemade Food"}
                </Text>
              </View>
            </View>

            <Text className="font-poppins font-bold text-dark text-xl leading-tight">
              {item.name}
            </Text>

            {item.description ? (
              <Text className="font-nunito text-gray-500 text-sm mt-3 leading-relaxed">
                {item.description}
              </Text>
            ) : null}

            {Boolean(item.isCombo || item.is_combo) && item.comboItems && item.comboItems.length > 0 ? (
              <View className="mt-4 bg-cream/35 border border-primary/10 rounded-xl p-4">
                <Text className="font-poppins font-bold text-dark text-sm mb-2.5">Combo Includes:</Text>
                <View className="gap-2">
                  {item.comboItems.map((ci, idx) => (
                    <View key={`combo-item-${idx}`} className="flex-row justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <Text className="font-nunito text-xs text-dark font-semibold">{ci.name}</Text>
                      <Text className="font-poppins font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">Qty: {ci.quantity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {item.kitchen ? (
              <View className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-100 flex-row items-center justify-between">
                <Text className="font-nunito text-xs text-gray-500 font-medium">Prepared fresh by</Text>
                <Text className="font-poppins font-semibold text-xs text-primary">{item.kitchen}</Text>
              </View>
            ) : null}

            {/* Videos section */}
            {videos.length > 0 ? (
              <View className="mt-6 mb-8">
                <View className="flex-row items-center gap-2 mb-3.5">
                  <Play size={15} color="#0B6B3A" strokeWidth={2.5} />
                  <Text className="font-poppins font-bold text-dark text-sm">Kitchen Proof Videos</Text>
                </View>
                <View>
                  {videos.map((src, i) => (
                    <MenuItemVideoPlayer key={i} src={src} />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer containing price and Cart buttons */}
          <View 
            className="flex-row items-center justify-between p-5 px-6 border-t border-gray-100 bg-white"
            style={{
              paddingBottom: 24,
            }}
          >
            <View>
              <Text className="text-[10px] text-gray font-nunito">Price</Text>
              <Text className="font-poppins font-bold text-dark text-2xl mt-0.5">₹{Number(item.price)}</Text>
            </View>

            {qty > 0 ? (
              <View className="flex-row items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5">
                <TouchableOpacity onPress={() => removeItem(item.id)} className="p-1">
                  <Minus size={18} color="#0B6B3A" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="font-poppins font-bold text-primary text-base min-w-[20] text-center">
                  {qty}
                </Text>
                <TouchableOpacity onPress={() => addItem(item)} className="p-1">
                  <Plus size={18} color="#0B6B3A" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => addItem(item)}
                  activeOpacity={0.9}
                  className="bg-primary px-6 py-3.5 rounded-2xl shadow-md border border-primary/20 items-center justify-center"
                  style={Platform.select({
                    web: {
                      boxShadow: "0px 4px 8px rgba(11, 107, 58, 0.15)",
                    },
                    default: {
                      shadowColor: "#0B6B3A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  })}
                >
                  <Text className="text-white font-poppins font-bold text-xs tracking-wide">ADD TO CART</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const added = addItem(item)
                    if (added) {
                      onClose() // Close details modal
                      router.push("/(customer)/cart")
                    }
                  }}
                  activeOpacity={0.9}
                  className="bg-[#FF6B00] px-6 py-3.5 rounded-2xl shadow-md border border-[#FF6B00]/20 items-center justify-center"
                  style={Platform.select({
                    web: {
                      boxShadow: "0px 4px 8px rgba(255, 107, 0, 0.15)",
                    },
                    default: {
                      shadowColor: "#FF6B00",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  })}
                >
                  <Text className="text-white font-poppins font-bold text-xs tracking-wide">BUY NOW</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}
