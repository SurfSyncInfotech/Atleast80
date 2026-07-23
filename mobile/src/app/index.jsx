import { useEffect, useState } from "react"
import { View, Text, Image, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useSegments } from "expo-router"
import { useAuth } from "../context/AuthContext"

export default function SplashScreen() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Animation values initialized once using useState
  const [logoScale] = useState(() => new Animated.Value(0.5))
  const [logoOpacity] = useState(() => new Animated.Value(0))
  const [textOpacity] = useState(() => new Animated.Value(0))
  const [textTranslateY] = useState(() => new Animated.Value(20))

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    // If the active route is already a deep-link path (e.g. rider, kitchen, customer),
    // prevent the splash screen from running its timer redirect to avoid taking the user out.
    const hasDeepLink = segments.some((seg) => ["(rider)", "(kitchen)", "(customer)", "(admin)", "(auth)"].includes(seg))
    if (hasDeepLink) return

    // Minimum display time for splash is 2.5 seconds
    const timer = setTimeout(() => {
      if (user) {
        if (user.role === "admin") {
          router.replace("/(admin)/dashboard")
        } else if (user.role === "kitchen") {
          router.replace("/(kitchen)/dashboard")
        } else if (user.role === "rider") {
          router.replace("/(rider)/dashboard")
        } else {
          router.replace("/(customer)/home")
        }
      } else {
        router.replace("/onboarding")
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [loading, user, router, segments])

  return (
    <LinearGradient
      colors={["#F4C400", "#FFD740", "#F8F8F5"]}
      locations={[0.1, 0.5, 0.9]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}
    >
      {/* Decorative background circles */}
      <View style={{ position: "absolute", top: 80, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.1)" }} />
      <View style={{ position: "absolute", bottom: 80, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: "rgba(11,107,58,0.05)" }} />

      {/* Logo */}
      <Animated.View
        style={{
          transform: [{ scale: logoScale }],
          opacity: logoOpacity,
          zIndex: 10,
        }}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={{ width: 180, height: 180, borderRadius: 24 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
          alignItems: "center",
          marginTop: 32,
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ textAlign: "center", fontFamily: "Poppins", color: "#1F1F1F", fontSize: 18, fontWeight: "500" }}>
          Trusted Homemade Food & Essentials
        </Text>
        <Text style={{ marginTop: 8, fontFamily: "Nunito", color: "rgba(31,31,31,0.6)", fontSize: 14, fontStyle: "italic" }}>
          Follow the Kitchen Tradition
        </Text>
      </Animated.View>

      {/* Loading Dot indicator */}
      <View style={{ position: "absolute", bottom: 64, flexDirection: "row", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A", opacity: 0.4 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A", opacity: 0.6 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A" }} />
      </View>
    </LinearGradient>
  )
}
