import { View, Text, TouchableOpacity, Image, Platform } from "react-native"
import { Plus, Minus } from "lucide-react-native"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"

export default function MenuListItem({ item, className, onOpen, variant = "list" }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const qty = getItemQty(item.id)
  const isVeg = item.itemType === "veg" || item.item_type === "veg"
  const cover = resolveMediaUrl(item.image) || PLACEHOLDER

  const openDetail = () => onOpen?.(item)

  if (variant === "grid") {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={openDetail}
        className={cn(
          "bg-white rounded-[24px] border border-slate-100 shadow-sm flex-col pb-14 relative overflow-visible w-full",
          className
        )}
        style={Platform.select({
          web: { boxShadow: "0px 4px 10px rgba(0,0,0,0.03)" },
          default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1.5 }
        })}
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

          {item.offer ? (
            <View className="absolute top-2 right-2 bg-accent px-1.5 py-0.5 rounded-md">
              <Text className="text-[7.5px] font-poppins font-bold text-white uppercase">{item.offer}</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View className="p-3 flex-1 flex-col justify-between">
          <View>
            <View className="flex-row items-center mb-1 gap-1">
              {Boolean(item.is_combo || item.isCombo) && (
                <View className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <Text className="text-[7.5px] font-poppins font-bold uppercase tracking-wider text-amber-700">
                    Combo
                  </Text>
                </View>
              )}
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

          <Text className="font-poppins font-extrabold text-dark text-xs mt-1.5">
            ₹{Number(item.price)}
          </Text>
        </View>

        {/* Floating Add/Qty buttons */}
        <View className="absolute bottom-3 left-3 right-3 items-center">
          {qty > 0 ? (
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
            <TouchableOpacity
              onPress={() => addItem(item)}
              activeOpacity={0.85}
              className="bg-white py-1.5 rounded-xl shadow-md border border-primary/20 items-center justify-center w-full"
              style={Platform.select({
                web: { boxShadow: "0px 2px 4px rgba(11, 107, 58, 0.1)" },
                default: { shadowColor: "#0B6B3A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
              })}
            >
              <Text className="text-primary font-poppins font-bold text-xs">ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View className={cn("flex-row gap-4 py-4.5 border-b border-gray-100/70 items-start bg-white", className)}>
      {/* Left Text Details */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={openDetail}
        className="flex-1 min-w-0"
      >
        <View className="flex-row items-center gap-2 mb-2">
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

          {Boolean(item.is_combo || item.isCombo) && (
            <View className="bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Text className="text-[9px] font-poppins font-bold uppercase tracking-wider text-amber-700">
                Combo
              </Text>
            </View>
          )}

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
        </View>

        <Text className="font-poppins font-bold text-dark text-base leading-snug">
          {item.name}
        </Text>

        {item.description ? (
          <Text className="font-nunito text-gray text-xs mt-1 leading-relaxed" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Text className="font-poppins font-bold text-dark text-base mt-3">
          ₹{Number(item.price)}
        </Text>

        {item.offer ? (
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
        </TouchableOpacity>

        {/* Floating Add/Qty buttons */}
        <View className="absolute -bottom-2.5 left-0 right-0 items-center">
          {qty > 0 ? (
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
