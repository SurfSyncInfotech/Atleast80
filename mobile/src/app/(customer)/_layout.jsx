import { Stack } from "expo-router"

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="storyViewer" options={{ animation: "fade_from_bottom" }} />
    </Stack>
  )
}
