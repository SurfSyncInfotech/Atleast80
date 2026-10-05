import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import {
  Star,
  Search,
  MapPin,
  CheckCircle2,
  X,
  ShieldCheck,
  LogOut
} from "lucide-react-native"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function AdminFeaturedKitchensScreen() {
  const router = useRouter()
  const { logout } = useAuth()

  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [actionId, setActionId] = useState(null)

  const loadKitchens = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api("/api/admin/kitchens/featured")
      setKitchens(data.kitchens || [])
    } catch (err) {
      console.error("Error loading featured kitchens:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadKitchens()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadKitchens])

  const toggleFeatured = async (kitchen) => {
    setActionId(kitchen.id)
    try {
      await api(`/api/admin/kitchens/${kitchen.id}/feature`, {
        method: "PATCH",
        body: JSON.stringify({ featured: !kitchen.is_featured }),
      })
      await loadKitchens()
    } catch (err) {
      Alert.alert("Error", err.message)
    } finally {
      setActionId(null)
    }
  }

  const featured = kitchens.filter((k) => k.is_featured)
  const query = searchInput.trim().toLowerCase()
  const approved = kitchens.filter((k) => {
    if (!query) return true
    return (
      k.name?.toLowerCase().includes(query) ||
      k.city?.toLowerCase().includes(query) ||
      k.speciality?.toLowerCase().includes(query)
    )
  })

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-light/35">
        <View className="flex-row items-center gap-2">
          <ShieldCheck size={22} color="#0B6B3A" />
          <Text className="font-poppins font-bold text-lg text-dark">
            Admin Console
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => logout().then(() => router.replace("/(admin)/login"))}
          className="bg-cream-dark/60 p-2 rounded-full"
        >
          <LogOut size={16} color="#7A7A7A" />
        </TouchableOpacity>
      </View>

      {/* Navigation tabs */}
      <View className="flex-row bg-white border-b border-gray-light/20">
        <TouchableOpacity
          onPress={() => router.push("/(admin)/dashboard")}
          className="flex-1 py-3 border-b-2 border-transparent items-center"
        >
          <Text className="font-poppins font-bold text-sm text-gray">Kitchens</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3 border-b-2 border-primary items-center flex-row justify-center gap-1.5"
        >
          <Star size={14} color="#0B6B3A" />
          <Text className="font-poppins font-bold text-sm text-primary">Featured</Text>
        </TouchableOpacity>
      </View>

      {/* Live on homepage highlight box */}
      {featured.length > 0 && (
        <View className="bg-white border-b border-primary/20 p-4">
          <Text className="font-poppins font-bold text-[10px] text-primary uppercase tracking-wider mb-2.5">
            Live on homepage ({featured.length})
          </Text>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {featured.map((k) => (
              <View
                key={k.id}
                className="flex-row items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"
              >
                <Star size={11} color="#0B6B3A" className="fill-primary" />
                <Text className="font-poppins font-bold text-[10px] text-primary">{k.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View className="bg-white border-b border-gray-light/35 p-3.5 gap-3">
        <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream/40 h-[44px]">
          <Search size={16} color="#7A7A7A" className="mr-2" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search approved kitchens..."
            placeholderTextColor="#7A7A7A"
            className="flex-1 h-full text-xs font-nunito text-dark"
          />
          {searchInput ? (
            <TouchableOpacity onPress={() => setSearchInput("")}>
              <X size={16} color="#7A7A7A" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      ) : approved.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} className="px-6">
          <Text className="font-poppins font-bold text-dark text-base text-center">
            No approved kitchens found
          </Text>
          <Text className="font-nunito text-sm text-gray text-center mt-1">
            Approve kitchens from the main console first, then feature them here
          </Text>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
          <View className="gap-3 py-2">
            {approved.map((k) => {
              const isActed = actionId === k.id
              return (
                <View
                  key={k.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 flex-row items-center gap-3",
                    k.is_featured ? "border-primary/30 shadow-sm" : "border-gray-light/60"
                  )}
                >
                  {/* First letter badge */}
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                    <Text className="font-poppins font-bold text-sm text-primary">
                      {k.name?.[0] || "K"}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="font-poppins font-bold text-xs text-dark truncate flex-shrink">
                        {k.name}
                      </Text>
                      {k.is_featured && (
                        <View className="flex-row items-center gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                          <Star size={9} color="#0B6B3A" className="fill-primary" />
                          <Text className="text-[8px] font-poppins font-bold text-primary">Featured</Text>
                        </View>
                      )}
                    </View>
                    <Text className="font-nunito text-[11px] text-gray truncate mt-0.5">{k.speciality}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <MapPin size={10} color="#7A7A7A" />
                      <Text className="font-nunito text-[10px] text-dark-light">{k.city}, {k.state}</Text>
                    </View>
                  </View>

                  {/* Toggle Button */}
                  <TouchableOpacity
                    onPress={() => toggleFeatured(k)}
                    disabled={isActed}
                    className={cn(
                      "flex-row items-center gap-1.5 px-3 py-2 rounded-lg border flex-shrink-0",
                      k.is_featured
                        ? "bg-amber-50 border-amber-200"
                        : "bg-primary border-primary"
                    )}
                  >
                    <Star
                      size={12}
                      color={k.is_featured ? "#D97706" : "#FFF"}
                      className={k.is_featured ? "fill-amber-500" : ""}
                    />
                    <Text
                      className={cn(
                        "font-poppins font-bold text-[10px]",
                        k.is_featured ? "text-amber-700" : "text-white"
                      )}
                    >
                      {isActed ? "..." : k.is_featured ? "Remove" : "Feature"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>

          <View className="flex-row items-center gap-1.5 px-1 py-4 mt-2">
            <CheckCircle2 size={14} color="#0B6B3A" />
            <Text className="font-nunito text-[10px] text-gray">
              {"Featured kitchens show in the \"Featured Kitchens\" section on the customer app home screen."}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
