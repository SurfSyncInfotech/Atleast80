import React, { useState } from "react"
import { View, Text, TouchableOpacity, Image, Platform, Animated } from "react-native"
import { Star, Clock, ShieldCheck, MapPin } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const COVER_FALLBACK = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop"

export default function KitchenCard({ kitchen, className, onPress, variant = "list" }) {
  const logoSrc = resolveMediaUrl(kitchen.logo || kitchen.image)
  const coverSrc = resolveMediaUrl(kitchen.cover || kitchen.cover_image) || logoSrc
  const hasCover = Boolean(coverSrc)

  const [scale] = useState(() => new Animated.Value(1))

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start()
  }

  const isVerified = kitchen.verified || kitchen.hygieneVerified
  const festOffer = kitchen.festivalOffer?.active ? kitchen.festivalOffer : null

  if (variant === "grid") {
    return (
      <View className={cn("w-1/2 p-1.5", className)}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={Platform.select({
            web: {
              boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.08)",
            },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.10,
              shadowRadius: 12,
              elevation: 4,
            },
          })}
          className="bg-white rounded-[28px]"
        >
          <Animated.View 
            style={{ transform: [{ scale }] }}
            className="bg-white rounded-[28px] overflow-hidden border border-white/60 flex-col"
          >
            {/* Top Cover Image */}
            <View style={{
              position: "relative",
              height: 120,
              backgroundColor: "#0B6B3A",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: "hidden",
            }}>
              <Image
                source={{ uri: hasCover ? coverSrc : COVER_FALLBACK }}
                style={{ width: "100%", height: "100%", borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.3)"]}
                className="absolute inset-x-0 bottom-0 h-10"
              />

              {/* Floating Festival Offer Badge */}
              {festOffer && (
                <View style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  backgroundColor: "#FF6B00",
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 8, fontFamily: "Poppins", fontWeight: "bold" }}>
                    🎉 {festOffer.discountPercent}% OFF
                  </Text>
                </View>
              )}

              {festOffer && (
                <View style={{
                  position: "absolute",
                  bottom: 5,
                  right: 8,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: "rgba(255,255,255,0.3)"
                }}>
                  <Text style={{ color: "#FFE082", fontSize: 8, fontFamily: "Poppins", fontWeight: "bold" }}>
                    ✨ Special Deals Inside →
                  </Text>
                </View>
              )}

              {/* Floating Verified Badge */}
              {isVerified && (
                <View style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#C5A85A",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 8, fontFamily: "Poppins", fontWeight: "bold", textTransform: "uppercase" }}>👑 Verified</Text>
                </View>
              )}

              {/* Overlapping Brand Avatar */}
              <View className="absolute -bottom-4.5 left-3 w-9 h-9 rounded-full border-2 border-white bg-white overflow-hidden shadow-md">
                <Image
                  source={{ uri: logoSrc || COVER_FALLBACK }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Details Box */}
            <View className="p-3.5 pt-5.5 pb-3.5">
              <Text className="font-poppins font-bold text-dark text-[13px] leading-tight" numberOfLines={1}>
                {kitchen.name}
              </Text>
              
              {/* Rating and ETA */}
              <View className="flex-row items-center gap-2 mt-2">
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "#FFF9E6",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderColor: "#F4C400",
                  borderWidth: 0.5,
                }}>
                  <Star size={9} color="#F4C400" fill="#F4C400" />
                  <Text style={{ fontSize: 10, fontFamily: "Poppins", fontWeight: "bold", color: "#8D7E50", marginTop: 1 }}>
                    {Number(kitchen.rating || 4.5).toFixed(1)}
                  </Text>
                </View>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "#FAF9F6",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderColor: "#E3DFD5",
                  borderWidth: 0.5,
                }}>
                  <Clock size={9} color="#7A7A7A" />
                  <Text style={{ fontSize: 10, fontFamily: "Nunito", fontWeight: "bold", color: "#4A4A4A" }}>
                    {kitchen.deliveryTime || "30m"}
                  </Text>
                </View>
              </View>

              {/* Optional Hygiene Score */}
              {kitchen.hygieneScore > 0 ? (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "#E8F5E9",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderColor: "#A5D6A7",
                  borderWidth: 0.5,
                  alignSelf: "flex-start",
                  marginTop: 8,
                }}>
                  <ShieldCheck size={9} color="#0B6B3A" />
                  <Text style={{ fontSize: 10, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
                    Hygiene: {kitchen.hygieneScore}%
                  </Text>
                </View>
              ) : kitchen.city ? (
                <View className="flex-row items-center gap-1 mt-2.5">
                  <MapPin size={10} color="#7A7A7A" />
                  <Text className="text-[10px] text-gray font-nunito flex-1" numberOfLines={1}>
                    {kitchen.city}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    )
  }

  // Default List Variant (Search page & fallback)
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className={cn(
        "bg-white rounded-[28px] border border-white mb-4",
        className
      )}
      style={Platform.select({
        web: {
          boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.08)",
        },
        default: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.10,
          shadowRadius: 12,
          elevation: 4,
        },
      })}
    >
      <Animated.View style={{ transform: [{ scale }] }} className="overflow-hidden rounded-[28px] flex-col">
        {/* Cover Image Wrapper */}
        <View style={{
          position: "relative",
          height: 170,
          backgroundColor: "#0B6B3A",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
        }}>
          <Image
            source={{ uri: hasCover ? coverSrc : COVER_FALLBACK }}
            style={{ width: "100%", height: "100%", borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
            resizeMode="cover"
          />
          {/* Subtle Dark Overlay at bottom of image */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            className="absolute inset-x-0 bottom-0 h-16"
          />

          {/* Top Badges */}
          {isVerified && (
            <View style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "#C5A85A",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <Text style={{ color: "#FFFFFF", fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 }}>
                👑 Verified
              </Text>
            </View>
          )}
          {festOffer ? (
            <View className="absolute top-3 left-3 bg-[#FF6B00] px-2.5 py-1 rounded-lg shadow-sm">
              <Text className="text-white text-[9px] font-poppins font-bold uppercase tracking-wider">
                🎉 {festOffer.discountPercent}% OFF · {festOffer.title || "Festival Special"}
              </Text>
            </View>
          ) : kitchen.offer ? (
            <View className="absolute top-3 left-3 bg-accent px-2.5 py-1 rounded-lg shadow-sm">
              <Text className="text-white text-[9px] font-poppins font-bold uppercase tracking-wider">
                {kitchen.offer}
              </Text>
            </View>
          ) : null}

          {festOffer && (
            <View style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              backgroundColor: "rgba(0,0,0,0.65)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              borderWidth: 0.5,
              borderColor: "rgba(255,255,255,0.3)"
            }}>
              <Text style={{ color: "#FFE082", fontSize: 9, fontFamily: "Poppins", fontWeight: "bold" }}>
                ✨ Tap to Explore Special Deals →
              </Text>
            </View>
          )}
        </View>

        {/* Details Box */}
        <View style={{ padding: 16, backgroundColor: "#FFFFFF" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {kitchen.name}
            </Text>
            <LinearGradient
              colors={["#EAD293", "#CBB16B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Star size={10} color="#5A4515" fill="#5A4515" />
              <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#5A4515", marginTop: 1 }}>
                {Number(kitchen.rating || 4.5).toFixed(1)}
              </Text>
            </LinearGradient>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#4A4A4A", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {kitchen.speciality}
              {kitchen.deliveryTime ? ` • ${kitchen.deliveryTime}` : ""}
              {kitchen.city ? ` • ${kitchen.city}` : ""}
            </Text>
            {kitchen.hygieneScore > 0 && (
              <View style={{
                backgroundColor: "#E2F6EA",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                borderColor: "#A5D6A7",
                borderWidth: 0.5,
              }}>
                <Text style={{ fontSize: 10, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
                  Hygiene: {kitchen.hygieneScore}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}
