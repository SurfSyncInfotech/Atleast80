import { useState, useEffect, useMemo } from "react"
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Search, ChefHat, SlidersHorizontal, X, ArrowLeft } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import KitchenCard from "../../../components/common/KitchenCard"
import Chip from "../../../components/common/Chip"
import FloatingCart from "../../../components/common/FloatingCart"
import { api } from "../../../lib/api"
import { toKitchenCard } from "../../../lib/kitchen"

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

  const [prevCategory, setPrevCategory] = useState(null)

  // Sync category search query when changed from previous value during render
  if (params?.category && params.category !== prevCategory) {
    setPrevCategory(params.category)
    setQuery(params.category)
  }

  useEffect(() => {
    api("/api/kitchens")
      .then((data) => setKitchens(data.kitchens.map(toKitchenCard)))
      .catch((err) => console.log("Failed to load kitchens in search", err))
      .finally(() => setLoading(false))
  }, [])

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
          onPress={() => router.back()}
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
          {loading ? (
            "Searching..."
          ) : (
            <Text>
              <Text className="font-bold text-dark">{results.length}</Text> kitchen{results.length !== 1 ? "s" : ""} found
            </Text>
          )}
        </Text>
      </View>

      {/* Results list */}
      {loading ? (
        <View className="flex-grow justify-center py-12">
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      ) : results.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow">
          <View className="py-20 items-center justify-center px-6">
            <ChefHat size={48} color="#7A7A7A" style={{ marginBottom: 16 }} />
            <Text className="font-poppins font-bold text-base text-dark">No kitchens match your search</Text>
            <Text className="font-nunito text-gray text-xs text-center mt-2 leading-relaxed max-w-[260px]">
              Try adjusting your spelling, choosing a different filter, or searching for other items.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4">
          <View className="pb-10 pt-2">
            {results.map((kitchen) => (
              <KitchenCard
                key={kitchen.id}
                kitchen={kitchen}
                onPress={() => router.push(`/(customer)/(tabs)/kitchen/${kitchen.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
