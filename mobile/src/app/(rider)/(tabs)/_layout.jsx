import { Tabs } from "expo-router"
import { LayoutDashboard, User } from "lucide-react-native"
import { Platform } from "react-native"

export default function RiderTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: "#7A7A7A",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E8E8E8",
          height: Platform.OS === "ios" ? 88 : 72,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 8,
          ...Platform.select({
            web: {
              boxShadow: "0px -2px 6px rgba(0, 0, 0, 0.03)",
            },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontFamily: "Nunito",
          fontSize: 10,
          fontWeight: "600",
          marginBottom: Platform.OS === "web" ? 2 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </Tabs>
  )
}
