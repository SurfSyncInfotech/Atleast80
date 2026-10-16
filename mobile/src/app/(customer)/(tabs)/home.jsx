import { useState, useEffect, useRef, useCallback } from "react"
import {
  View, Text, ScrollView, Image, TouchableOpacity, Platform,
  Animated, useWindowDimensions, RefreshControl, Modal, Pressable, ActivityIndicator, Alert, TextInput
} from "react-native"
import * as Location from "expo-location"
import * as Notifications from "expo-notifications"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import {
  Search, ChevronRight, Info, UtensilsCrossed, Coffee,
  ShoppingCart, Package, MapPin, Bell, ShieldCheck, Handshake, ArrowRight, Scan, Truck,
  Home, User, CheckCircle2, ChefHat, FileText, MessageSquare,
  Utensils, Salad, ShoppingBag, Soup, Milk, Cookie, Flame, Candy, Egg,
  ChevronDown, X, Navigation, Check
} from "lucide-react-native"
import VideoHero from "../../../components/home/VideoHero"
import StoryCircle from "../../../components/common/StoryCircle"
import KitchenCard from "../../../components/common/KitchenCard"
import SkeletonLoader from "../../../components/common/SkeletonLoader"
import LocationMapModal from "../../../components/common/LocationMapModal"
import { api } from "../../../lib/api"
import { resolveStoryGroups, resolveMediaUrl } from "../../../lib/media"
import { setCachedStoryGroups } from "../../../lib/storyCache"
import { toKitchenCard } from "../../../lib/kitchen"
import { cn } from "../../../lib/utils"
import { useCart } from "../../../context/CartContext"
import { getLocationPreference, setLocationPreference, matchesLocation } from "../../../lib/locationPreference"

const FALLBACK_LOCATIONS = {
  states: [
    { name: "Maharashtra", iso2: "MH" },
    { name: "Andhra Pradesh", iso2: "AP" },
    { name: "Arunachal Pradesh", iso2: "AR" },
    { name: "Assam", iso2: "AS" },
    { name: "Bihar", iso2: "BR" },
    { name: "Chandigarh", iso2: "CH" },
    { name: "Chhattisgarh", iso2: "CG" },
    { name: "Delhi", iso2: "DL" },
    { name: "Goa", iso2: "GA" },
    { name: "Gujarat", iso2: "GJ" },
    { name: "Haryana", iso2: "HR" },
    { name: "Himachal Pradesh", iso2: "HP" },
    { name: "Jammu and Kashmir", iso2: "JK" },
    { name: "Jharkhand", iso2: "JH" },
    { name: "Karnataka", iso2: "KA" },
    { name: "Kerala", iso2: "KL" },
    { name: "Ladakh", iso2: "LA" },
    { name: "Madhya Pradesh", iso2: "MP" },
    { name: "Manipur", iso2: "MN" },
    { name: "Meghalaya", iso2: "ML" },
    { name: "Mizoram", iso2: "MZ" },
    { name: "Nagaland", iso2: "NL" },
    { name: "Odisha", iso2: "OR" },
    { name: "Puducherry", iso2: "PY" },
    { name: "Punjab", iso2: "PB" },
    { name: "Rajasthan", iso2: "RJ" },
    { name: "Sikkim", iso2: "SK" },
    { name: "Tamil Nadu", iso2: "TN" },
    { name: "Telangana", iso2: "TG" },
    { name: "Tripura", iso2: "TR" },
    { name: "Uttar Pradesh", iso2: "UP" },
    { name: "Uttarakhand", iso2: "UK" },
    { name: "West Bengal", iso2: "WB" }
  ],
  cities: {
    MH: [
      { name: "Raigad" },
      { name: "Roha" },
      { name: "Kolad" },
      { name: "Mumbai" },
      { name: "Goregaon" },
      { name: "Pune" },
      { name: "Thane" },
      { name: "Navi Mumbai" },
      { name: "Nagpur" },
      { name: "Nashik" },
      { name: "Aurangabad" }
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

const FESTIVAL_DEFAULT_IMG = require("../../../../assets/images/festival_offer_default.jpg")

function FestivalOfferThumb({ uri, style, resizeMode = "cover" }) {
  const [hasError, setHasError] = useState(false)
  const isDefaultOrEmpty = !uri || typeof uri !== "string" || uri.includes("festival_offer_default") || hasError

  if (isDefaultOrEmpty) {
    return <Image source={FESTIVAL_DEFAULT_IMG} style={style} resizeMode={resizeMode} />
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
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

  const handleAlertClick = async (alertItem) => {
    if (alertItem.title?.toLowerCase().includes("rescue") || alertItem.body?.toLowerCase().includes("rescue")) {
      try {
        const res = await api("/api/orders/rescue/available")
        if (res.orders && res.orders.length > 0) {
          setAlertsModalVisible(false)
          router.push(`/(customer)/rescue/${res.orders[0].id}`)
          return
        }
      } catch (err) {
        console.log("Failed to load active rescue order:", err)
      }
    }
  }
  // Location Filter States
  const [location, setLocation] = useState({ state: "", city: "", stateIso: "" })
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [isMapModalVisible, setIsMapModalVisible] = useState(false)
  const [statesList, setStatesList] = useState(FALLBACK_LOCATIONS.states)
  const [citiesList, setCitiesList] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
 
  const [tempState, setTempState] = useState("")
  const [tempStateIso, setTempStateIso] = useState("")
  const [tempCity, setTempCity] = useState("")
  const [tempAddress, setTempAddress] = useState("")
  const [tempPincode, setTempPincode] = useState("")
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [stateSearchQuery, setStateSearchQuery] = useState("")
  const [citySearchQuery, setCitySearchQuery] = useState("")

  useEffect(() => {
    if (locationModalVisible) {
      setTempState(location.state || "")
      setTempStateIso(location.stateIso || "")
      setTempCity(location.city || "")
      setTempAddress(location.address || "")
      setTempPincode(location.pincode || "")
    }
  }, [locationModalVisible, location])

  const handleConfirmMapLocation = async (data) => {
    if (!data) return
    let { address, city, state, pincode, suburb, latitude, longitude } = data

    if (suburb && address && !address.toLowerCase().includes(suburb.toLowerCase())) {
      suburb = ""
    }
    if (address) {
      const parts = address.split(",").map(p => p.trim()).filter(Boolean)
      if (parts.length > 0 && (!city || !address.toLowerCase().includes(city.toLowerCase()))) {
        city = parts[0]
      }
    }

    const nextLoc = await setLocationPreference({
      state: state || "",
      city: city || "",
      suburb: suburb || "",
      stateIso: state || "",
      address: address || "",
      pincode: pincode || "",
      lat: latitude || null,
      lng: longitude || null
    })
    setLocation(nextLoc)
    setTempState(nextLoc.state || "")
    setTempCity(nextLoc.city || "")
    setTempAddress(nextLoc.address || "")
    setTempPincode(nextLoc.pincode || "")
    setIsMapModalVisible(false)
  }

  const handleAutoDetectLocation = async () => {
    setDetectingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to auto-detect your location.")
        setDetectingLocation(false)
        return
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = loc.coords

      let data = null
      try {
        data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)
      } catch (err) {
        console.warn("SurfSync reverse geocode error:", err)
      }

      if (data) {
        const addr = data.address || {}
        const state = data.state || addr.state || ""
        const city = data.city || data.suburb || data.district || addr.city || addr.town || addr.village || addr.county || ""
        const road = data.suburb || addr.road || addr.suburb || addr.neighbourhood || ""
        const houseNumber = addr.house_number || ""
        const postcode = data.postcode || addr.postcode || ""

        let streetAddress = data.formattedAddress || data.displayName || [houseNumber, road].filter(Boolean).join(", ")
        if (!streetAddress && data.display_name) {
          streetAddress = data.display_name.split(",").slice(0, 2).map(s => s.trim()).join(", ")
        }

        let detectedIso = ""
        if (state) {
          const displayState = state.charAt(0).toUpperCase() + state.slice(1)
          setTempState(displayState)
          const matchedStateObj = FALLBACK_LOCATIONS.states.find(
            (s) => s.name.toLowerCase() === state.toLowerCase()
          )
          detectedIso = matchedStateObj ? matchedStateObj.iso2 : ""
          setTempStateIso(detectedIso)
        } else {
          setTempState("")
          setTempStateIso("")
        }

        let displayCity = ""
        if (city) {
          displayCity = city.charAt(0).toUpperCase() + city.slice(1)
          setTempCity(displayCity)
        } else {
          setTempCity("")
        }

        setTempAddress(streetAddress)
        setTempPincode(postcode)

        // Load cities for detected state so city picker dropdown has options
        if (detectedIso || state) {
          try {
            let fetched = []
            if (detectedIso) {
              const cData = await api(`/api/locations/cities?state=${detectedIso}`)
              fetched = cData.cities || []
            }
            if (fetched.length === 0 && detectedIso) {
              fetched = FALLBACK_LOCATIONS.cities[detectedIso] || []
            }
            if (displayCity && !fetched.some((c) => c.name?.toLowerCase() === displayCity.toLowerCase())) {
              fetched = [{ name: displayCity }, ...fetched]
            }
            setCitiesList(fetched.length > 0 ? fetched : displayCity ? [{ name: displayCity }] : [])
          } catch (e) {
            console.warn("Error fetching cities after auto detect:", e)
            if (displayCity) {
              setCitiesList([{ name: displayCity }])
            }
          }
        } else if (displayCity) {
          setCitiesList([{ name: displayCity }])
        }

        if (!state && !city) {
          Alert.alert("Location Error", "Could not resolve your location. Please select manually.")
        }
      } else {
        Alert.alert("Location Error", "Could not resolve your location. Please select manually.")
      }
    } catch (err) {
      Alert.alert("Location Error", "Failed to detect location: " + err.message)
    } finally {
      setDetectingLocation(false)
    }
  }
 
  const [statePickerVisible, setStatePickerVisible] = useState(false)
  const [cityPickerVisible, setCityPickerVisible] = useState(false)
 
  // Load and auto-detect location preference on mount
  useEffect(() => {
    const startupLocation = async () => {
      try {
        const loc = await getLocationPreference()
        if (loc && loc.isCleared) {
          // User explicitly cleared location: respect decision and don't auto-detect
          setLocation(loc)
          setTempState("")
          setTempStateIso("")
          setTempCity("")
          setTempAddress("")
          setTempPincode("")
          return
        }

        if (loc && (loc.state || loc.city)) {
          setLocation(loc)
          setTempState(loc.state || "")
          setTempStateIso(loc.stateIso || "")
          setTempCity(loc.city || "")
          setTempAddress(loc.address || "")
          setTempPincode(loc.pincode || "")
          return
        }

        // First launch or no preference set: Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === "granted") {
          const gpsLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          const { latitude, longitude } = gpsLoc.coords
          let data = null
          try {
            data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)
          } catch (err) {
            console.warn("SurfSync reverse geocode error:", err)
          }

          if (data) {
            const addr = data.address || {}
            const state = data.state || addr.state || ""
            const city = data.city || data.suburb || data.district || addr.city || addr.town || addr.village || addr.county || ""
            const road = data.suburb || addr.road || addr.suburb || addr.neighbourhood || ""
            const houseNumber = addr.house_number || ""
            const postcode = data.postcode || addr.postcode || ""

            let streetAddress = data.formattedAddress || data.displayName || [houseNumber, road].filter(Boolean).join(", ")
            if (!streetAddress && data.display_name) {
              streetAddress = data.display_name.split(",").slice(0, 2).map(s => s.trim()).join(", ")
            }

            if (state && city) {
              const displayState = state.charAt(0).toUpperCase() + state.slice(1)
              const displayCity = city.charAt(0).toUpperCase() + city.slice(1)

              const matchedStateObj = FALLBACK_LOCATIONS.states.find(
                (s) => s.name.toLowerCase() === state.toLowerCase()
              )
              const stateIso = matchedStateObj ? matchedStateObj.iso2 : ""

              const updated = await setLocationPreference({ 
                state: displayState, 
                city: displayCity, 
                stateIso,
                address: streetAddress,
                pincode: postcode,
                isCleared: false,
              })
              setLocation(updated)
              setTempState(displayState)
              setTempStateIso(stateIso)
              setTempCity(displayCity)
              setTempAddress(streetAddress)
              setTempPincode(postcode)
              return
            }
          }
        }
      } catch (err) {
        console.warn("Startup location load/auto-detect failed:", err)
      }
    }
    startupLocation()
    loadStates()
  }, [])

  // Sync stored location preference if user changed address in profile or checkout
  useFocusEffect(
    useCallback(() => {
      getLocationPreference().then((loc) => {
        if (loc && !loc.isCleared && (loc.state || loc.city || loc.address)) {
          setLocation((prev) => {
            if (
              prev?.city !== loc.city ||
              prev?.address !== loc.address ||
              prev?.pincode !== loc.pincode ||
              prev?.state !== loc.state
            ) {
              setTempState(loc.state || "")
              setTempStateIso(loc.stateIso || "")
              setTempCity(loc.city || "")
              setTempAddress(loc.address || "")
              setTempPincode(loc.pincode || "")
              return loc
            }
            return prev
          })
        }
      }).catch(() => {})
    }, [])
  )

  // Load States list
  const loadStates = async () => {
    try {
      const data = await api("/api/locations/states")
      if (data?.states && data.states.length > 0) {
        setStatesList(data.states)
      }
    } catch (err) {
      console.warn("Failed to load states from API, using fallback locations:", err)
    }
  }

  const handleSelectState = async (stateName, stateIso) => {
    setTempState(stateName)
    setTempStateIso(stateIso)
    setTempCity("")
    setStatePickerVisible(false)

    setCitiesLoading(true)
    const controller = new AbortController()
    try {
      const data = await api(`/api/locations/cities?state=${stateIso}`, { signal: controller.signal })
      setCitiesList(data.cities || [])
    } catch (err) {
      if (err?.name === "AbortError") return // user navigated away, ignore
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
      suburb: "",
      stateIso: tempStateIso,
      address: tempAddress,
      pincode: tempPincode,
      isCleared: !tempCity && !tempState,
    })
    setLocation(next)
    setLocationModalVisible(false)
  }

  const handleClearLocation = async () => {
    const next = await setLocationPreference({ 
      state: "", 
      city: "", 
      stateIso: "", 
      address: "", 
      pincode: "", 
      isCleared: true 
    })
    setTempState("")
    setTempStateIso("")
    setTempCity("")
    setTempAddress("")
    setTempPincode("")
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

  const hasLocation = Boolean((location?.city && location.city.trim()) || (location?.state && location.state.trim()))

  // Filtered Kitchens computed client-side (strictly for user selected location)
  const filteredFeaturedKitchens = hasLocation ? featuredKitchens.filter((k) => matchesLocation(k, location)) : []
  const filteredAllKitchens = hasLocation ? allKitchens.filter((k) => matchesLocation(k, location)) : []

  const festivalKitchens = (hasLocation ? filteredFeaturedKitchens.concat(filteredAllKitchens) : featuredKitchens.concat(allKitchens))
    .filter((k, index, self) => index === self.findIndex((t) => String(t.id) === String(k.id)))
    .filter((k) => Boolean(k.festivalOffer?.active))

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

  // Live polling so festival offers and kitchen details sync instantly
  useEffect(() => {
    const interval = setInterval(() => {
      api("/api/kitchens/featured")
        .then((data) => {
          if (data?.kitchens) {
            setFeaturedKitchens(data.kitchens.map(toKitchenCard))
          }
        })
        .catch(() => {})

      api("/api/kitchens")
        .then((data) => {
          if (data?.kitchens) {
            setAllKitchens(data.kitchens.map(toKitchenCard))
          }
        })
        .catch(() => {})
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  const [quotationToast, setQuotationToast] = useState(null)
  const shownQuotationIdsRef = useRef(new Set())
  const isInitialPollRef = useRef(true)

  // Auto-remove quotation popup after 5 seconds
  useEffect(() => {
    if (quotationToast) {
      const timer = setTimeout(() => {
        setQuotationToast(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [quotationToast])

  // Listen for incoming foreground push notifications or live status check
  useEffect(() => {
    let sub
    try {
      sub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request?.content?.data
        if (data && (data.type === "quotation_reply" || data.type === "quotation" || data.type === "chat_message")) {
          const key = `push_${data.enquiryId || Date.now()}_${data.type}`
          if (!shownQuotationIdsRef.current.has(key)) {
            shownQuotationIdsRef.current.add(key)
            setQuotationToast({
              id: key,
              kitchenId: data.kitchenId,
              kitchenName: data.kitchenName || "Kitchen",
              quotationAmount: data.quotationAmount || "",
              message: data.message || "",
              isMessage: data.type === "chat_message",
            })
          }
        }
      })
    } catch (e) {
      // notification fallback
    }

    // Interval check for newly quoted bulk enquiries or new chat messages
    const checkQuotations = async () => {
      try {
        const data = await api("/api/bulk-enquiries/mine").catch(() => null)
        if (data && Array.isArray(data.enquiries)) {
          if (isInitialPollRef.current) {
            // Seed all existing enquiries on app launch so old state never pops up on app open
            data.enquiries.forEach((e) => {
              const changeKey = `${e.id}_${e.customerUnreadCount}_${e.quotationAmount || 0}_${e.status}_${e.lastMessage || ""}`
              shownQuotationIdsRef.current.add(changeKey)
            })
            isInitialPollRef.current = false
            return
          }

          const newlyQuoted = data.enquiries.find((e) => {
            if (e.customerUnreadCount > 0 || e.status === "quoted") {
              const changeKey = `${e.id}_${e.customerUnreadCount}_${e.quotationAmount || 0}_${e.status}_${e.lastMessage || ""}`
              return !shownQuotationIdsRef.current.has(changeKey)
            }
            return false
          })

          if (newlyQuoted) {
            const changeKey = `${newlyQuoted.id}_${newlyQuoted.customerUnreadCount}_${newlyQuoted.quotationAmount || 0}_${newlyQuoted.status}_${newlyQuoted.lastMessage || ""}`
            shownQuotationIdsRef.current.add(changeKey)

            const isChatMessage = newlyQuoted.customerUnreadCount > 0 && newlyQuoted.lastMessageSenderId !== newlyQuoted.customerId

            setQuotationToast({
              id: changeKey,
              kitchenId: newlyQuoted.kitchenId,
              kitchenName: newlyQuoted.kitchenName || "Kitchen",
              quotationAmount: newlyQuoted.quotationAmount || newlyQuoted.estimatedValue || "",
              message: newlyQuoted.lastMessage || "",
              isMessage: isChatMessage,
            })
          }
        }
      } catch (err) {
        // silent
      }
    }
    const interval = setInterval(checkQuotations, 2500)
    checkQuotations()

    return () => {
      if (sub && sub.remove) sub.remove()
      clearInterval(interval)
    }
  }, [])



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
          <View className="flex-col flex-1 mr-2">
            <Text className="font-poppins font-extrabold text-xl text-primary leading-none">Atleast80</Text>
            <PressableScale
              className="flex-row items-center gap-1 mt-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                setIsMapModalVisible(true)
              }}
            >
              <MapPin size={12} color="#0B6B3A" />
              <Text className="text-[11px] font-nunito font-semibold text-gray-700 flex-shrink pr-2" numberOfLines={1} ellipsizeMode="tail">
                {location.city
                  ? `${location.suburb && location.suburb.toLowerCase() !== location.city.toLowerCase() ? location.suburb + ", " : ""}${location.city}${location.state ? ", " + location.state : ""}${location.pincode ? " " + location.pincode : ""} ▼`
                  : location.address
                  ? `${location.address.substring(0, 30).trim()}... ▼`
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
              onPress={() => router.push("/cart")}
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
            Search homemade food &amp; essentials...
          </Text>
          <Scan size={16} color="#0B6B3A" />
        </PressableScale>

        {/* In-App Quotation Notification Popup (Right Below Search Input Bar - 5 Seconds Auto Remove & Premium Styling) */}
        {quotationToast && (
          <View className="mt-2.5 bg-[#0B6B3A] border border-emerald-400/40 rounded-2xl p-3 shadow-xl flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                const targetKitchenId = quotationToast.kitchenId
                setQuotationToast(null)
                if (targetKitchenId) {
                  router.push(`/(customer)/(tabs)/kitchen/${targetKitchenId}`)
                }
              }}
              activeOpacity={0.85}
              className="flex-row items-center gap-3 flex-1"
            >
              <View className="w-9.5 h-9.5 rounded-xl bg-amber-400/25 border border-amber-300/40 items-center justify-center">
                {quotationToast.isMessage ? (
                  <MessageSquare size={18} color="#FBBF24" />
                ) : (
                  <FileText size={18} color="#FBBF24" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-poppins font-bold text-xs text-amber-300">
                    {quotationToast.isMessage ? `New Message! 💬` : `Quotation Received! 📜`}
                  </Text>
                  <View className="bg-amber-400/20 px-1.5 py-0.5 rounded-full">
                    <Text className="font-poppins font-bold text-[9px] text-amber-200">5s</Text>
                  </View>
                </View>
                <Text className="font-nunito font-semibold text-xs text-white mt-0.5" numberOfLines={1}>
                  {quotationToast.kitchenName || "Kitchen"}: {quotationToast.isMessage ? `"${quotationToast.message || "Sent a message"}"` : `Replied with quote (₹${quotationToast.quotationAmount})`}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setQuotationToast(null)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 ml-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
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
                      <Text 
                        className="font-poppins font-extrabold text-white text-[19px] leading-[23px] mt-1"
                        style={Platform.select({ web: { wordBreak: "keep-all", hyphens: "none" } })}
                      >
                        Home-Cooked{"\n"}Meals in One Tap
                      </Text>
                      <Text className="font-nunito text-white/85 text-xs mt-1.5 leading-relaxed">
                        Find verified kitchens, comfort food, and daily essentials without the clutter.
                      </Text>
                      <PressableScale
                        onPress={() => router.push("/(customer)/search")}
                        className="mt-3 bg-secondary self-start px-5 py-2 rounded-full shadow-sm"
                      >
                        <Text className="text-[#0a1f13] font-poppins font-bold text-[9.5px] uppercase tracking-wider">
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
          <View className="flex-row justify-between gap-1 mb-5">
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
                  className="flex-1 items-center justify-center rounded-[18px] border py-2 px-0.5 shadow-sm h-[88px]"
                  style={[
                    Platform.select({
                      web: { boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" },
                      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1.5 }
                    }),
                    { backgroundColor: item.bg, borderColor: item.borderColor }
                  ]}
                >
                  <View className="items-center justify-center mb-1.5 h-6">
                    {item.renderIcon()}
                  </View>
                  <Text 
                    className="font-poppins font-bold text-[8.5px] text-[#0C4240] text-center" 
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {item.label}
                  </Text>
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

          {/* Festival Specials & Flash Deals Curiosity Showcase */}
          {festivalKitchens.length > 0 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base">🎉</Text>
                  <Text className="font-poppins font-bold text-dark text-base">
                    Festival Specials & Deals
                  </Text>
                </View>
                <View className="bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-sm">
                  <Text className="text-amber-800 text-[9px] font-poppins font-extrabold uppercase tracking-wide">
                    ⚡ LIMITED TIME
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {festivalKitchens.map((k) => {
                  const fest = k.festivalOffer || {}
                  const logoSrc = resolveMediaUrl(k.logo || k.image)
                  const offerImgSrc = resolveMediaUrl(fest.image || k.festival_offer_image)

                  return (
                    <PressableScale
                      key={k.id}
                      onPress={() => router.push(`/(customer)/(tabs)/kitchen/${k.id}`)}
                      className="mr-3.5"
                      style={{ width: Math.min(320, windowWidth - 48) }}
                    >
                      <LinearGradient
                        colors={["#D97706", "#EA580C", "#E11D48"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: 24,
                          padding: 16,
                          overflow: "hidden",
                          position: "relative",
                          ...Platform.select({
                            web: { boxShadow: "0px 8px 20px rgba(234, 88, 12, 0.25)" },
                            default: { shadowColor: "#EA580C", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 }
                          }),
                        }}
                      >
                        {/* Floating Offer Illustration / Image in Background */}
                        <View
                          style={{
                            position: "absolute",
                            top: -15,
                            right: -15,
                            width: 105,
                            height: 105,
                            borderRadius: 52.5,
                            overflow: "hidden",
                            opacity: 0.22,
                            borderWidth: 2,
                            borderColor: "rgba(255, 255, 255, 0.4)",
                          }}
                        >
                          <FestivalOfferThumb
                            uri={offerImgSrc}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>

                        <View className="flex-row items-center justify-between mb-2">
                          <View className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full">
                            <Text className="text-white text-[9px] font-poppins font-bold uppercase tracking-wider">
                              {fest.category === "both" ? "🍲 Food & Ration" : fest.category === "grocery" ? "🌾 Ration Only" : "🍲 Homemade Food"}
                            </Text>
                          </View>
                          <View className="bg-white px-2.5 py-0.5 rounded-full shadow-sm">
                            <Text className="text-[#E11D48] text-[10px] font-poppins font-extrabold uppercase">
                              Flat {fest.discountPercent}% OFF
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-3 my-1">
                          <View className="w-11 h-11 rounded-2xl bg-white p-0.5 overflow-hidden shadow-sm">
                            <Image
                              source={{ uri: logoSrc || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop" }}
                              className="w-full h-full rounded-[14px]"
                              resizeMode="cover"
                            />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text className="font-poppins font-bold text-white text-base leading-tight" numberOfLines={1}>
                              {k.name}
                            </Text>
                            <Text className="font-nunito text-amber-200 text-xs font-semibold mt-0.5" numberOfLines={1}>
                              ✨ {fest.title}
                            </Text>
                          </View>
                          {/* Floating Image Thumbnail Pill */}
                          <View className="w-10 h-10 rounded-xl overflow-hidden border border-white/40 shadow-sm bg-white/20">
                            <FestivalOfferThumb
                              uri={offerImgSrc}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          </View>
                        </View>

                        <Text className="font-nunito text-white/90 text-[11px] leading-snug mt-1 mb-3" numberOfLines={2}>
                          {fest.description || `Special festive delicacies & offers handcrafted for this occasion.`}
                        </Text>

                        <View className="bg-white/95 rounded-xl py-2 px-3 flex-row items-center justify-between shadow-sm">
                          <Text className="font-poppins font-bold text-[#0a1f13] text-[11px]">
                            Unlock Secret Festival Menu
                          </Text>
                          <View className="w-5 h-5 rounded-full bg-[#EA580C] items-center justify-center">
                            <ArrowRight size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        </View>
                      </LinearGradient>
                    </PressableScale>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Featured Kitchens */}
          {hasLocation && (featuredLoading || (!featuredError && filteredFeaturedKitchens.length > 0)) ? (
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
 
          {/* Explore More Kitchens / Location Required State */}
          <View className="mb-6">
            <View className="mb-3">
              <Text className="font-poppins font-bold text-dark text-base">
                {hasLocation ? "Explore More" : "Nearby Kitchens"}
              </Text>
              <Text className="font-nunito text-gray text-xs mt-0.5">
                {location.city 
                  ? `Browse verified kitchens in ${location.city}`
                  : location.state
                  ? `Browse verified kitchens in ${location.state}`
                  : "Select your location to discover kitchens delivering to you"}
              </Text>
            </View>
 
            {!hasLocation ? (
              <View className="py-8 items-center bg-white rounded-[28px] border border-emerald-100 p-6 shadow-sm">
                <View className="w-14 h-14 rounded-full bg-[#EAF7EE] items-center justify-center mb-3.5 border border-[#D1E6E3]">
                  <MapPin size={26} color="#0B6B3A" />
                </View>
                <Text className="font-poppins font-bold text-dark text-base text-center mb-1.5">
                  Set Your Location
                </Text>
                <Text className="font-nunito text-gray text-xs text-center mb-5 leading-relaxed max-w-[260px]">
                  Please allow or select your location to see home kitchens delivering fresh meals near you.
                </Text>
                <TouchableOpacity 
                  onPress={() => setIsMapModalVisible(true)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#0B6B3A",
                    borderRadius: 14,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    shadowColor: "#0B6B3A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 3
                  }}
                >
                  <MapPin size={16} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                    Select Location
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/(customer)/search")}
                  className="mt-3.5 py-1.5"
                >
                  <Text className="font-nunito font-semibold text-xs text-primary">
                    Or browse all kitchens in Discover →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : allLoading ? (
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
                <View className="flex-row gap-2.5 items-center">
                  <TouchableOpacity 
                    onPress={() => setIsMapModalVisible(true)}
                    style={{ backgroundColor: "#EAF7EE", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                  >
                    <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 13 }}>Change Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => router.push("/(customer)/search")}
                    style={{ backgroundColor: "#0B6B3A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }}>Browse All</Text>
                  </TouchableOpacity>
                </View>
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





        </Animated.View>
      </ScrollView>
      {/* Location Selector Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (statePickerVisible) {
            setStatePickerVisible(false)
            setStateSearchQuery("")
          } else if (cityPickerVisible) {
            setCityPickerVisible(false)
            setCitySearchQuery("")
          } else {
            setLocationModalVisible(false)
          }
        }}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          onPress={() => {
            if (statePickerVisible) {
              setStatePickerVisible(false)
              setStateSearchQuery("")
            } else if (cityPickerVisible) {
              setCityPickerVisible(false)
              setCitySearchQuery("")
            } else {
              setLocationModalVisible(false)
            }
          }}
        >
          <Pressable
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: Platform.OS === "ios" ? 44 : 16,
                maxHeight: "88%",
                width: "100%"
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {statePickerVisible ? (
                /* STATE PICKER VIEW OVERLAY */
                <View style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select State</Text>
                    <TouchableOpacity onPress={() => {
                      setStatePickerVisible(false)
                      setStateSearchQuery("")
                    }} style={{ padding: 4 }}>
                      <X size={20} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  {/* State Search Bar */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F7FAFC",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    paddingHorizontal: 12,
                    marginBottom: 14,
                    height: 44
                  }}>
                    <Search size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                    <TextInput
                      value={stateSearchQuery}
                      onChangeText={setStateSearchQuery}
                      placeholder="Search state..."
                      placeholderTextColor="#A0AEC0"
                      style={{ flex: 1, fontSize: 13, fontFamily: "Nunito", color: "#1A202C", paddingVertical: 0 }}
                    />
                    {stateSearchQuery ? (
                      <TouchableOpacity onPress={() => setStateSearchQuery("")} style={{ padding: 4 }}>
                        <X size={14} color="#718096" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
       
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {statesLoading ? (
                      <ActivityIndicator size="small" color="#0B6B3A" style={{ paddingVertical: 24 }} />
                    ) : (
                      statesList
                        .filter(s => s && s.name && s.name.toLowerCase().includes((stateSearchQuery || "").toLowerCase().trim()))
                        .map((stateItem) => (
                          <TouchableOpacity
                            key={stateItem.iso2 || stateItem.id || stateItem.name}
                            onPress={() => {
                              const code = stateItem.iso2 || (stateItem.id && stateItem.id.includes(":") ? stateItem.id.split(":")[1] : stateItem.id) || "";
                              handleSelectState(stateItem.name, code);
                              setStateSearchQuery("")
                            }}
                            style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F3", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                          >
                            <Text style={{ fontSize: 15, color: "#1F1F1F", fontFamily: "Nunito", fontWeight: tempState === stateItem.name ? "bold" : "normal" }}>{stateItem.name}</Text>
                            {tempState === stateItem.name && <Check size={16} color="#0B6B3A" />}
                          </TouchableOpacity>
                        ))
                    )}
                  </ScrollView>
                </View>
              ) : cityPickerVisible ? (
                /* CITY PICKER VIEW OVERLAY */
                <View style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                      Select City {tempState ? `(${tempState})` : ""}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setCityPickerVisible(false)
                      setCitySearchQuery("")
                    }} style={{ padding: 4 }}>
                      <X size={20} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  {/* City Search Bar */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F7FAFC",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    paddingHorizontal: 12,
                    marginBottom: 14,
                    height: 44
                  }}>
                    <Search size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                    <TextInput
                      value={citySearchQuery}
                      onChangeText={setCitySearchQuery}
                      placeholder="Search city or area..."
                      placeholderTextColor="#A0AEC0"
                      style={{ flex: 1, fontSize: 13, fontFamily: "Nunito", color: "#1A202C", paddingVertical: 0 }}
                    />
                    {citySearchQuery ? (
                      <TouchableOpacity onPress={() => setCitySearchQuery("")} style={{ padding: 4 }}>
                        <X size={14} color="#718096" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
       
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {citiesLoading ? (
                      <ActivityIndicator size="small" color="#0B6B3A" style={{ paddingVertical: 24 }} />
                    ) : (
                      <>
                        {citiesList
                          .filter((c) => c && c.name && c.name.toLowerCase().includes((citySearchQuery || "").toLowerCase().trim()))
                          .map((cityItem, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                handleSelectCity(cityItem.name)
                                setCitySearchQuery("")
                              }}
                              style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F3", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                            >
                              <Text style={{ fontSize: 15, color: "#1F1F1F", fontFamily: "Nunito", fontWeight: tempCity === cityItem.name ? "bold" : "normal" }}>
                                {cityItem.name}
                              </Text>
                              {tempCity === cityItem.name && <Check size={16} color="#0B6B3A" />}
                            </TouchableOpacity>
                          ))}

                        {/* Allow selecting custom city/area typed in search bar if not in list */}
                        {citySearchQuery.trim().length > 0 && !citiesList.some(c => c?.name?.toLowerCase() === citySearchQuery.trim().toLowerCase()) && (
                          <TouchableOpacity
                            onPress={() => {
                              handleSelectCity(citySearchQuery.trim())
                              setCitySearchQuery("")
                            }}
                            style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F3", flexDirection: "row", alignItems: "center", gap: 8 }}
                          >
                            <MapPin size={16} color="#0B6B3A" />
                            <Text style={{ fontSize: 14, color: "#0B6B3A", fontFamily: "Poppins", fontWeight: "bold" }}>
                              Use "{citySearchQuery.trim()}"
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </ScrollView>
                </View>
              ) : (
                /* MAIN LOCATION SELECTOR CONTENT */
                <View style={{ width: "100%", flex: 1 }}>
                  {/* Modal Header */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select Delivery Location</Text>
                    <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={{ padding: 4 }}>
                      <X size={20} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
                    {/* Pick on Map Button */}
                    <TouchableOpacity
                      onPress={() => {
                        setLocationModalVisible(false)
                        setIsMapModalVisible(true)
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#0B6B3A",
                        borderRadius: 16,
                        paddingVertical: 12,
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Navigation size={16} color="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                        Pin / Pick Location on Map
                      </Text>
                    </TouchableOpacity>

                    {/* Auto Detect Button */}
                    <TouchableOpacity
                      onPress={handleAutoDetectLocation}
                      disabled={detectingLocation}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#EAF7EE",
                        borderRadius: 16,
                        paddingVertical: 12,
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {detectingLocation ? (
                        <ActivityIndicator size="small" color="#0B6B3A" />
                      ) : (
                        <MapPin size={16} color="#0B6B3A" />
                      )}
                      <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                        {detectingLocation ? "Detecting location..." : "Auto-Detect Current Location"}
                      </Text>
                    </TouchableOpacity>
         
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
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>City</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (!tempState) {
                            setStatePickerVisible(true)
                            return
                          }
                          // Open city picker immediately (0ms delay)
                          setCityPickerVisible(true)

                          // If cities not loaded yet, prefill with fallbacks immediately and fetch full list in background
                          if (citiesList.length === 0 && tempState) {
                            if (tempStateIso && FALLBACK_LOCATIONS.cities[tempStateIso]) {
                              setCitiesList(FALLBACK_LOCATIONS.cities[tempStateIso])
                            }
                            setCitiesLoading(true)
                            api(`/api/locations/cities?state=${tempStateIso || "MH"}`)
                              .then((cData) => {
                                if (cData?.cities && cData.cities.length > 0) {
                                  setCitiesList(cData.cities)
                                }
                              })
                              .catch((err) => {
                                console.warn("City background fetch err:", err)
                              })
                              .finally(() => {
                                setCitiesLoading(false)
                              })
                          }
                        }}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderWidth: 2,
                          borderColor: tempState ? "#E8E8E8" : "#E8E8E8",
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: tempState ? "#1F1F1F" : "#7A7A7A", fontFamily: "Nunito" }}>
                          {tempCity || (tempState ? "Select City" : "Select State First")}
                        </Text>
                        <ChevronDown size={16} color="#7A7A7A" />
                      </TouchableOpacity>
                    </View>

                    {/* Exact Doorstep Address Input */}
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 8 }}>
                        Exact Doorstep Address (Optional)
                      </Text>
                      <TextInput
                        value={tempAddress}
                        onChangeText={setTempAddress}
                        placeholder="Enter flat/house no, colony, landmark..."
                        placeholderTextColor="#A3A3A3"
                        style={{
                          borderWidth: 2,
                          borderColor: "#E8E8E8",
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: "#FFFFFF",
                          fontSize: 14,
                          color: "#1F1F1F",
                          fontFamily: "Nunito",
                        }}
                      />
                    </View>
         
                    {/* Buttons Row */}
                    <View style={{ gap: 12, paddingBottom: 16 }}>
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
                  </ScrollView>
                </View>
              )}
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
                  <TouchableOpacity
                    key={alert.id}
                    activeOpacity={0.8}
                    onPress={() => handleAlertClick(alert)}
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
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <LocationMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={location.address || ""}
        initialCity={location.city || ""}
        initialState={location.state || ""}
        initialLat={location.lat || null}
        initialLng={location.lng || null}
      />
    </SafeAreaView>
  )
}
