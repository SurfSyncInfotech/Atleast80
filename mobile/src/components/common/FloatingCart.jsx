import React, { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Platform, Animated } from "react-native"
import { ShoppingCart, ChevronRight } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"

export default function FloatingCart({ onNavigateToCart }) {
  const { itemCount, total } = useCart()
  const { isCustomer } = useAuth()
  const insets = useSafeAreaInsets()
  const bottomOffset = Math.max(20, (insets.bottom || 0) + 14)

  const [visible, setVisible] = useState(false)
  const prevCountRef = useRef(itemCount)
  const timerRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Show only when item is added to cart
    if (itemCount > prevCountRef.current && itemCount > 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setVisible(true)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start()

      // Stay for 2 seconds, then smoothly hide
      timerRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false)
        })
      }, 2000)
    } else if (itemCount <= 0) {
      setVisible(false)
      fadeAnim.setValue(0)
    }
    prevCountRef.current = itemCount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [itemCount])

  if (!visible || itemCount <= 0) return null

  return (
    <Animated.View 
      className="absolute left-4 right-4 z-50 shadow-2xl"
      style={{ 
        bottom: bottomOffset,
        opacity: fadeAnim,
        shadowColor: "#0B6B3A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        onPress={() => onNavigateToCart?.()}
        activeOpacity={0.9}
        className="w-full bg-primary py-3.5 px-5 rounded-2xl flex-row items-center justify-between border border-white/20"
      >
        <View className="flex-row items-center gap-3">
          <View className="bg-white/10 rounded-xl p-2 relative">
            <ShoppingCart size={18} color="#FFFFFF" />
            <View 
              style={{ width: 16, height: 16, borderRadius: 8 }}
              className="absolute -top-1.5 -right-1.5 bg-secondary items-center justify-center"
            >
              <Text className="text-dark text-[9px] font-bold">{itemCount}</Text>
            </View>
          </View>
          <Text className="font-poppins font-semibold text-white text-sm">
            View Cart · {itemCount} item{itemCount > 1 ? "s" : ""}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-white font-poppins font-bold text-sm">₹{total}</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}
