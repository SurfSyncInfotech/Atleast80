import { Stack, useRouter } from "expo-router"
import { Platform } from "react-native"
import React, { useEffect } from "react"
import * as Notifications from "expo-notifications"
import { AuthProvider } from "../context/AuthContext"
import { CartProvider } from "../context/CartContext"
import "../global.css"

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      console.log("Notification clicked with data:", data)
      if (data && data.type === "rescue" && data.orderId) {
        router.push(`/(customer)/rescue/${data.orderId}`)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <AuthProvider>
      <CartProvider>
        {Platform.OS === "web" &&
          React.createElement("style", {
            dangerouslySetInnerHTML: {
              __html: `
                input, textarea, select, [role="textbox"], [data-focusable="true"] {
                  outline: none !important;
                  outline-width: 0 !important;
                  box-shadow: none !important;
                }
                input:focus, textarea:focus, select:focus, [role="textbox"]:focus, [data-focusable="true"]:focus {
                  outline: none !important;
                  outline-width: 0 !important;
                  box-shadow: none !important;
                }
              `,
            },
          })}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/signup" />
          <Stack.Screen name="(auth)/forgot-password" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(kitchen)" />
          <Stack.Screen name="(rider)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </CartProvider>
    </AuthProvider>
  )
}
