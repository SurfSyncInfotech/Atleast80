import React, { useState } from "react"
import { View, Text, TouchableOpacity, Image, Platform, Animated } from "react-native"
import { UtensilsCrossed, AlertTriangle, CheckCircle2, ChevronRight, Store } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

export default function DishCard({ dish, userCity, onPress, className }) {
  const [scale] = useState(() => new Animated.Value(1))

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start()
  }

  const hasCityFilter = Boolean(userCity && String(userCity).trim())
  const isCityMatch = dish.isCityMatch ?? (
    hasCityFilter
      ? Boolean(
          dish.city &&
            (dish.city.toLowerCase().trim() === userCity.toLowerCase().trim() ||
              dish.city.toLowerCase().includes(userCity.toLowerCase().trim()) ||
              userCity.toLowerCase().includes(dish.city.toLowerCase().trim()))
        )
      : true
  )

  const priceText = dish.price != null && !isNaN(dish.price) && Number(dish.price) > 0
    ? `₹${Number(dish.price).toFixed(0)}`
    : null

  const imageUrl = resolveMediaUrl(dish.image || dish.images?.[0] || dish.kitchenImage || dish.kitchen_image)

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.92}
      className={cn("mb-3.5", className)}
      style={Platform.select({
        web: {
          boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.06)",
        },
        default: {
          shadowColor: "#0C4240",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        },
      })}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: isCityMatch ? "#E7EFE9" : "#FEE2E2",
          padding: 16,
          overflow: "hidden",
        }}
      >
        {/* City Availability Status Banner */}
        {hasCityFilter && !isCityMatch ? (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertTriangle size={15} color="#DC2626" />
            <Text
              style={{
                fontFamily: "Nunito",
                fontSize: 12,
                fontWeight: "700",
                color: "#B91C1C",
                flex: 1,
              }}
              numberOfLines={2}
            >
              Not available in your city{dish.city ? ` (Available in ${dish.city})` : ""}
            </Text>
          </View>
        ) : hasCityFilter && isCityMatch ? (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderColor: "#BBF7D0",
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4.5,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={13} color="#15803D" />
            <Text
              style={{
                fontFamily: "Nunito",
                fontSize: 11,
                fontWeight: "700",
                color: "#15803D",
              }}
            >
              Available in your city ({dish.city || userCity})
            </Text>
          </View>
        ) : null}

        {/* Main Info: Left Details + Right Food Image */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          {/* Left Details */}
          <View style={{ flex: 1 }}>
            {/* Dish Name & Signature Badge */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#1F1F1F",
                }}
                numberOfLines={2}
              >
                {dish.dishName || dish.name}
              </Text>
              {dish.isSignatureDish && (
                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderColor: "#FCD34D",
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                  }}
                >
                  <Text style={{ fontFamily: "Nunito", fontSize: 10, fontWeight: "800", color: "#B45309" }}>
                    ⭐ Signature Dish
                  </Text>
                </View>
              )}
            </View>

            {/* Price */}
            {priceText ? (
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 15,
                  fontWeight: "bold",
                  color: "#0B6B3A",
                  marginTop: 1,
                  marginBottom: 2,
                }}
              >
                {priceText}
              </Text>
            ) : null}

            {/* Kitchen Name */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Store size={13} color="#0B6B3A" />
              <Text
                style={{
                  fontFamily: "Nunito",
                  fontSize: 12.5,
                  fontWeight: "700",
                  color: "#0B6B3A",
                }}
              >
                {dish.kitchenName || dish.kitchen_name}
              </Text>
              {dish.city ? (
                <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#8A8A8A" }}>
                  • {dish.city}
                </Text>
              ) : null}
            </View>

            {/* Short Description */}
            {dish.shortDescription || dish.description ? (
              <Text
                style={{
                  fontFamily: "Nunito",
                  fontSize: 12,
                  color: "#5A5A5A",
                  lineHeight: 17,
                  marginTop: 6,
                }}
                numberOfLines={2}
              >
                {dish.shortDescription || dish.description}
              </Text>
            ) : null}
          </View>

          {/* Right: Food Image */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: "#F4F7F4",
              borderWidth: 1,
              borderColor: "#E5ECE6",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <UtensilsCrossed size={26} color="#0B6B3A" opacity={0.35} />
              </View>
            )}
          </View>
        </View>

        {/* Footer: View Kitchen / Add */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#F4F4F1",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <UtensilsCrossed size={13} color="#7A7A7A" />
            <Text style={{ fontFamily: "Nunito", fontSize: 11.5, color: "#7A7A7A", fontWeight: "600" }}>
              Tap to view &amp; order
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#0B6B3A", fontWeight: "700" }}>
              View in Kitchen
            </Text>
            <ChevronRight size={14} color="#0B6B3A" />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}
