import { useEffect, useRef } from "react"
import { Animated, Text, View, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { CheckCircle2, XCircle, Info } from "lucide-react-native"

const STYLES = {
  success: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    text: "#065F46",
    icon: "#059669",
    Icon: CheckCircle2,
  },
  error: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#991B1B",
    icon: "#DC2626",
    Icon: XCircle,
  },
  info: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1E40AF",
    icon: "#2563EB",
    Icon: Info,
  },
}

export default function Toast({ message, type = "error", visible, onHide, duration = 3500 }) {
  const insets = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-16)).current
  const timerRef = useRef(null)

  useEffect(() => {
    if (!visible || !message) return

    if (timerRef.current) clearTimeout(timerRef.current)

    opacity.setValue(0)
    translateY.setValue(-16)

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && onHide) onHide()
      })
    }, duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, message, type, duration, onHide, opacity, translateY])

  if (!visible || !message) return null

  const style = STYLES[type] || STYLES.error
  const Icon = style.Icon

  return (
    <View
      pointerEvents="none"
      style={{
        position: Platform.OS === "web" ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 9999,
        alignItems: "center",
        paddingTop: Math.max(insets.top, 12) + 8,
        paddingHorizontal: 16,
      }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          maxWidth: 420,
          width: "100%",
          backgroundColor: style.bg,
          borderColor: style.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Icon size={18} color={style.icon} />
        <Text
          style={{
            flex: 1,
            color: style.text,
            fontSize: 13,
            lineHeight: 18,
            fontFamily: "Nunito",
            fontWeight: "600",
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  )
}
