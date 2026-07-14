import { Tabs } from "expo-router"
import { Home, Compass, ChefHat, Clipboard, User } from "lucide-react-native"
import { View, Text, Platform } from "react-native"
import { useAuth } from "../../../context/AuthContext"

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

export default function CustomerTabsLayout() {
  const { isCustomer, user } = useAuth()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0B6B3A",
        tabBarInactiveTintColor: "#7A7A7A",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 72,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 8,
          ...Platform.select({
            web: {
              boxShadow: "0px -4px 12px rgba(0, 0, 0, 0.04)",
            },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 10,
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
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} fill={focused ? color : "none"} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Compass size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: "Stories",
          tabBarIcon: ({ color }) => (
            <ChefHat size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <Clipboard size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => {
            if (isCustomer && user?.name) {
              return (
                <View className={`w-7 h-7 rounded-full bg-primary items-center justify-center ${focused ? "border-2 border-primary" : ""}`}>
                  <Text className="text-white text-[10px] font-poppins font-bold">
                    {initials(user.name)}
                  </Text>
                </View>
              )
            }
            return <User size={22} color={color} />
          },
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="kitchen/[id]"
        options={{
          href: null,
          tabBarStyle: { display: "none" }
        }}
      />
    </Tabs>
  )
}
