import React, { useState, useEffect } from "react"
import { View, Text, Pressable, Animated, Platform, ScrollView, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { ChefHat, ShieldCheck, Truck, Heart } from "lucide-react-native"
import { useAuth } from "../context/AuthContext"

const SLIDES = [
  {
    icon: ChefHat,
    title: "Homemade, Always",
    subtitle: "Discover verified home kitchens cooking fresh meals every day.",
    colors: ["#FFF8E1", "#F8F8F5"],
    iconBg: "rgba(244, 196, 0, 0.15)",
    iconColor: "#0B6B3A",
  },
  {
    icon: ShieldCheck,
    title: "Hygiene You Can Trust",
    subtitle: "Every kitchen is verified with hygiene scores and daily proof uploads.",
    colors: ["#E8F5E9", "#F8F8F5"],
    iconBg: "rgba(11, 107, 58, 0.1)",
    iconColor: "#0B6B3A",
  },
  {
    icon: Truck,
    title: "Fast, Reliable Delivery",
    subtitle: "Food and groceries delivered fresh from the kitchen to your door.",
    colors: ["#FFF3E0", "#F8F8F5"],
    iconBg: "rgba(255, 107, 0, 0.1)",
    iconColor: "#FF6B00",
  },
  {
    icon: Heart,
    title: "Follow the Kitchen Tradition",
    subtitle: "Support home cooks and enjoy authentic, lovingly-made food.",
    colors: ["#FCE4EC", "#F8F8F5"],
    iconBg: "rgba(244, 196, 0, 0.15)",
    iconColor: "#0B6B3A",
  },
]

export default function OnboardingScreen() {
  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      if (user.role === "rider") {
        router.replace("/(rider)/(tabs)/dashboard")
      } else if (user.role === "admin") {
        router.replace("/(admin)/dashboard")
      } else {
        router.replace("/(customer)/home")
      }
    }
  }, [user, router])

  const slide = SLIDES[index]
  const Icon = slide.icon
  const isLast = index === SLIDES.length - 1

  // Animation values initialized once using useState
  const [fadeAnim] = useState(() => new Animated.Value(1))
  const [slideAnim] = useState(() => new Animated.Value(0))

  const animateSlide = (newIndex) => {
    // Phase 1: Fade out and slide left
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change content
      setIndex(newIndex)
      // Reset position to right for entrance
      slideAnim.setValue(30)
      // Phase 2: Fade in and slide to center
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    })
  }

  const goNext = () => {
    if (isLast) {
      router.replace("/(customer)/home")
    } else {
      animateSlide(index + 1)
    }
  }

  const skip = () => {
    router.replace("/(customer)/home")
  }

  return (
    <LinearGradient colors={slide.colors} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Skip button header */}
          <View style={{ alignItems: "flex-end", marginTop: Platform.OS === "ios" ? 10 : 20 }}>
            <Pressable onPress={skip} hitSlop={15}>
              <Text style={{ color: "#7A7A7A", fontFamily: "Poppins", fontSize: 16, fontWeight: "500" }}>
                Skip
              </Text>
            </Pressable>
          </View>

          {/* Animated Slide Content */}
          <Animated.View
            style={{
              alignItems: "center",
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
              paddingHorizontal: 16,
              marginVertical: 10,
            }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                backgroundColor: slide.iconBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                ...Platform.select({
                  web: {
                    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
                  },
                  default: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  },
                }),
              }}
            >
              <Icon size={44} color={slide.iconColor} />
            </View>
            <Text
              style={{
                fontFamily: "Poppins",
                fontSize: 24,
                fontWeight: "700",
                color: "#1F1F1F",
                textAlign: "center",
                lineHeight: 30,
              }}
            >
              {slide.title}
            </Text>
            <Text
              style={{
                fontFamily: "Nunito",
                fontSize: 14,
                color: "#4A4A4A",
                textAlign: "center",
                marginTop: 10,
                lineHeight: 20,
                paddingHorizontal: 8,
              }}
            >
              {slide.subtitle}
            </Text>
          </Animated.View>

          {/* Navigation Indicator & Action Button */}
          <View style={{ marginBottom: Platform.OS === "ios" ? 10 : 20 }}>
            {/* Indicators */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 24 }}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 6,
                    width: i === index ? 24 : 6,
                    borderRadius: 3,
                    backgroundColor: i === index ? "#0B6B3A" : "#E8E8E8",
                  }}
                />
              ))}
            </View>

            {/* Next/Get Started Button */}
            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#0B6B3A",
                borderRadius: 24,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 4px 8px rgba(11, 107, 58, 0.2)",
                  },
                  default: {
                    shadowColor: "#0B6B3A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                }),
              }}
            >
              <Text style={{ color: "#ffffff", fontFamily: "Poppins", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                {isLast ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}
