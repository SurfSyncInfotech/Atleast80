import { Tabs } from "expo-router"
import { LayoutDashboard, UtensilsCrossed, User, ShoppingBag, HelpCircle } from "lucide-react-native"
import { Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBadges } from "../../../context/BadgeContext"

export default function KitchenTabsLayout() {
  const { enquiryUnreadCount, orderActiveCount } = useBadges()
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0B6B3A",
        tabBarInactiveTintColor: "#7A7A7A",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E8E8E8",
          height: Platform.OS === "ios" ? 88 : Platform.OS === "web" ? 64 : Math.max(68, 60 + insets.bottom),
          paddingBottom: Platform.OS === "ios" ? 28 : Platform.OS === "web" ? 8 : Math.max(8, insets.bottom + 4),
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
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <UtensilsCrossed size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <ShoppingBag size={20} color={color} />,
          tabBarBadge: orderActiveCount > 0 ? orderActiveCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#DC2626", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="enquiries"
        options={{
          title: "Enquiries",
          tabBarIcon: ({ color }) => <HelpCircle size={20} color={color} />,
          tabBarBadge: enquiryUnreadCount > 0 ? enquiryUnreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#DC2626", fontSize: 10 },
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
