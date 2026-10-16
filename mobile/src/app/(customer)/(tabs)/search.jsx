import { useState, useEffect, useMemo, useRef } from "react"
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Search, ChefHat, SlidersHorizontal, X, ArrowLeft, UtensilsCrossed, AlertTriangle } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import KitchenCard from "../../../components/common/KitchenCard"
import DishCard from "../../../components/common/DishCard"
import Chip from "../../../components/common/Chip"
import FloatingCart from "../../../components/common/FloatingCart"
import { api } from "../../../lib/api"
import { toKitchenCard } from "../../../lib/kitchen"
import { getLocationPreference } from "../../../lib/locationPreference"

const filters = [
  { id: "all", label: "All" },
  { id: "hygiene", label: "Hygiene Verified" },
  { id: "rating", label: "Top Rated" },
  { id: "veg", label: "Pure Veg" },
  { id: "ration", label: "Ration" },
]

const sortOptions = [
  { id: "relevance", label: "Relevance" },
  { id: "rating", label: "Rating: High to Low" },
  { id: "delivery", label: "Fastest Delivery" },
  { id: "name", label: "Name A–Z" },
]

function parseDeliveryMinutes(str) {
  const match = String(str || "").match(/(\d+)/)
  return match ? Number(match[1]) : 99
}

function matchesQuery(kitchen, query) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    kitchen.name?.toLowerCase().includes(q) ||
    kitchen.speciality?.toLowerCase().includes(q) ||
    kitchen.city?.toLowerCase().includes(q) ||
    kitchen.bestItem?.toLowerCase().includes(q)
  )
}

function matchesFilter(kitchen, filterId) {
  switch (filterId) {
    case "hygiene":
      return kitchen.hygieneVerified
    case "rating":
      return kitchen.rating >= 4.5
    case "veg":
      return kitchen.kitchenType === "veg"
    case "ration":
      return /ration|grocery|essential/i.test(`${kitchen.speciality} ${kitchen.bestItem || ""}`)
    default:
      return true
  }
}

function sortKitchens(list, sortId) {
  const items = [...list]
  switch (sortId) {
    case "rating":
      return items.sort((a, b) => b.rating - a.rating)
    case "delivery":
      return items.sort((a, b) => parseDeliveryMinutes(a.deliveryTime) - parseDeliveryMinutes(b.deliveryTime))
    case "name":
      return items.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return items
  }
}

function FilterChip({ label, active, onPress }) {
  if (active) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ marginRight: 8 }}>
        <LinearGradient
          colors={["#0C4240", "#135E39"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            shadowColor: "#0C4240",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito", fontWeight: "bold" }}>
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E3DFD5",
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
      }}
    >
      <Text style={{ color: "#7A7A7A", fontSize: 13, fontFamily: "Nunito", fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default function SearchScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [showSort, setShowSort] = useState(false)

  const [userLocation, setUserLocation] = useState(null)
  const [dishes, setDishes] = useState([])
  const [searchingDishes, setSearchingDishes] = useState(false)
  const menuCacheRef = useRef({})

  const [prevCategory, setPrevCategory] = useState(null)

  // Sync category search query when changed from previous value during render
  if (params?.category && params.category !== prevCategory) {
    setPrevCategory(params.category)
    setQuery(params.category)
  }

  useEffect(() => {
    getLocationPreference().then((loc) => setUserLocation(loc))
  }, [])

  useEffect(() => {
    api("/api/kitchens")
      .then((data) => setKitchens(data.kitchens.map(toKitchenCard)))
      .catch((err) => console.log("Failed to load kitchens in search", err))
      .finally(() => setLoading(false))
  }, [])

  // Dish search effect (checks backend endpoint and client kitchens / menus)
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setDishes([])
      setSearchingDishes(false)
      return
    }

    let cancelled = false
    setSearchingDishes(true)

    const searchTimer = setTimeout(async () => {
      try {
        const userCity = userLocation?.city || ""

        // 1. Try backend search endpoint
        const apiRes = await api(
          `/api/menu/search-dishes?q=${encodeURIComponent(q)}&city=${encodeURIComponent(userCity)}`
        ).catch(() => null)

        if (cancelled) return

        if (apiRes && Array.isArray(apiRes.dishes) && apiRes.dishes.length > 0) {
          const sorted = [...apiRes.dishes].sort((a, b) => {
            if (a.isSignatureDish && !b.isSignatureDish) return -1
            if (!a.isSignatureDish && b.isSignatureDish) return 1
            return 0
          })
          setDishes(sorted)
          setSearchingDishes(false)
          return
        }

        // 2. Client-side fallback matching from kitchens' signature dishes & menus
        const matched = []
        const lowerQ = q.toLowerCase()

        for (const k of kitchens) {
          const sigDish = k.bestItem || k.best_item
          const isSigMatch = sigDish && sigDish.toLowerCase().includes(lowerQ)
          const isSpecMatch = k.speciality && k.speciality.toLowerCase().includes(lowerQ)

          const isCityMatch = userCity
            ? Boolean(
                k.city &&
                  (k.city.toLowerCase().trim() === userCity.toLowerCase().trim() ||
                    k.city.toLowerCase().includes(userCity.toLowerCase().trim()) ||
                    userCity.toLowerCase().includes(k.city.toLowerCase().trim()))
              )
            : true

          let menuItems = menuCacheRef.current[k.id]
          if (!menuItems) {
            try {
              const mRes = await api(`/api/menu/kitchen/${k.id}`).catch(() => null)
              if (mRes?.items) {
                menuCacheRef.current[k.id] = mRes.items
                menuItems = mRes.items
              }
            } catch {}
          }

          let addedFromMenu = false
          if (menuItems && Array.isArray(menuItems)) {
            for (const item of menuItems) {
              const itemNameMatches = Boolean(item.name && item.name.toLowerCase().includes(lowerQ))
              const itemIsSig = Boolean(sigDish && item.name && (item.name.toLowerCase().trim() === sigDish.toLowerCase().trim() || item.name.toLowerCase().includes(sigDish.toLowerCase()) || sigDish.toLowerCase().includes(item.name.toLowerCase())))

              // Only match if the dish itself matches the search query or is the matching signature dish
              if (itemNameMatches || (isSigMatch && itemIsSig)) {
                matched.push({
                  id: item.id,
                  dishName: item.name,
                  price: Number(item.price || 0),
                  kitchenName: k.name,
                  shortDescription: item.description || k.speciality || `Special dish by ${k.name}`,
                  kitchenId: k.id,
                  city: k.city,
                  state: k.state,
                  isCityMatch,
                  isSignatureDish: itemIsSig,
                  image: item.image || item.images?.[0] || null,
                })
                if (itemIsSig) addedFromMenu = true
              }
            }
          }

          if (!addedFromMenu && isSigMatch) {
            matched.push({
              id: null,
              dishName: sigDish,
              price: null,
              kitchenName: k.name,
              shortDescription: k.speciality || `Signature dish of ${k.name}`,
              kitchenId: k.id,
              city: k.city,
              state: k.state,
              isCityMatch,
              isSignatureDish: true,
              image: k.image || null,
            })
          }
        }

        // Sort: 1st priority = Signature dishes (line-wise), followed by regular food/grocery items
        matched.sort((a, b) => {
          if (a.isSignatureDish && !b.isSignatureDish) return -1
          if (!a.isSignatureDish && b.isSignatureDish) return 1
          return 0
        })

        if (!cancelled) {
          setDishes(matched)
        }
      } catch (err) {
        console.log("Dish search failed", err)
      } finally {
        if (!cancelled) setSearchingDishes(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(searchTimer)
    }
  }, [query, kitchens, userLocation])

  const results = useMemo(() => {
    const filtered = kitchens.filter((k) => matchesQuery(k, query) && matchesFilter(k, activeFilter))
    return sortKitchens(filtered, sortBy)
  }, [kitchens, query, activeFilter, sortBy])

  const clearSearch = () => setQuery("")

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-light/35">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/(tabs)/home"))}
          className="mr-3 p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-lg text-dark">
          Search Kitchens
        </Text>
      </View>

      <View className="p-4 bg-white border-b border-gray-light/35">
        {/* Search bar + sort toggle */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Gradient Border Search Input */}
          <LinearGradient
            colors={["#0C4240", "#C5A85A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 24, padding: 1.5 }}
          >
            <View style={{
              backgroundColor: "#FAF9F6",
              borderRadius: 22,
              flexDirection: "row",
              alignItems: "center",
              height: 48,
              paddingHorizontal: 12,
            }}>
              <Search size={18} color="#7A7A7A" style={{ marginRight: 8 }} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search kitchens, cities, food..."
                placeholderTextColor="#9A9A9A"
                style={{
                  flex: 1,
                  height: "100%",
                  fontSize: 14,
                  fontFamily: "Nunito",
                  color: "#1F1F1F",
                  paddingVertical: 0,
                }}
                autoCapitalize="none"
              />
              {query ? (
                <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
                  <X size={16} color="#7A7A7A" />
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>

          {/* Sort/Filter Button */}
          <TouchableOpacity
            onPress={() => setShowSort(!showSort)}
            activeOpacity={0.8}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: showSort ? "#0C4240" : "#FAF9F6",
              borderColor: showSort ? "#0C4240" : "#E3DFD5",
              borderWidth: showSort ? 0 : 1.5,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0C4240",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <SlidersHorizontal size={18} color={showSort ? "#FFFFFF" : "#7A7A7A"} />
          </TouchableOpacity>
        </View>

        {/* Mobile sort options dropdown */}
        {showSort ? (
          <View className="mt-3 p-3 bg-cream/50 rounded-xl border border-gray-light/50">
            <Text className="font-poppins font-bold text-[10px] text-gray uppercase tracking-wider mb-2">
              Sort by
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <Chip
                  key={opt.id}
                  active={sortBy === opt.id}
                  onPress={() => {
                    setSortBy(opt.id)
                    setShowSort(false)
                  }}
                  className="px-3 py-1.5"
                  textClassName="text-xs"
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        {/* Filter chips scrollable row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-3">
          {filters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              active={activeFilter === filter.id}
              onPress={() => setActiveFilter(filter.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results details */}
      <View className="px-4 pt-3 pb-1 flex-row justify-between items-center">
        <Text className="font-nunito text-gray text-xs">
          {loading || searchingDishes ? (
            "Searching..."
          ) : query.trim() ? (
            dishes.length > 0 ? (
              <Text>
                <Text className="font-bold text-dark">{dishes.length}</Text> dish{dishes.length !== 1 ? "es" : ""} found
              </Text>
            ) : (
              <Text>
                <Text className="font-bold text-dark">{results.length}</Text> kitchen{results.length !== 1 ? "s" : ""} found
              </Text>
            )
          ) : (
            <Text>
              <Text className="font-bold text-dark">{results.length}</Text> kitchen{results.length !== 1 ? "s" : ""} found
            </Text>
          )}
        </Text>
        {userLocation?.city ? (
          <Text className="font-nunito text-xs text-primary font-semibold">
            📍 {userLocation.city}
          </Text>
        ) : null}
      </View>

      {/* Results list */}
      {loading ? (
        <View className="flex-grow justify-center py-12">
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      ) : results.length === 0 && dishes.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow">
          <View className="py-20 items-center justify-center px-6">
            <ChefHat size={48} color="#7A7A7A" style={{ marginBottom: 16 }} />
            <Text className="font-poppins font-bold text-base text-dark">No kitchens or dishes match your search</Text>
            <Text className="font-nunito text-gray text-xs text-center mt-2 leading-relaxed max-w-[260px]">
              Try adjusting your spelling, choosing a different filter, or searching for other items.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4">
          <View className="pb-10 pt-2">
            {/* If all matching dishes are outside user's city, show prominent notice banner */}
            {query.trim() && dishes.length > 0 && userLocation?.city && dishes.every((d) => !d.isCityMatch) ? (
              <View
                style={{
                  backgroundColor: "#FEF2F2",
                  borderColor: "#FECACA",
                  borderWidth: 1.5,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AlertTriangle size={22} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins", fontSize: 13.5, fontWeight: "bold", color: "#991B1B" }}>
                    Not available in your city
                  </Text>
                  <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#B91C1C", marginTop: 2 }}>
                    "{query.trim()}" is not available in your city ({userLocation.city}). See options available in other cities below:
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Dish Cards section */}
            {dishes.length > 0 ? (
              <View className="mb-4">
                <View className="flex-row items-center gap-1.5 mb-2.5">
                  <UtensilsCrossed size={16} color="#0B6B3A" />
                  <Text className="font-poppins font-bold text-sm text-dark">
                    Dishes ({dishes.length})
                  </Text>
                </View>
                {dishes.map((dish, idx) => (
                  <DishCard
                    key={`${dish.kitchenId}_${dish.id || idx}`}
                    dish={dish}
                    userCity={userLocation?.city}
                    onPress={() =>
                      router.push({
                        pathname: `/(customer)/(tabs)/kitchen/${dish.kitchenId}`,
                        params: {
                          selectedItemId: dish.id || "",
                          dishName: dish.dishName,
                        },
                      })
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Kitchens section: shown when browsing or when no dishes matched search */}
            {results.length > 0 && dishes.length === 0 ? (
              <View>
                {results.map((kitchen) => (
                  <KitchenCard
                    key={kitchen.id}
                    kitchen={kitchen}
                    onPress={() => router.push(`/(customer)/(tabs)/kitchen/${kitchen.id}`)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
