import { Stack } from "expo-router"
import { BadgeProvider } from "../../context/BadgeContext"

export default function KitchenLayout() {
  return (
    <BadgeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </BadgeProvider>
  )
}
