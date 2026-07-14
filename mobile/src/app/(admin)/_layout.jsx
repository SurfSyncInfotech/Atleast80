import { useEffect } from "react"
import { Stack, useSegments, useRouter } from "expo-router"
import { useAuth } from "../../context/AuthContext"
import { View, ActivityIndicator } from "react-native"

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const isLoginScreen = segments.includes("login")
      if (!user || !isAdmin) {
        if (!isLoginScreen) {
          router.replace("/(admin)/login")
        }
      } else {
        if (isLoginScreen) {
          router.replace("/(admin)/dashboard")
        }
      }
    }
  }, [user, isAdmin, loading, segments])

  if (loading) {
    return (
      <View className="flex-1 bg-cream justify-center items-center">
        <ActivityIndicator size="large" color="#0B6B3A" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="featured" />
    </Stack>
  )
}
