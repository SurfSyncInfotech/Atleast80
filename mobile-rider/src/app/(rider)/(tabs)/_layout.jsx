import { Tabs } from "expo-router"
import { LayoutDashboard, User } from "lucide-react-native"
import { Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const PRIMARY = "#0B6B3A"
const INACTIVE = "#7A7A7A"

export default function RiderTabsLayout() {
  const insets = useSafeAreaInsets()
  const bottomInset = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8)
  const tabBarHeight = 56 + bottomInset

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E8E8E8",
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
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
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: "Nunito",
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
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
