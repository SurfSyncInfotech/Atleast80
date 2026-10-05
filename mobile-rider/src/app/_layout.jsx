import { Stack, useRouter } from "expo-router"
import { Platform } from "react-native"
import React, { useEffect } from "react"
import * as Notifications from "expo-notifications"
import { AuthProvider } from "../context/AuthContext"
import "../global.css"

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fontLinkId = "google-fonts-atleast80-rider"
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link")
        link.id = fontLinkId
        link.rel = "stylesheet"
        link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap"
        document.head.appendChild(link)
      }
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      console.log("Rider Notification clicked with data:", data)
      if (data && data.orderId) {
        router.push(`/(rider)/(tabs)/dashboard`)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <AuthProvider>
      {Platform.OS === "web" &&
        React.createElement("style", {
          dangerouslySetInnerHTML: {
            __html: `
              @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap');
              
              body, input, textarea, select, button, div, span, p, a {
                font-family: 'Nunito', sans-serif;
              }
              .font-poppins {
                font-family: 'Poppins', sans-serif !important;
              }
              .font-nunito {
                font-family: 'Nunito', sans-serif !important;
              }
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
        <Stack.Screen name="(rider)" />
      </Stack>
    </AuthProvider>
  )
}
