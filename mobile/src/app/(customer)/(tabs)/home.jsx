import { useState, useEffect } from "react"
import { 
  View, Text, ScrollView, Image, TouchableOpacity, Platform, 
  Animated, useWindowDimensions, RefreshControl, Modal, Pressable, ActivityIndicator
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import {
  Search, ChevronRight, Info, UtensilsCrossed, Coffee,
  ShoppingCart, Package, MapPin, Bell, ShieldCheck, Handshake, ArrowRight, Scan,
  Home, User, CheckCircle2, ChefHat,
  Utensils, Salad, ShoppingBag, Soup, Milk, Cookie, Flame, Candy, Egg,
  ChevronDown, X
} from "lucide-react-native"
import VideoHero from "../../../components/home/VideoHero"
import StoryCircle from "../../../components/common/StoryCircle"
import KitchenCard from "../../../components/common/KitchenCard"
import SkeletonLoader from "../../../components/common/SkeletonLoader"
import { api } from "../../../lib/api"
import { resolveStoryGroups } from "../../../lib/media"
import { setCachedStoryGroups } from "../../../lib/storyCache"
import { toKitchenCard } from "../../../lib/kitchen"
import { cn } from "../../../lib/utils"
import { useCart } from "../../../context/CartContext"
import { getLocationPreference, setLocationPreference, matchesLocation } from "../../../lib/locationPreference"

const FALLBACK_LOCATIONS = {
  states: [
    { name: "Maharashtra", iso2: "MH" },
    { name: "Delhi", iso2: "DL" },
    { name: "Karnataka", iso2: "KA" },
    { name: "Gujarat", iso2: "GJ" },
    { name: "Uttar Pradesh", iso2: "UP" }
  ],
  cities: {
    MH: [
      { name: "Goregaon" },
      { name: "Mumbai" },
      { name: "Pune" },
      { name: "Thane" },
      { name: "Navi Mumbai" }
    ],
    DL: [
      { name: "New Delhi" },
      { name: "Dwarka" },
      { name: "Rohini" }
    ],
    KA: [
      { name: "Bengaluru" },
      { name: "Mysuru" },
      { name: "Mangaluru" }
    ],
    GJ: [
      { name: "Ahmedabad" },
      { name: "Surat" },
      { name: "Vadodara" }
    ],
    UP: [
      { name: "Noida" },
      { name: "Ghaziabad" },
      { name: "Lucknow" }
    ]
  }
}

const categories = [
  { id: 1, name: "Meals", icon: Utensils, color: "#0B6B3A", bg: "#EAF7EE", image: require("../../../../assets/images/categories/cat_meals.jpg") },
  { id: 2, name: "Healthy", icon: Salad, color: "#10B981", bg: "#E6F4EA", image: require("../../../../assets/images/categories/cat_healthy.jpg") },
  { id: 3, name: "Grocery", icon: ShoppingBag, color: "#3B82F6", bg: "#EBF5FB", image: require("../../../../assets/images/categories/cat_grocery.jpg") },
  { id: 4, name: "Tiffin", icon: Package, color: "#8B5CF6", bg: "#F5EEF8", image: require("../../../../assets/images/categories/cat_tiffin.jpg") },
  { id: 5, name: "Curry", icon: Soup, color: "#EF4444", bg: "#FDEDEC", image: require("../../../../assets/images/categories/cat_curry.jpg") },
  { id: 6, name: "Dairy", icon: Milk, color: "#06B6D4", bg: "#ECFEFF", image: require("../../../../assets/images/categories/cat_dairy.jpg") },
  { id: 7, name: "Snacks", icon: Cookie, color: "#F59E0B", bg: "#FEF3C7", image: require("../../../../assets/images/categories/cat_snacks.jpg") },
  { id: 8, name: "Pickles", icon: Flame, color: "#F97316", bg: "#FFEDD5", image: require("../../../../assets/images/categories/cat_pickles.jpg") },
  { id: 9, name: "Sweets", icon: Candy, color: "#EC4899", bg: "#FCE4EC", image: require("../../../../assets/images/categories/cat_sweets.jpg") },
  { id: 10, name: "Breakfast", icon: Egg, color: "#EAB308", bg: "#FEF9E7", image: require("../../../../assets/images/categories/cat_breakfast.jpg") },
]

const valuePillars = [
  {
    id: 1,
    title: "Homemade Meals",
    desc: "Fresh thalis, tiffins, and custom food cooked daily with fresh home ingredients.",
    icon: UtensilsCrossed,
    bg: "#FFF8E1",
    iconColor: "#0B6B3A",
  },
  {
    id: 2,
    title: "Hygiene Assured",
    desc: "Kitchens verified with daily hygiene scores and proof uploads.",
    icon: ShieldCheck,
    bg: "#E8F5E9",
    iconColor: "#0B6B3A",
  },
  {
    id: 3,
    title: "Daily Essentials",
    desc: "Handcrafted pickles, local dairy, pure spices, and grocery items.",
    icon: ShoppingCart,
    bg: "#FFF3E0",
    iconColor: "#FF6B00",
  },
]

// Reusable animated press feedback wrapper
function PressableScale({ children, onPress, className, style, activeOpacity = 0.9, ...props }) {
  const [scale] = useState(() => new Animated.Value(1))

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start()
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      className={className}
      style={[style, { transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const { width: windowWidth } = useWindowDimensions()
  const carouselWidth = windowWidth - 32 // Margin horizontal is 16 on each side
  const { itemCount } = useCart()

  // Alerts states & handlers
  const [alerts, setAlerts] = useState([])
  const [alertsModalVisible, setAlertsModalVisible] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true)
      const data = await api("/api/alerts")
      setAlerts(data.alerts || [])
    } catch (err) {
      console.log("Failed to load alerts:", err)
    } finally {
      setAlertsLoading(false)
    }
  }

  const handleDismissAlert = async (alertId) => {
    try {
      await api(`/api/alerts/${alertId}/dismiss`, { method: "POST" })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    } catch (err) {
      console.log("Failed to dismiss alert:", err)
    }
  }
  // Location Filter States
  const [location, setLocation] = useState({ state: "", city: "", stateIso: "" })
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
 
  const [tempState, setTempState] = useState("")
  const [tempStateIso, setTempStateIso] = useState("")
  const [tempCity, setTempCity] = useState("")
 
  const [statePickerVisible, setStatePickerVisible] = useState(false)
  const [cityPickerVisible, setCityPickerVisible] = useState(false)
 
  // Load location preference on mount
  useEffect(() => {
    getLocationPreference().then((loc) => {
      if (loc) {
        setLocation(loc)
        setTempState(loc.state)
        setTempStateIso(loc.stateIso)
        setTempCity(loc.city)
      }
    })
  }, [])
 
  // Load States list
  const loadStates = async () => {
    if (statesList.length > 0) return
    setStatesLoading(true)
    try {
      const data = await api("/api/locations/states")
      setStatesList(data.states || [])
    } catch (err) {
      console.warn("Failed to load states from API, using fallback locations:", err)
      setStatesList(FALLBACK_LOCATIONS.states)
    } finally {
      setStatesLoading(false)
    }
  }
 
  const handleSelectState = async (stateName, stateIso) => {
    setTempState(stateName)
    setTempStateIso(stateIso)
    setTempCity("")
    setStatePickerVisible(false)
 
    setCitiesLoading(true)
    try {
      const data = await api(`/api/locations/cities?state=${stateIso}`)
      setCitiesList(data.cities || [])
    } catch (err) {
      console.warn("Failed to load cities from API, using fallback locations:", err)
      setCitiesList(FALLBACK_LOCATIONS.cities[stateIso] || [])
    } finally {
      setCitiesLoading(false)
    }
  }
 
  const handleSelectCity = (cityName) => {
    setTempCity(cityName)
    setCityPickerVisible(false)
  }
 
  const handleSaveLocation = async () => {
    const next = await setLocationPreference({
      state: tempState,
      city: tempCity,
      stateIso: tempStateIso,
    })
    setLocation(next)
    setLocationModalVisible(false)
  }
 
  const handleClearLocation = async () => {
    const next = await setLocationPreference({ state: "", city: "", stateIso: "" })
    setTempState("")
    setTempStateIso("")
    setTempCity("")
    setCitiesList([])
    setLocation(next)
    setLocationModalVisible(false)
  }

  // Stories State
  const [storyGroups, setStoryGroups] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(true)

  // Kitchens State
  const [featuredKitchens, setFeaturedKitchens] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [featuredError, setFeaturedError] = useState(false)

  const [allKitchens, setAllKitchens] = useState([])
  const [allLoading, setAllLoading] = useState(true)
  const [allError, setAllError] = useState(false)

  // Filtered Kitchens computed client-side
  const filteredFeaturedKitchens = featuredKitchens.filter((k) => matchesLocation(k, location))
  const filteredAllKitchens = allKitchens.filter((k) => matchesLocation(k, location))

  // Interactive States
  const [scrolled, setScrolled] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  // Staggered Mount Animation
  const [fadeAnim] = useState(() => new Animated.Value(0))

  // Fetch story groups
  const loadStories = () => {
    setStoriesLoading(true)
    return api("/api/stories")
      .then((data) => {
        const groups = resolveStoryGroups(data.groups || data)
        setCachedStoryGroups(groups)
        setStoryGroups(groups)
      })
      .catch(() => { })
      .finally(() => setStoriesLoading(false))
  }

  // Fetch featured kitchens
  const loadFeatured = () => {
    setFeaturedLoading(true)
    setFeaturedError(false)
    return api("/api/kitchens/featured")
      .then((data) => {
        setFeaturedKitchens((data.kitchens || []).map(toKitchenCard))
      })
      .catch(() => {
        setFeaturedError(true)
      })
      .finally(() => setFeaturedLoading(false))
  }

  // Fetch all kitchens
  const loadAllKitchens = () => {
    setAllLoading(true)
    setAllError(false)
    return api("/api/kitchens")
      .then((data) => {
        setAllKitchens((data.kitchens || []).map(toKitchenCard))
      })
      .catch(() => {
        setAllError(true)
      })
      .finally(() => setAllLoading(false))
  }

  const handleRefresh = () => {
    setRefreshing(true)
    Promise.all([
      loadStories(),
      loadFeatured(),
      loadAllKitchens(),
      loadAlerts()
    ]).finally(() => {
      setRefreshing(false)
    })
  }

  useEffect(() => {
    const timer1 = setTimeout(loadStories, 0)
    const timer2 = setTimeout(loadFeatured, 0)
    const timer3 = setTimeout(loadAllKitchens, 0)
    const timer4 = setTimeout(loadAlerts, 0)

    // Stagger fade-in on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [fadeAnim])



  // Handle carousel scroll dot selection
  const handleCarouselScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x
    const index = Math.round(scrollOffset / carouselWidth)
    setActiveSlide(index)
  }

  return (
    <SafeAreaView className="flex-1 bg-[#E9ECF0]" edges={["top"]}>
      {/* Header (Navbar matching native guidelines with dynamic scroll shadow) */}
      <View 
        className="flex-col px-4 pt-3 pb-3 z-10 gap-3"
        style={[
          {
            backgroundColor: scrolled ? "#FFFFFF" : "#E9ECF0",
            borderBottomWidth: 1,
            borderBottomColor: scrolled ? "rgba(224, 224, 224, 0.2)" : "transparent",
          },
          scrolled ? Platform.select({
            web: { boxShadow: "0px 4px 12px rgba(31, 31, 31, 0.04)" },
            default: {
              shadowColor: "#1F1F1F",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 4,
            }
          }) : {}
        ]}
      >
        {/* Top Row: Brand & Location on Left, Icons on Right */}
        <View className="flex-row items-center justify-between">
          <View className="flex-col">
            <Text className="font-poppins font-extrabold text-xl text-primary leading-none">Atleast80</Text>
            <PressableScale
              className="flex-row items-center gap-1 mt-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                setLocationModalVisible(true)
                loadStates()
              }}
            >
              <MapPin size={11} color="#0B6B3A" />
              <Text className="text-[10px] font-nunito font-semibold text-gray" numberOfLines={1}>
                {location.city 
                  ? `${location.city}, ${location.state} ▼`
                  : location.state 
                    ? `${location.state} ▼`
                    : "Select Location ▼"}
              </Text>
            </PressableScale>
          </View>

          {/* Action Icons */}
          <View className="flex-row items-center gap-1.5">
            {/* Bell Icon (Notification) */}
            <PressableScale
              onPress={() => {
                loadAlerts()
                setAlertsModalVisible(true)
              }}
              className="p-2.5 rounded-full bg-white border border-white shadow-sm relative"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={Platform.select({
                web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.02)" },
                default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }
              })}
            >
              <Bell size={18} color={alerts.length > 0 ? "#0B6B3A" : "#7A7A7A"} />
              {alerts.length > 0 && (
                <View className="absolute top-1.5 right-1.5 bg-red-500 rounded-full w-2 h-2" />
              )}
            </PressableScale>

            {/* Shopping Cart Icon (with badge) */}
            <PressableScale
              onPress={() => router.push("/(customer)/cart")}
              className="relative p-2.5 rounded-full bg-white border border-white shadow-sm"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={Platform.select({
                web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.02)" },
                default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }
              })}
            >
              <ShoppingCart size={18} color="#0B6B3A" />
              {itemCount > 0 ? (
                <View className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent rounded-full items-center justify-center border border-white">
                  <Text className="text-[8px] font-poppins font-bold text-white leading-none">{itemCount}</Text>
                </View>
              ) : null}
            </PressableScale>
          </View>
        </View>

        {/* Bottom Row: Full Width Search Bar */}
        <PressableScale
          onPress={() => router.push("/(customer)/search")}
          activeOpacity={0.95}
          className="flex-row items-center h-12 bg-white rounded-2xl px-4 border border-white shadow-sm"
          style={Platform.select({
            web: { boxShadow: "0px 4px 10px rgba(0,0,0,0.04)" },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }
          })}
        >
          <Search size={16} color="#0B6B3A" style={{ marginRight: 8 }} />
          <Text className="text-gray/80 text-xs font-nunito flex-1" numberOfLines={1}>
            Search homemade food & essentials...
          </Text>
          <Scan size={16} color="#0B6B3A" />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-grow"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y
          if (y > 15 && !scrolled) {
            setScrolled(true)
          } else if (y <= 15 && scrolled) {
            setScrolled(false)
          }
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0B6B3A"]}
            tintColor="#0B6B3A"
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }} className="flex-grow">
          {/* Hero — swipeable banner */}
          <View className="rounded-[28px] overflow-hidden mt-4 mb-2 border border-white/70 shadow-sm bg-white">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
              snapToAlignment="center"
              snapToInterval={carouselWidth}
              decelerationRate="fast"
            >
              {/* Slide 1: Video Hero */}
              <View style={{ width: carouselWidth }} className="h-60 relative overflow-hidden">
                <VideoHero />
                <LinearGradient
                  colors={["rgba(10,31,19,0.95)", "rgba(10,31,19,0.5)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                    justifyContent: "center",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[10px] font-poppins font-semibold uppercase tracking-[0.24em] text-secondary/80">
                        Fresh today
                      </Text>
                      <Text className="font-poppins font-extrabold text-white text-xl leading-tight mt-1">
                        Home-cooked meals in one tap
                      </Text>
                      <Text className="font-nunito text-white/85 text-xs mt-2 leading-relaxed">
                        Find verified kitchens, comfort food, and daily essentials without the clutter.
                      </Text>
                      <PressableScale
                        onPress={() => router.push("/(customer)/search")}
                        className="mt-3.5 bg-secondary self-start px-6 py-2.5 rounded-full shadow-sm"
                      >
                        <Text className="text-[#0a1f13] font-poppins font-bold text-[10px] uppercase tracking-wider">
                          Explore kitchens
                        </Text>
                      </PressableScale>
                    </View>
                    <View className="w-14 h-14 rounded-2xl border border-white/20 items-center justify-center bg-white/10">
                      <Image
                        source={require("../../../../assets/images/logo.png")}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Slide 2: Trust/Social Promo */}
              <View style={{ width: carouselWidth }} className="h-60 bg-[#EAF7EE] p-5 justify-center relative">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="bg-primary/10 self-start px-2 py-0.5 rounded-md mb-2">
                      <Text className="text-[8px] font-poppins font-bold text-primary tracking-wider uppercase">
                        Neighborhood Trust
                      </Text>
                    </View>
                    <Text className="font-poppins font-extrabold text-dark text-lg leading-tight">
                      500+ Verified Home Kitchens
                    </Text>
                    <Text className="font-nunito text-gray text-xs mt-2 leading-relaxed">
                      Handcrafted thalis and meals cooked by passionate local chefs, rated 4.8★ by neighbors.
                    </Text>
                    <PressableScale
                      onPress={() => router.push("/(customer)/search")}
                      className="mt-4 bg-primary self-start px-5 py-2.5 rounded-full shadow-sm"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px] uppercase tracking-wider">
                        Order Now
                      </Text>
                    </PressableScale>
                  </View>
                  <Image
                    source={require("../../../../assets/images/indianwomen.png")}
                    style={{ width: 90, height: 90, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Slide 3: Hygiene Promo */}
              <View style={{ width: carouselWidth }} className="h-60 bg-[#FFF9F2] p-5 justify-center relative">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="bg-accent/10 self-start px-2 py-0.5 rounded-md mb-2">
                      <Text className="text-[8px] font-poppins font-bold text-accent tracking-wider uppercase">
                        Daily Hygiene Proof
                      </Text>
                    </View>
                    <Text className="font-poppins font-extrabold text-dark text-lg leading-tight">
                      Hygiene Certified Kitchens
                    </Text>
                    <Text className="font-nunito text-gray text-xs mt-2 leading-relaxed">
                      Every home chef uploads daily hygiene scores and ingredient proof for absolute peace of mind.
                    </Text>
                    <PressableScale
                      onPress={() => router.push("/(customer)/about")}
                      className="mt-4 bg-accent self-start px-5 py-2.5 rounded-full shadow-sm"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px] uppercase tracking-wider">
                        Learn More
                      </Text>
                    </PressableScale>
                  </View>
                  <Image
                    source={require("../../../../assets/images/grocery.png")}
                    style={{ width: 90, height: 90, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Animated dot pagination */}
          <View className="flex-row justify-center gap-1.5 mb-5">
            {[0, 1, 2].map((i) => {
              const active = i === activeSlide
              return (
                <View
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full",
                    active ? "w-4.5 bg-primary" : "w-1.5 bg-gray/30"
                  )}
                />
              )
            })}
          </View>

          {/* Core shortcuts / top menu row */}
          <View className="flex-row justify-between gap-1.5 mb-5">
            {[
              { 
                label: "Find Food", 
                action: () => router.push("/(customer)/search"), 
                bg: "#FBF6EE", 
                borderColor: "#F4EBDC",
                renderIcon: () => (
                  <View className="relative w-7 h-7 items-center justify-center">
                    <Search size={21} color="#0C4240" strokeWidth={2.4} />
                    <View style={{ position: "absolute", top: -2, right: -2 }}>
                      <MapPin size={9} color="#0C4240" fill="#0C4240" strokeWidth={1} />
                    </View>
                  </View>
                )
              },
              { 
                label: "My Orders", 
                action: () => router.push("/(customer)/orders"), 
                bg: "#E6F2F1", 
                borderColor: "#D1E6E3",
                renderIcon: () => (
                  <View className="relative w-7 h-7 items-center justify-center">
                    <Package size={21} color="#0C4240" strokeWidth={2.4} />
                    <View style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: "#E6F2F1", borderRadius: 5 }}>
                      <CheckCircle2 size={10} color="#0C4240" fill="#E6F2F1" strokeWidth={2.5} />
                    </View>
                  </View>
                )
              },
              { 
                label: "Stories", 
                action: () => router.push("/(customer)/(tabs)/stories"), 
                bg: "#EBEBEB", 
                borderColor: "#DFDFDF",
                renderIcon: () => (
                  <View className="relative w-7 h-7 items-center justify-center">
                    <Coffee size={19} color="#0C4240" strokeWidth={2.4} style={{ marginRight: 3, marginTop: 3 }} />
                    <View style={{ position: "absolute", top: -2, right: -2, borderWidth: 1.5, borderColor: "#0C4240", borderRadius: 3, padding: 0.5, backgroundColor: "#EBEBEB" }}>
                      <User size={8} color="#0C4240" strokeWidth={3} />
                    </View>
                  </View>
                )
              },
              { 
                label: "About Us", 
                action: () => router.push("/(customer)/about"), 
                bg: "#E6F2F1", 
                borderColor: "#D1E6E3",
                renderIcon: () => (
                  <Info size={21} color="#0C4240" strokeWidth={2.4} />
                )
              },
              { 
                label: "Kitchens", 
                action: () => router.push("/(customer)/search"), 
                bg: "#EBEBEB", 
                borderColor: "#DFDFDF",
                renderIcon: () => (
                  <View className="relative w-7 h-7 items-center justify-center">
                    <Home size={21} color="#0C4240" strokeWidth={2.4} />
                    <View style={{ position: "absolute", top: 7.5, alignSelf: "center" }}>
                      <ChefHat size={9} color="#0C4240" strokeWidth={2} />
                    </View>
                  </View>
                )
              },
            ].map((item) => {
              return (
                <PressableScale
                  key={item.label}
                  onPress={item.action}
                  className="flex-1 items-center justify-center rounded-[20px] border py-3 px-1 shadow-sm h-[94px]"
                  style={[
                    Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1.5 }
                    }),
                    { backgroundColor: item.bg, borderColor: item.borderColor }
                  ]}
                >
                  <View className="items-center justify-center mb-2.5 h-7">
                    {item.renderIcon()}
                  </View>
                  <Text className="font-poppins font-bold text-[9.5px] text-[#0C4240] text-center" numberOfLines={1}>{item.label}</Text>
                </PressableScale>
              )
            })}
          </View>

          {/* Quick category rail ("What's on your mind?") */}
          <View className="mb-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-poppins font-bold text-dark text-sm">{"What's on your mind?"}</Text>
              <Text className="font-nunito text-[11px] text-gray">Swipe left</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {categories.map((cat) => {
                const active = selectedCategory === cat.name
                const Icon = cat.icon

                return (
                  <PressableScale
                    key={cat.id}
                    onPress={() => {
                      const next = active ? null : cat.name
                      setSelectedCategory(next)
                      router.push({
                        pathname: "/(customer)/search",
                        params: { category: next },
                      })
                    }}
                    className="items-center mr-4"
                    style={{ width: 66 }}
                  >
                    <View 
                      className={cn(
                        "w-16 h-16 rounded-[22px] items-center justify-center bg-white border shadow-md mb-1.5", 
                        active ? "border-primary border-2" : "border-white",
                      )}
                      style={Platform.select({
                        web: { boxShadow: "0px 6px 12px rgba(0,0,0,0.04)" },
                        default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 }
                      })}
                    >
                      {cat.image ? (
                        <Image
                          source={cat.image}
                          style={{ width: 44, height: 44, borderRadius: 16 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: cat.bg }}>
                          <Icon size={20} color={cat.color} strokeWidth={2.4} />
                        </View>
                      )}
                    </View>
                    <Text className="font-poppins font-bold text-[10.5px] text-dark/95 text-center" numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </PressableScale>
                )
              })}
            </ScrollView>
          </View>

          {/* Homemade Meals promo banner */}
          <View 
            className="flex-row items-center bg-[#E2F0D9] rounded-[28px] overflow-hidden border border-white p-5 mb-5 shadow-md"
            style={Platform.select({
              web: { boxShadow: "0px 6px 16px rgba(0,0,0,0.05)" },
              default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 4 }
            })}
          >
            <View className="flex-1 pr-4">
              <Text className="font-poppins font-bold text-[#0B6B3A] text-base">Homemade Meals</Text>
              <Text className="font-nunito text-[#2E4A34] text-xs mt-1.5 mb-3.5 leading-relaxed font-semibold">
                Fresh thalis, custom curries, and comforting dishes cooked by passionate home chefs.
              </Text>
              <PressableScale
                onPress={() => router.push("/(customer)/about")}
                className="bg-[#0B6B3A] px-5 py-2.5 rounded-full self-start shadow-sm"
              >
                <Text className="text-white font-poppins font-bold text-[9px] uppercase tracking-wider">
                  OUR STORY
                </Text>
              </PressableScale>
            </View>
            <Image
              source={require("../../../../assets/images/about.png")}
              style={{ width: 100, height: 100, borderRadius: 50 }}
              resizeMode="cover"
            />
          </View>

          {/* Bento offerings grid section */}
          <View className="mb-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-poppins font-bold text-dark text-sm">Our Core Offerings</Text>
              <PressableScale onPress={() => router.push("/(customer)/search")} className="flex-row items-center">
                <Text className="font-poppins font-semibold text-[11px] text-primary mr-0.5">See All</Text>
                <ChevronRight size={11} color="#0B6B3A" />
              </PressableScale>
            </View>

            {/* Bento Grid layout */}
            {/* TODO: wire to real offerings data */}
            <View className="flex-row gap-3 h-48">
              {/* Left Large Card */}
              <PressableScale
                onPress={() => router.push("/(customer)/search")}
                activeOpacity={0.9}
                className="flex-1 rounded-[28px] overflow-hidden border border-white shadow-md relative bg-white"
                style={Platform.select({
                  web: { boxShadow: "0px 8px 16px rgba(0,0,0,0.06)" },
                  default: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 }
                })}
              >
                <Image
                  source={require("../../../../assets/images/fresh_thali.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.6)"]}
                  className="absolute inset-x-0 bottom-0 h-16 justify-end p-3.5"
                >
                  <Text className="text-white font-poppins font-bold text-xs">Fresh Thalis</Text>
                </LinearGradient>
              </PressableScale>

              {/* Right 2x2 Grid */}
              <View className="flex-1 flex-col gap-2.5">
                <View className="flex-1 flex-row gap-2.5">
                  <PressableScale
                    onPress={() => router.push({ pathname: "/(customer)/search", params: { category: "Healthy" } })}
                    className="flex-1 rounded-[18px] overflow-hidden border border-white relative bg-white shadow-sm"
                    style={Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }
                    })}
                  >
                    <Image
                      source={require("../../../../assets/images/salad_healthy.png")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.5)"]}
                      className="absolute inset-x-0 bottom-0 h-10 justify-end p-2"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px]">Salads</Text>
                    </LinearGradient>
                  </PressableScale>
                  <PressableScale
                    onPress={() => router.push({ pathname: "/(customer)/search", params: { category: "Dairy" } })}
                    className="flex-1 rounded-[18px] overflow-hidden border border-white relative bg-white shadow-sm"
                    style={Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }
                    })}
                  >
                    <Image
                      source={require("../../../../assets/images/local_dairy.png")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.5)"]}
                      className="absolute inset-x-0 bottom-0 h-10 justify-end p-2"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px]">Dairy</Text>
                    </LinearGradient>
                  </PressableScale>
                </View>
                <View className="flex-1 flex-row gap-2.5">
                  <PressableScale
                    onPress={() => router.push({ pathname: "/(customer)/search", params: { category: "Snacks" } })}
                    className="flex-1 rounded-[18px] overflow-hidden border border-white relative bg-white shadow-sm"
                    style={Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }
                    })}
                  >
                    <Image
                      source={require("../../../../assets/images/snacks_namkeen.png")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.5)"]}
                      className="absolute inset-x-0 bottom-0 h-10 justify-end p-2"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px]">Snacks</Text>
                    </LinearGradient>
                  </PressableScale>
                  <PressableScale
                    onPress={() => router.push({ pathname: "/(customer)/search", params: { category: "Sweets" } })}
                    className="flex-1 rounded-[18px] overflow-hidden border border-white relative bg-white shadow-sm"
                    style={Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }
                    })}
                  >
                    <Image
                      source={require("../../../../assets/images/indian_sweets.png")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.5)"]}
                      className="absolute inset-x-0 bottom-0 h-10 justify-end p-2"
                    >
                      <Text className="text-white font-poppins font-bold text-[9px]">Sweets</Text>
                    </LinearGradient>
                  </PressableScale>
                </View>
              </View>
            </View>
          </View>

          {/* "Why people love Atleast80" — feature cards */}
          <View className="mb-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-poppins font-bold text-dark text-sm">Why people love Atleast80</Text>
              <PressableScale onPress={() => router.push("/(customer)/about")} className="flex-row items-center">
                <Text className="font-poppins font-semibold text-[11px] text-primary mr-0.5">Our story</Text>
                <ChevronRight size={11} color="#0B6B3A" />
              </PressableScale>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {valuePillars.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <View
                    key={pillar.id}
                    className="w-56 bg-white border border-white rounded-[28px] p-4 mr-3 shadow-md"
                    style={Platform.select({
                      web: { boxShadow: "0px 6px 12px rgba(0,0,0,0.04)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 }
                    })}
                  >
                    <View
                      className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
                      style={{ backgroundColor: pillar.bg }}
                    >
                      <Icon size={18} color={pillar.iconColor} />
                    </View>
                    <Text className="font-poppins font-bold text-dark text-xs">{pillar.title}</Text>
                    <Text className="font-nunito text-gray text-[10px] mt-1.5 leading-relaxed">
                      {pillar.desc}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>
          </View>

          {/* Stories Section */}
          {storiesLoading ? (
            <View className="flex-row mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ width: 72, height: 72, marginRight: 14 }} className="rounded-full bg-white border border-gray-light animate-pulse" />
              ))}
            </View>
          ) : storyGroups.length > 0 ? (
            <View className="mb-6">
              <Text className="font-poppins font-bold text-dark text-base mb-3">
                {"Today's Stories"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {storyGroups.map((group, index) => {
                  const firstStory = group.stories?.[0]
                  const mediaUrl = firstStory?.mediaUrl
                  const isVideo =
                    firstStory?.mediaType === "video" ||
                    mediaUrl?.toLowerCase().endsWith(".mp4") ||
                    mediaUrl?.toLowerCase().endsWith(".mov")

                  return (
                    <StoryCircle
                      key={group.kitchenId}
                      story={{
                        id: group.kitchenId,
                        name: group.kitchenName,
                        image: group.kitchenImage,
                        previewImage: isVideo ? group.kitchenImage : mediaUrl,
                        mediaType: firstStory?.mediaType,
                        isVideo,
                      }}
                      onPress={() => {
                        router.push({
                          pathname: "/(customer)/storyViewer",
                          params: { groupIndex: index },
                        })
                      }}
                      className="mr-3"
                    />
                  )
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Featured Kitchens */}
          {/* Featured Kitchens */}
          {featuredLoading || (!featuredError && filteredFeaturedKitchens.length > 0) ? (
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-poppins font-bold text-dark text-base">
                  Featured Kitchens
                </Text>
                <PressableScale onPress={() => router.push("/(customer)/search")} className="flex-row items-center">
                  <Text className="text-primary font-poppins font-semibold text-xs mr-0.5">See All</Text>
                  <ChevronRight size={13} color="#0B6B3A" />
                </PressableScale>
              </View>
 
              {featuredLoading ? (
                <View className="flex-row flex-wrap -mx-1.5">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <View key={i} className="w-1/2 p-1.5">
                      <View className="bg-white rounded-[24px] border border-gray-light/35 overflow-hidden p-3 pb-4">
                        <SkeletonLoader className="h-28 w-full rounded-2xl" />
                        <SkeletonLoader className="h-3.5 w-3/4 rounded mt-4" />
                        <View className="flex-row gap-2 mt-2">
                          <SkeletonLoader className="h-3 w-10 rounded" />
                          <SkeletonLoader className="h-3 w-12 rounded" />
                        </View>
                        <SkeletonLoader className="h-3 w-16 rounded mt-3" />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex-row flex-wrap -mx-1.5">
                  {filteredFeaturedKitchens.map((kitchen) => (
                    <KitchenCard
                      key={kitchen.id}
                      kitchen={kitchen}
                      variant="grid"
                      onPress={() => router.push(`/(customer)/(tabs)/kitchen/${kitchen.id}`)}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
 
          {/* Explore More Kitchens */}
          <View className="mb-6">
            <View className="mb-3">
              <Text className="font-poppins font-bold text-dark text-base">
                Explore More
              </Text>
              <Text className="font-nunito text-gray text-xs mt-0.5">
                {location.city 
                  ? `Browse verified kitchens in ${location.city}`
                  : "Browse all verified kitchens near you"}
              </Text>
            </View>
 
            {allLoading ? (
              <View className="flex-row flex-wrap -mx-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} className="w-1/2 p-1.5">
                    <View className="bg-white rounded-[24px] border border-gray-light/35 overflow-hidden p-3 pb-4">
                      <SkeletonLoader className="h-28 w-full rounded-2xl" />
                      <SkeletonLoader className="h-3.5 w-3/4 rounded mt-4" />
                      <View className="flex-row gap-2 mt-2">
                        <SkeletonLoader className="h-3 w-10 rounded" />
                        <SkeletonLoader className="h-3 w-12 rounded" />
                      </View>
                      <SkeletonLoader className="h-3 w-16 rounded mt-3" />
                    </View>
                  </View>
                ))}
              </View>
            ) : allError ? (
              <View className="py-6 items-center bg-white rounded-2xl border border-gray-light/50">
                <Text className="text-gray text-xs mb-2">Failed to load kitchens</Text>
                <TouchableOpacity onPress={loadAllKitchens}>
                  <Text className="text-primary text-xs font-semibold">Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : filteredAllKitchens.length === 0 ? (
              <View className="py-8 items-center bg-white rounded-[28px] border border-gray-light/35 p-6 shadow-sm">
                <Text className="font-poppins font-bold text-dark text-sm text-center mb-1">No Kitchens Near You</Text>
                <Text className="font-nunito text-gray text-xs text-center mb-4 leading-normal">
                  {location.city 
                    ? `We don't have any registered kitchens in ${location.city} yet.` 
                    : "Please select a location to see nearby kitchens."}
                </Text>
                <TouchableOpacity 
                  onPress={() => setLocationModalVisible(true)}
                  style={{ backgroundColor: "#EAF7EE", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 13 }}>Change Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row flex-wrap -mx-1.5">
                {filteredAllKitchens.map((kitchen) => (
                  <KitchenCard
                    key={kitchen.id}
                    kitchen={kitchen}
                    variant="grid"
                    onPress={() => router.push(`/(customer)/(tabs)/kitchen/${kitchen.id}`)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Partner With Us CTA Section */}
          <View className="mb-8">
            <LinearGradient
              colors={["#0B6B3A", "#064d29"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 24,
                position: "relative",
                overflow: "hidden",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 4px 10px rgba(11, 107, 58, 0.15)",
                  },
                  default: {
                    shadowColor: "#0B6B3A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 4,
                  },
                }),
              }}
            >
              {/* Decorative background circles */}
              <View
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "rgba(244, 196, 0, 0.08)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: -30,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                }}
              />

              <View className="flex-row items-center gap-2 mb-3">
                <Handshake size={18} color="#F4C400" />
                <Text className="font-poppins font-bold text-secondary text-[11px] uppercase tracking-wider mt-0.5">
                  Partner With Us
                </Text>
              </View>

              <Text className="font-poppins font-extrabold text-white text-xl leading-tight mb-2">
                Own a home kitchen?{"\n"}Start selling today.
              </Text>

              <Text className="font-nunito text-white/80 text-xs leading-relaxed mb-5">
                Join 500+ verified home kitchens. List your meals, ration items, and reach thousands of customers who trust homemade food.
              </Text>

              <View className="items-center sm:items-start">
                <PressableScale
                  onPress={() => router.push("/(kitchen)/signup")}
                  className="w-full sm:w-auto bg-secondary px-6 py-3 rounded-full flex-row items-center justify-center gap-2 shadow-sm"
                >
                  <Text className="text-[#0a1f13] font-poppins font-bold text-xs uppercase tracking-wider">
                    Register Your Kitchen
                  </Text>
                  <ArrowRight size={14} color="#0a1f13" strokeWidth={2.5} />
                </PressableScale>
                <Text className="font-nunito text-white/50 text-[10px] mt-2 text-center w-full sm:text-left">
                  Free to register. Start earning in 24hrs.
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
      {/* Location Selector Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          onPress={() => setLocationModalVisible(false)}
        >
          <Pressable 
            style={{ 
              backgroundColor: "#FFFFFF", 
              borderTopLeftRadius: 32, 
              borderTopRightRadius: 32, 
              paddingHorizontal: 24, 
              paddingTop: 24, 
              paddingBottom: Platform.OS === "ios" ? 44 : 28, 
              maxHeight: "80%" 
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select Delivery Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#1F1F1F" />
              </TouchableOpacity>
            </View>
 
            {/* State Picker Box */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>State</Text>
              <TouchableOpacity
                onPress={() => setStatePickerVisible(true)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: "#E8E8E8",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text style={{ fontSize: 14, color: "#1F1F1F", fontFamily: "Nunito" }}>
                  {tempState || "Select State"}
                </Text>
                <ChevronDown size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
 
            {/* City Picker Box */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>City</Text>
              <TouchableOpacity
                disabled={!tempState}
                onPress={() => setCityPickerVisible(true)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: tempState ? "#E8E8E8" : "#F5F5F3",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: tempState ? "#FFFFFF" : "#F5F5F3",
                }}
              >
                <Text style={{ fontSize: 14, color: tempState ? "#1F1F1F" : "#7A7A7A", fontFamily: "Nunito" }}>
                  {tempCity || "Select City"}
                </Text>
                <ChevronDown size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
 
            {/* Buttons Row */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleSaveLocation}
                disabled={!tempState || !tempCity}
                style={{
                  backgroundColor: (!tempState || !tempCity) ? "#A3D3B8" : "#0B6B3A",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
 
              {(location.state || location.city) ? (
                <TouchableOpacity
                  onPress={handleClearLocation}
                  style={{
                    backgroundColor: "#F5F5F3",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* State Selection Overlay Modal */}
      <Modal
        visible={statePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStatePickerVisible(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          onPress={() => setStatePickerVisible(false)}
        >
          <Pressable 
            style={{ 
              backgroundColor: "#FFFFFF", 
              borderTopLeftRadius: 32, 
              borderTopRightRadius: 32, 
              paddingHorizontal: 24, 
              paddingTop: 24, 
              paddingBottom: Platform.OS === "ios" ? 44 : 28, 
              maxHeight: "80%" 
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select State</Text>
              <TouchableOpacity onPress={() => setStatePickerVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#1F1F1F" />
              </TouchableOpacity>
            </View>
 
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {statesLoading ? (
                <ActivityIndicator size="small" color="#0B6B3A" style={{ paddingVertical: 24 }} />
              ) : (
                statesList.map((stateItem) => (
                  <TouchableOpacity
                    key={stateItem.iso2}
                    onPress={() => handleSelectState(stateItem.name, stateItem.iso2)}
                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F5F5F3" }}
                  >
                    <Text style={{ fontSize: 16, color: "#1F1F1F", fontFamily: "Nunito" }}>{stateItem.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* City Selection Overlay Modal */}
      <Modal
        visible={cityPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityPickerVisible(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          onPress={() => setCityPickerVisible(false)}
        >
          <Pressable 
            style={{ 
              backgroundColor: "#FFFFFF", 
              borderTopLeftRadius: 32, 
              borderTopRightRadius: 32, 
              paddingHorizontal: 24, 
              paddingTop: 24, 
              paddingBottom: Platform.OS === "ios" ? 44 : 28, 
              maxHeight: "80%" 
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select City</Text>
              <TouchableOpacity onPress={() => setCityPickerVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#1F1F1F" />
              </TouchableOpacity>
            </View>
 
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {citiesLoading ? (
                <ActivityIndicator size="small" color="#0B6B3A" style={{ paddingVertical: 24 }} />
              ) : citiesList.length === 0 ? (
                <Text style={{ fontSize: 14, color: "#7A7A7A", textAlign: "center", paddingVertical: 24, fontFamily: "Nunito" }}>No cities found</Text>
              ) : (
                citiesList.map((cityItem, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectCity(cityItem.name)}
                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F5F5F3" }}
                  >
                    <Text style={{ fontSize: 16, color: "#1F1F1F", fontFamily: "Nunito" }}>{cityItem.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Alerts / Notifications Modal (Bottom Sheet Design) */}
      <Modal
        visible={alertsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          {/* Backdrop dismiss touch target */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setAlertsModalVisible(false)} 
            className="absolute inset-0"
          />
          
          <View className="bg-white rounded-t-[32px] p-6 max-h-[80%] min-h-[40%] flex-col relative shadow-2xl">
            {/* Top Handle Indicator */}
            <View className="w-12 h-1 bg-gray-light/40 rounded-full self-center mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4 border-b border-gray-light/10 pb-3">
              <View className="flex-row items-center gap-2">
                <Bell size={20} color="#0B6B3A" />
                <Text className="font-poppins font-extrabold text-lg text-dark">
                  Notifications
                </Text>
                {alerts.length > 0 && (
                  <View className="bg-primary/15 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-primary">{alerts.length} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setAlertsModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-100"
              >
                <X size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            {/* List */}
            {alertsLoading ? (
              <View className="flex-grow items-center justify-center py-20">
                <ActivityIndicator size="small" color="#0B6B3A" />
              </View>
            ) : alerts.length === 0 ? (
              <View className="flex-grow items-center justify-center py-16 px-6">
                <View className="w-16 h-16 rounded-full bg-cream items-center justify-center mb-4">
                  <Bell size={28} color="#7A7A7A" />
                </View>
                <Text className="font-poppins font-bold text-base text-dark">All caught up!</Text>
                <Text className="font-nunito text-xs text-gray text-center mt-2 leading-relaxed max-w-[240px]">
                  No new announcements or delivery updates from Atleast80 right now.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-grow mb-4">
                {alerts.map((alert) => (
                  <View
                    key={alert.id}
                    className="p-4 bg-slate-50/75 rounded-2xl border border-slate-100 mb-3 flex-row gap-3 items-start"
                  >
                    <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center mt-0.5">
                      <Bell size={15} color="#0B6B3A" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-poppins font-bold text-sm text-dark leading-snug">
                        {alert.title}
                      </Text>
                      <Text className="font-nunito text-xs text-gray-dark mt-1 leading-relaxed">
                        {alert.body}
                      </Text>
                      <Text className="font-nunito text-[10px] text-gray mt-2 font-bold">
                        {new Date(alert.createdAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDismissAlert(alert.id)}
                      className="px-2.5 py-1.5 bg-[#FDEDEC] rounded-lg border border-[#FCD2D1] self-start"
                    >
                      <Text className="text-[10px] font-poppins font-bold text-accent">Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
