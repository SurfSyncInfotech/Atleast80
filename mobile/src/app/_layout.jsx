import { Stack } from "expo-router"
import { Platform, View } from "react-native"
import React, { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../context/AuthContext"
import { CartProvider } from "../context/CartContext"
import "../global.css"

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fontLinkId = "google-fonts-atleast80"
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link")
        link.id = fontLinkId
        link.rel = "stylesheet"
        link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap"
        document.head.appendChild(link)
      }
    }
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
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
                  input:focus, textarea:focus, select:focus, [role="textbox"], [data-focusable="true"]:focus {
                    outline: none !important;
                    outline-width: 0 !important;
                    box-shadow: none !important;
                  }
                `,
              },
            })}
          <View style={{ flex: 1, backgroundColor: "#F4C400" }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4C400" } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/signup" />
              <Stack.Screen name="(auth)/forgot-password" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </View>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
