import { useEffect, useState } from "react"
import { View, Text, Image, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useSegments, useRootNavigationState } from "expo-router"
import * as ExpoSplashScreen from "expo-splash-screen"
import { useAuth } from "../context/AuthContext"

export default function SplashScreen() {
  const router = useRouter()
  const rootNavState = useRootNavigationState()
  const { user, loading } = useAuth()

  // Animation values for smooth transition from Image 1 to Image 2
  const [logoScale] = useState(() => new Animated.Value(0.6))
  const [logoOpacity] = useState(() => new Animated.Value(0))
  const [textOpacity] = useState(() => new Animated.Value(0))
  const [textTranslateY] = useState(() => new Animated.Value(15))

  useEffect(() => {
    // Hide native splash immediately on mount so Image 1 is visible at 0ms
    ExpoSplashScreen.hideAsync().catch(() => {})

    // Animate Logo Card & Text over 800ms
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const segments = useSegments()

  useEffect(() => {
    if (!rootNavState?.key || loading) return

    const hasDeepLink = segments.some((seg) => ["(customer)", "(admin)", "(auth)", "(rider)"].includes(seg))
    if (hasDeepLink) return

    const timer = setTimeout(() => {
      if (user) {
        if (user.role === "admin") {
          router.replace("/(admin)/dashboard")
        } else if (user.role === "rider") {
          router.replace("/(rider)/(tabs)/dashboard")
        } else {
          router.replace("/(customer)/home")
        }
      } else {
        router.replace("/onboarding")
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [rootNavState?.key, loading, user, router, segments])

  return (
    <LinearGradient
      colors={["#F4C400", "#FFD740", "#F8F8F5"]}
      locations={[0.1, 0.5, 0.9]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}
    >
      {/* Decorative background circles - Visible immediately (Image 1) */}
      <View style={{ position: "absolute", top: 80, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.1)" }} />
      <View style={{ position: "absolute", bottom: 80, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: "rgba(11,107,58,0.05)" }} />

      {/* Logo Card - Animates smoothly to form Image 2 */}
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

      {/* Tagline - Animates smoothly to form Image 2 */}
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

      {/* Loading Dot indicator - Visible immediately (Image 1) */}
      <View style={{ position: "absolute", bottom: 64, flexDirection: "row", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A", opacity: 0.4 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A", opacity: 0.6 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0B6B3A" }} />
      </View>
    </LinearGradient>
  )
}
