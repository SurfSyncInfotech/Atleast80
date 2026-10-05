import { View, Text, TouchableOpacity, Image, Platform } from "react-native"
import { Plus, Minus } from "lucide-react-native"
import { cn } from "../../lib/utils"
import { resolveMediaUrl } from "../../lib/media"

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"

export default function MenuListItem({
  item,
  className,
  onOpen,
  onNavigateToCart,
  onAddToCart,
  onRemoveFromCart,
  getItemQty,
  variant = "list",
}) {
  const isAvailable = item.isAvailable !== undefined ? Boolean(item.isAvailable) : (item.is_available !== undefined ? Boolean(item.is_available) : true)
  const qty = getItemQty ? getItemQty(item.id) : 0
  const isVeg = item.itemType === "veg" || item.item_type === "veg"
  const cover = resolveMediaUrl(item.image) || PLACEHOLDER
  const hasOffer = Boolean(item.offerPrice !== undefined && item.offerPrice !== null && Number(item.offerPrice) < Number(item.price))

  const openDetail = () => onOpen?.(item)
  const addItem = (i) => {
    if (!isAvailable) return false
    return onAddToCart?.(i)
  }
  const removeItem = (id) => onRemoveFromCart?.(id)

  if (variant === "grid") {
    return (
      <View
        className={cn(
          "bg-white rounded-[24px] border border-slate-100 shadow-sm flex-col pb-14 relative overflow-visible w-full",
          !isAvailable && "opacity-80 bg-slate-50/50",
          className
        )}
        style={Platform.select({
          web: { boxShadow: "0px 4px 10px rgba(0,0,0,0.03)" },
          default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1.5 }
        })}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={openDetail}
          className="w-full flex-1 flex-col"
        >
          {/* Top Image */}
          <View className="relative w-full h-28 rounded-t-[22px] overflow-hidden bg-slate-50 border-b border-slate-50">
            <Image
              source={{ uri: cover }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            {/* Veg/Non-Veg Badge */}
            <View
              style={{ 
                borderColor: isVeg ? "#10B981" : "#EF4444",
                backgroundColor: "white"
              }}
              className="w-4 h-4 rounded-[4px] border flex items-center justify-center absolute top-2 left-2 shadow-sm"
            >
              <View
                style={{ backgroundColor: isVeg ? "#10B981" : "#EF4444" }}
                className="w-1.5 h-1.5 rounded-full"
              />
            </View>

            {hasOffer && isAvailable ? (
              <View className="absolute top-2 right-2 bg-[#FF6B00] px-1.5 py-0.5 rounded-md shadow-sm">
                <Text className="text-[7.5px] font-poppins font-bold text-white uppercase">
                  {item.discountPercent}% OFF
                </Text>
              </View>
            ) : item.offer && isAvailable ? (
              <View className="absolute top-2 right-2 bg-accent px-1.5 py-0.5 rounded-md">
                <Text className="text-[7.5px] font-poppins font-bold text-white uppercase">{item.offer}</Text>
              </View>
            ) : null}

            {!isAvailable && (
              <View className="absolute inset-0 bg-black/40 items-center justify-center">
                <Text className="text-[9px] font-poppins font-bold text-white uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View className="p-3 flex-1 flex-col justify-between">
            <View>
              <View className="flex-row items-center mb-1 gap-1 flex-wrap">
                {item.category === "grocery" ? (
                  <View className="bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                    <Text className="text-[7.5px] font-poppins font-bold uppercase tracking-wider text-primary">
                      Ration
                    </Text>
                  </View>
                ) : (
                  <View className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    <Text className="text-[7.5px] font-poppins font-bold uppercase tracking-wider text-gray-500">
                      Homemade
                    </Text>
                  </View>
                )}

                {!isAvailable && (
                  <View className="bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    <Text className="text-[7.5px] font-poppins font-bold uppercase tracking-wider text-red-700">
                      Unavailable
                    </Text>
                  </View>
                )}
              </View>

              <Text className="font-poppins font-bold text-dark text-xs leading-snug" numberOfLines={1}>
                {item.name}
              </Text>

              {item.description ? (
                <Text className="font-nunito text-gray/80 text-[10px] mt-0.5 leading-relaxed" numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            {hasOffer ? (
              <View className="flex-row items-baseline gap-1 mt-1.5 flex-wrap">
                <Text className="font-poppins font-extrabold text-[#0B6B3A] text-xs">
                  ₹{Number(item.offerPrice)}
                </Text>
                <Text className="font-poppins text-gray-400 text-[10px] line-through">
                  ₹{Number(item.price)}
                </Text>
              </View>
            ) : (
              <Text className="font-poppins font-extrabold text-dark text-xs mt-1.5">
                ₹{Number(item.price)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Floating Add/Qty buttons */}
        <View className="absolute bottom-3 left-3 right-3 items-center">
          {!isAvailable ? (
            <View className="w-full bg-slate-100 py-1.5 rounded-xl border border-slate-200 items-center justify-center">
              <Text className="text-slate-400 font-poppins font-bold text-[10px]">UNAVAILABLE</Text>
            </View>
          ) : qty > 0 ? (
            <View className="flex-row items-center justify-between w-full bg-white border border-primary/20 shadow-md rounded-xl px-2 py-1">
              <TouchableOpacity onPress={() => removeItem(item.id)} className="p-1">
                <Minus size={11} color="#0B6B3A" strokeWidth={3} />
              </TouchableOpacity>
              <Text className="font-poppins font-bold text-primary text-xs text-center mt-0.5">
                {qty}
              </Text>
              <TouchableOpacity onPress={() => addItem(item)} className="p-1">
                <Plus size={11} color="#0B6B3A" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row gap-1.5 w-full">
              <TouchableOpacity
                onPress={() => addItem(item)}
                activeOpacity={0.85}
                className="flex-1 bg-white py-1.5 rounded-xl shadow-md border border-primary/20 items-center justify-center"
                style={Platform.select({
                  web: { boxShadow: "0px 2px 4px rgba(11, 107, 58, 0.1)" },
                  default: { shadowColor: "#0B6B3A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
                })}
              >
                <Text className="text-primary font-poppins font-bold text-[10px]">ADD</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const added = addItem(item)
                  if (added) {
                    onNavigateToCart?.()
                  }
                }}
                activeOpacity={0.85}
                className="flex-1 bg-[#FF6B00] py-1.5 rounded-xl shadow-md border border-[#FF6B00] items-center justify-center"
                style={Platform.select({
                  web: { boxShadow: "0px 2px 4px rgba(255, 107, 0, 0.1)" },
                  default: { shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
                })}
              >
                <Text className="text-white font-poppins font-bold text-[10px]">BUY</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className={cn("flex-row gap-4 py-4.5 border-b border-gray-100/70 items-start bg-white", !isAvailable && "opacity-80 bg-slate-50/40", className)}>
      {/* Left Text Details */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={openDetail}
        className="flex-1 min-w-0"
      >
        <View className="flex-row items-center gap-2 mb-2 flex-wrap">
          {/* Veg/Non-Veg Badge with Background Overlay */}
          <View
            style={{
              borderColor: isVeg ? "#10B981" : "#EF4444",
              backgroundColor: isVeg ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)"
            }}
            className="w-4 h-4 rounded-[4px] border flex items-center justify-center"
          >
            <View
              style={{ backgroundColor: isVeg ? "#10B981" : "#EF4444" }}
              className="w-2 h-2 rounded-full"
            />
          </View>

          {item.category === "grocery" ? (
            <View className="bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
              <Text className="text-[9px] font-poppins font-bold uppercase tracking-wider text-primary">
                Ration
              </Text>
            </View>
          ) : (
            <View className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              <Text className="text-[9px] font-poppins font-bold uppercase tracking-wider text-gray-500">
                Homemade
              </Text>
            </View>
          )}

          {!isAvailable && (
            <View className="bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              <Text className="text-[9px] font-poppins font-bold uppercase tracking-wider text-red-700">
                Currently Unavailable
              </Text>
            </View>
          )}
        </View>

        <Text className="font-poppins font-bold text-dark text-base leading-snug">
          {item.name}
        </Text>

        {item.description ? (
          <Text className="font-nunito text-gray text-xs mt-1 leading-relaxed" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-3 mt-3 flex-wrap">
          {hasOffer ? (
            <View className="flex-row items-baseline gap-1.5 flex-wrap">
              <Text className="font-poppins font-bold text-[#0B6B3A] text-base">
                ₹{Number(item.offerPrice)}
              </Text>
              <Text className="font-poppins text-gray-400 text-xs line-through">
                ₹{Number(item.price)}
              </Text>
              <View className="bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                <Text className="text-[9px] font-poppins font-bold text-amber-800">
                  🎉 {item.discountPercent}% OFF
                </Text>
              </View>
            </View>
          ) : (
            <Text className="font-poppins font-bold text-dark text-base">
              ₹{Number(item.price)}
            </Text>
          )}
          {qty === 0 && isAvailable && (
            <TouchableOpacity
              onPress={() => {
                const added = addItem(item)
                if (added) onNavigateToCart?.()
              }}
              activeOpacity={0.85}
              className="bg-[#FF6B00] px-2.5 py-1 rounded-lg border border-[#FF6B00]"
            >
              <Text className="text-white font-poppins font-bold text-[9px]">BUY NOW</Text>
            </TouchableOpacity>
          )}
        </View>

        {item.offer && isAvailable ? (
          <View className="mt-2 bg-accent/10 px-2.5 py-0.5 rounded-full self-start border border-accent/20">
            <Text className="text-[9px] font-poppins font-bold text-accent">{item.offer}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Right Image + Add Button Container */}
      <View className="relative w-24 h-24 flex-shrink-0 ml-2">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openDetail}
          className="w-full h-full rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm"
        >
          <Image
            source={{ uri: cover }}
            className="w-full h-full bg-gray-50"
            resizeMode="cover"
          />
          {!isAvailable && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <Text className="text-[9px] font-poppins font-bold text-white uppercase tracking-wider bg-black/60 px-1.5 py-0.5 rounded text-center">
                Out of Stock
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Floating Add/Qty buttons */}
        <View className="absolute -bottom-2.5 left-0 right-0 items-center">
          {!isAvailable ? (
            <View className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 items-center justify-center min-w-[70]">
              <Text className="text-slate-400 font-poppins font-bold text-xs">UNAVAILABLE</Text>
            </View>
          ) : qty > 0 ? (
            <View className="flex-row items-center gap-2.5 bg-white border border-primary/20 shadow-md rounded-xl px-2 py-1">
              <TouchableOpacity onPress={() => removeItem(item.id)} className="p-1">
                <Minus size={12} color="#0B6B3A" strokeWidth={3} />
              </TouchableOpacity>
              <Text className="font-poppins font-bold text-primary text-xs min-w-[14] text-center mt-0.5">
                {qty}
              </Text>
              <TouchableOpacity onPress={() => addItem(item)} className="p-1">
                <Plus size={12} color="#0B6B3A" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => addItem(item)}
              activeOpacity={0.85}
              className="bg-white px-5 py-1.5 rounded-xl shadow-md border border-primary/20 items-center justify-center min-w-[70]"
              style={Platform.select({
                web: {
                  boxShadow: "0px 2px 4px rgba(11, 107, 58, 0.1)",
                },
                default: {
                  shadowColor: "#0B6B3A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                },
              })}
            >
              <Text className="text-primary font-poppins font-bold text-xs">ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}
