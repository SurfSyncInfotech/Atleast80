import { Stack, useRouter } from "expo-router"
import { Platform } from "react-native"
import React from "react"
import { AuthProvider } from "../context/AuthContext"
import "../global.css"

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen name="(kitchen)" />
      </Stack>
    </AuthProvider>
  )
}
