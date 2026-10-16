import { useState, useEffect, useRef } from "react"
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Linking, Modal, TextInput, Pressable, Alert, Keyboard, useWindowDimensions, KeyboardAvoidingView } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, Star, ShieldCheck, Clock, Share2, MapPin, Phone, UtensilsCrossed, ShoppingBag, Sparkles, X, ChefHat, ArrowRight, ClipboardList, CheckCircle, MessageSquare, Send, RotateCw, ChevronLeft, ChevronRight, FileText, Download, ExternalLink } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import MenuListItem from "../../../../components/common/MenuListItem"
import MenuItemDetailModal from "../../../../components/common/MenuItemDetailModal"
import FloatingCart from "../../../../components/common/FloatingCart"
import { useCart } from "../../../../context/CartContext"
import { useAuth } from "../../../../context/AuthContext"
import { api } from "../../../../lib/api"
import { resolveMenuItemMedia, resolveMediaUrl } from "../../../../lib/media"
import { cn } from "../../../../lib/utils"

import { useVideoPlayer, VideoView } from "expo-video"
import * as FileSystem from "expo-file-system"

let WebView = null
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView
  } catch (e) {
    console.warn("react-native-webview not available:", e?.message)
  }
}

const KITCHEN_TYPE = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

const tabs = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "grocery", label: "Ration", icon: ShoppingBag },
  { id: "offer", label: "Offer", icon: Sparkles },
  { id: "hygiene", label: "Check Hygiene", icon: ShieldCheck },
]

function HygieneVideoPlayer({ src }) {
  const player = useVideoPlayer(src, (p) => {
    if (p) {
      p.showNowPlayingNotification = false
      p.staysActiveInBackground = false
      p.audioMixingMode = "mixWithOthers"
      p.loop = false
    }
  })
  return (
    <View className="w-full h-52 rounded-2xl overflow-hidden bg-black border border-emerald-200 mb-3">
      <VideoView player={player} style={{ width: "100%", height: "100%" }} allowsFullscreen nativeControls />
    </View>
  )
}

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`)
  } else {
    Alert.alert(title, message)
  }
}

function isImageFile(url) {
  if (!url || typeof url !== "string") return false
  const clean = url.split("?")[0].toLowerCase()
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".bmp")
  )
}

const FESTIVAL_DEFAULT_IMG = require("../../../../../assets/images/festival_offer_default.jpg")

function FestivalOfferThumb({ uri, style, resizeMode = "cover", blurRadius = 0 }) {
  const [hasError, setHasError] = useState(false)
  const isDefaultOrEmpty = !uri || typeof uri !== "string" || uri.includes("festival_offer_default") || hasError

  if (isDefaultOrEmpty) {
    return <Image source={FESTIVAL_DEFAULT_IMG} style={style} resizeMode={resizeMode} blurRadius={blurRadius} />
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
      onError={() => setHasError(true)}
    />
  )
}

export default function KitchenDetailScreen() {
  const { id, selectedItemId, dishName } = useLocalSearchParams()
  const router = useRouter()
  const chatScrollViewRef = useRef(null)
  const enquiryFormScrollRef = useRef(null)
  const { height: windowHeight } = useWindowDimensions()
  const modalSheetHeight = Math.max(480, Math.round((windowHeight || 700) * 0.85))

  const [activeTab, setActiveTab] = useState("food")
  const [kitchen, setKitchen] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedOfferImageIndex, setSelectedOfferImageIndex] = useState(0)
  const { requireCustomer, addItem, removeItem, getItemQty, clearCart } = useCart()

  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [enquiryMessage, setEnquiryMessage] = useState("")
  const [enquiryValue, setEnquiryValue] = useState("")
  const [enquiryPeopleCount, setEnquiryPeopleCount] = useState("")
  const [enquirySubmitting, setEnquirySubmitting] = useState(false)
  const [enquiryError, setEnquiryError] = useState("")
  const [activeEnquiry, setActiveEnquiry] = useState(null)
  const [refreshingEnquiry, setRefreshingEnquiry] = useState(false)
  const [successModalVisible, setSuccessModalVisible] = useState(false)
  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [hygieneData, setHygieneData] = useState(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [quotationModalVisible, setQuotationModalVisible] = useState(false)
  const [quotationLoading, setQuotationLoading] = useState(true)
  const [quotationDownloading, setQuotationDownloading] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 0)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const { user, loading: authLoading } = useAuth()
  const hasActiveEnquiry = activeEnquiry && activeEnquiry.status !== "completed"

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const fetchEnquiry = (!authLoading && user)
          ? api(`/api/bulk-enquiries/kitchen/${id}`).catch(() => null)
          : Promise.resolve(null)

        const [kitchenRes, menuRes, enquiryRes, hygieneRes] = await Promise.all([
          api(`/api/kitchens/${id}`),
          api(`/api/menu/kitchen/${id}`),
          fetchEnquiry,
          api(`/api/hygiene/kitchen/${id}`).catch(() => null),
        ])

        if (cancelled) return

        setHygieneData(hygieneRes)

        if (enquiryRes && enquiryRes.enquiry) {
          setActiveEnquiry(enquiryRes.enquiry)
        } else {
          setActiveEnquiry(null)
        }

        const k = kitchenRes.kitchen
        const mappedKitchen = {
          id: k.id,
          name: k.name,
          speciality: k.speciality || "",
          rating: Number(k.rating) || 4.5,
          deliveryTime: k.delivery_time || "30 min",
          hygieneScore: k.hygiene_score || 0,
          hygieneVerified: (k.hygiene_score || 0) >= 80,
          offer: k.offer,
          description: k.description,
          city: k.city,
          state: k.state,
          address: k.address,
          pincode: k.pincode,
          openingTime: k.opening_time,
          kitchenType: k.kitchen_type,
          phone: k.phone,
          image: k.image || null,
          cover: k.cover_image || null,
          isFreshFoodActive: k.is_fresh_food_active ?? 1,
          isGroceryActive: k.is_grocery_active ?? 1,
          festivalOffer: k.festivalOffer?.active ? k.festivalOffer : null,
          festival_offer_image: k.festival_offer_image || null,
          festival_offer_image_2: k.festival_offer_image_2 || null,
        }
        setKitchen(mappedKitchen)

        const festOffer = mappedKitchen.festivalOffer

        const mappedMenu = (menuRes.items || []).map((item) => {
          const isGrocery = item.category === "grocery"
          const pkgType = item.packaging_type || item.packagingType || "packaged"
          const defaultGst = isGrocery ? (pkgType === "loose" ? 0 : 5) : 5
          const gst = item.gst_rate !== undefined && item.gst_rate !== null
            ? Number(item.gst_rate)
            : (item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : defaultGst)

          const originalPrice = Number(item.price)
          let offerPrice = null
          let discountPercent = null
          let festivalOfferTitle = null

          if (festOffer?.active && Number(festOffer.discountPercent) > 0) {
            const isCatMatch =
              festOffer.category === "both" ||
              (festOffer.category === "food" && (item.category || "food") === "food") ||
              (festOffer.category === "grocery" && item.category === "grocery")

            if (isCatMatch) {
              discountPercent = Number(festOffer.discountPercent)
              offerPrice = Number(Math.max(1, originalPrice * (1 - discountPercent / 100)).toFixed(2))
              festivalOfferTitle = festOffer.title
            }
          }

          return resolveMenuItemMedia({
            ...item,
            id: item.id,
            name: item.name,
            localName: item.local_name || item.localName || null,
            local_name: item.local_name || item.localName || null,
            description: item.description,
            price: originalPrice,
            originalPrice,
            offerPrice,
            discountPercent,
            festivalOfferTitle,
            category: item.category || "food",
            itemType: item.item_type || "veg",
            packagingType: pkgType,
            packaging_type: pkgType,
            gstRate: gst,
            gst_rate: gst,
            offer: item.offer || null,
            image: item.image,
            images: item.images,
            videos: item.videos,
            kitchen: k.name,
            kitchenId: k.id,
            isCombo: item.isCombo || item.is_combo,
            comboItems: item.comboItems || [],
            isAvailable: item.is_available === 1 || item.is_available === true || item.isAvailable === true,
            is_available: item.is_available,
          })
        })
        setMenu(mappedMenu)

        // Auto-open selected dish if coming from search redirect
        if (selectedItemId || dishName) {
          const targetId = selectedItemId ? Number(selectedItemId) : null
          const targetName = dishName ? String(dishName).trim().toLowerCase() : null
          const matchedItem = mappedMenu.find((m) =>
            (targetId && m.id === targetId) ||
            (targetName && (m.name?.toLowerCase() === targetName || m.name?.toLowerCase().includes(targetName)))
          )
          if (matchedItem) {
            if (matchedItem.category) {
              setActiveTab(matchedItem.isCombo ? "combo" : matchedItem.category)
            }
            setSelectedItem(matchedItem)
          }
        }

        // Set default active tab dynamically based on availability
        const hasFood = (mappedKitchen.isFreshFoodActive !== 0) && mappedMenu.some(item => item.category === "food" && !(item.isCombo || item.is_combo))
        const hasGrocery = (mappedKitchen.isGroceryActive !== 0) && mappedMenu.some(item => item.category === "grocery" && !(item.isCombo || item.is_combo))
        const hasCombo = mappedMenu.some(item => item.isCombo || item.is_combo)

        if (hasFood) {
          setActiveTab("food")
        } else if (hasGrocery) {
          setActiveTab("grocery")
        } else if (hasCombo) {
          setActiveTab("combo")
        } else {
          setActiveTab("food")
        }
      } catch (err) {
        console.log("Failed to load kitchen details from API", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, authLoading, user])

  // Live Sync Polling for Menu Items every 3 seconds
  useEffect(() => {
    if (!id) return
    let isCurrent = true

    const syncMenu = async () => {
      try {
        const [kitchenRes, menuRes] = await Promise.all([
          api(`/api/kitchens/${id}`).catch(() => null),
          api(`/api/menu/kitchen/${id}`).catch(() => null),
        ])
        if (!isCurrent) return

        let currentKitchen = kitchen
        if (kitchenRes?.kitchen) {
          const k = kitchenRes.kitchen
          currentKitchen = {
            id: k.id,
            name: k.name,
            speciality: k.speciality || "",
            rating: Number(k.rating) || 4.5,
            deliveryTime: k.delivery_time || "30 min",
            hygieneScore: k.hygiene_score || 0,
            hygieneVerified: (k.hygiene_score || 0) >= 80,
            offer: k.offer,
            description: k.description,
            city: k.city,
            state: k.state,
            address: k.address,
            pincode: k.pincode,
            openingTime: k.opening_time,
            kitchenType: k.kitchen_type,
            phone: k.phone,
            image: k.image || null,
            cover: k.cover_image || null,
            isFreshFoodActive: k.is_fresh_food_active ?? 1,
            isGroceryActive: k.is_grocery_active ?? 1,
            festivalOffer: k.festivalOffer?.active ? k.festivalOffer : null,
            festival_offer_image: k.festival_offer_image || null,
            festival_offer_image_2: k.festival_offer_image_2 || null,
          }
          setKitchen(currentKitchen)
        }

        if (menuRes?.items) {
          setMenu(() => {
            const kName = currentKitchen?.name || ""
            const kId = currentKitchen?.id || id
            const festOffer = currentKitchen?.festivalOffer

            return (menuRes.items || []).map((item) => {
              const originalPrice = Number(item.price)
              let offerPrice = null
              let discountPercent = null
              let festivalOfferTitle = null

              if (festOffer?.active && Number(festOffer.discountPercent) > 0) {
                const isCatMatch =
                  festOffer.category === "both" ||
                  (festOffer.category === "food" && (item.category || "food") === "food") ||
                  (festOffer.category === "grocery" && item.category === "grocery")

                if (isCatMatch) {
                  discountPercent = Number(festOffer.discountPercent)
                  offerPrice = Number(Math.max(1, originalPrice * (1 - discountPercent / 100)).toFixed(2))
                  festivalOfferTitle = festOffer.title
                }
              }

              return resolveMenuItemMedia({
                id: item.id,
                name: item.name,
                localName: item.local_name || item.localName || null,
                local_name: item.local_name || item.localName || null,
                description: item.description,
                price: originalPrice,
                originalPrice,
                offerPrice,
                discountPercent,
                festivalOfferTitle,
                category: item.category || "food",
                itemType: item.item_type || "veg",
                packagingType: item.packaging_type || item.packagingType || "packaged",
                packaging_type: item.packaging_type || item.packagingType || "packaged",
                gstRate: item.gst_rate ?? item.gstRate,
                gst_rate: item.gst_rate ?? item.gstRate,
                offer: item.offer || null,
                image: item.image,
                images: item.images,
                videos: item.videos,
                kitchen: kName,
                kitchenId: kId,
                isCombo: item.isCombo || item.is_combo,
                comboItems: item.comboItems || [],
                isAvailable: item.is_available === 1 || item.is_available === true || item.isAvailable === true,
                is_available: item.is_available,
              })
            })
          })
        }
      } catch (err) {
        // silent sync error handling
      }
    }

    const interval = setInterval(syncMenu, 3000)
    return () => {
      isCurrent = false
      clearInterval(interval)
    }
  }, [id, kitchen?.name, kitchen?.id])

  const handleRefreshEnquiry = async () => {
    if (!id || authLoading || !user) return
    setRefreshingEnquiry(true)
    try {
      const enquiryRes = await api(`/api/bulk-enquiries/kitchen/${id}`).catch(() => null)
      if (enquiryRes && enquiryRes.enquiry) {
        setActiveEnquiry(enquiryRes.enquiry)
      } else {
        setActiveEnquiry(null)
      }
    } catch (e) {
      console.warn("Failed to refresh enquiry:", e)
    } finally {
      setRefreshingEnquiry(false)
    }
  }

  useEffect(() => {
    if (!id || authLoading || !user?.id || !activeEnquiry?.id || activeEnquiry.status === "completed") return

    let cancelled = false

    const pollEnquiry = async () => {
      try {
        const enquiryRes = await api(`/api/bulk-enquiries/kitchen/${id}`).catch(() => null)
        if (cancelled) return

        if (enquiryRes && enquiryRes.enquiry) {
          setActiveEnquiry(enquiryRes.enquiry)
        } else {
          setActiveEnquiry(null)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Failed to poll enquiry:", e)
        }
      }
    }

    pollEnquiry()
    const interval = setInterval(pollEnquiry, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id, authLoading, user?.id, activeEnquiry?.id, activeEnquiry?.status])

  useEffect(() => {
    if (!id || activeTab !== "hygiene") return

    let cancelled = false

    const pollHygieneStatus = async () => {
      try {
        const data = await api(`/api/hygiene/kitchen/${id}`).catch(() => null)
        if (!cancelled) {
          setHygieneData(data)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Failed to poll hygiene status:", e)
        }
      }
    }

    pollHygieneStatus()
    const interval = setInterval(pollHygieneStatus, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id, activeTab])

  const handleCloseEnquiryModal = () => {
    Keyboard.dismiss()
    setEnquiryModalVisible(false)
    setShowChat(false)
    setEnquiryError("")
  }

  const submitEnquiry = async () => {
    const val = Number(enquiryValue)
    const pCount = Number(enquiryPeopleCount)

    if (!enquiryMessage || enquiryMessage.trim().length < 10) {
      setEnquiryError("Describe what you need (at least 10 characters)")
      return
    }
    if (!val || Number.isNaN(val) || val < 1) {
      setEnquiryError("Please enter your budget / offered price")
      return
    }
    if (!pCount || Number.isNaN(pCount) || pCount < 1) {
      setEnquiryError("Please specify number of people")
      return
    }

    setEnquiryError("")
    setEnquirySubmitting(true)
    try {
      const data = await api("/api/bulk-enquiries", {
        method: "POST",
        body: JSON.stringify({
          kitchenId: kitchen?.id || id,
          message: enquiryMessage.trim(),
          estimatedValue: val,
          peopleCount: pCount,
        }),
      })

      if (data.enquiry) {
        setActiveEnquiry(data.enquiry)
      }
      Keyboard.dismiss()
      setEnquiryModalVisible(false)
      setEnquiryMessage("")
      setEnquiryValue("")
      setEnquiryPeopleCount("")
      setSuccessModalVisible(true)
    } catch (err) {
      console.error("Submit bulk enquiry error:", err)
      setEnquiryError(err.message || "Failed to submit enquiry")
    } finally {
      setEnquirySubmitting(false)
    }
  }

  const handleAcceptQuotation = async () => {
    try {
      await api(`/api/bulk-enquiries/${activeEnquiry.id}/accept`, {
        method: "POST",
      })
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchen?.id || id}`)
      setActiveEnquiry(updated.enquiry)
      showAlert("Success", "You have accepted the quotation.")
    } catch (err) {
      showAlert("Error", err.message || "Failed to accept quotation")
    }
  }

  const handleRejectQuotation = async () => {
    try {
      await api(`/api/bulk-enquiries/${activeEnquiry.id}/reject`, {
        method: "POST",
      })
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchen?.id || id}`)
      setActiveEnquiry(updated.enquiry)
      showAlert("Success", "You have rejected the quotation. You can now coordinate with the seller.")
    } catch (err) {
      showAlert("Error", err.message || "Failed to reject quotation")
    }
  }

  const handlePayQuotation = () => {
    const bulkItem = {
      id: `bulk_${activeEnquiry.id}`,
      name: `Bulk Order Service (#${activeEnquiry.id})`,
      price: activeEnquiry.quotationAmount,
      kitchenId: activeEnquiry.kitchenId,
      qty: 1,
      isBulk: true,
      is_available: 1,
      isAvailable: true,
      approval_status: "approved",
    }

    clearCart()
    addItem(bulkItem)
    setEnquiryModalVisible(false)
    router.push("/checkout")
  }

  useEffect(() => {
    if ((!chatModalVisible && !showChat) || !activeEnquiry?.id) return

    let active = true

    const fetchChatMessages = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/${activeEnquiry.id}/chat`)
        if (active) {
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to load chat messages:", err)
      }
    }

    fetchChatMessages()
    const interval = setInterval(fetchChatMessages, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [chatModalVisible, showChat, activeEnquiry?.id])

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !activeEnquiry?.id) return
    const msg = chatInput.trim()
    setChatInput("")
    try {
      const data = await api(`/api/bulk-enquiries/${activeEnquiry.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      })
      setChatMessages((prev) => [...prev, data.chatMessage])
    } catch (err) {
      showAlert("Error", err.message || "Failed to send message")
    }
  }

  const handleChatWithSeller = () => {
    setShowChat(true)
  }

  const handleDeleteEnquiry = async () => {
    const performDelete = async () => {
      try {
        await api(`/api/bulk-enquiries/${activeEnquiry.id}`, {
          method: "DELETE",
        })
        setActiveEnquiry(null)
        setEnquiryModalVisible(false)
        showAlert("Success", "Your enquiry has been deleted.")
      } catch (err) {
        showAlert("Error", err.message || "Failed to delete enquiry")
      }
    }

    if (Platform.OS === "web") {
      const ok = window.confirm("Are you sure you want to delete this bulk order enquiry?")
      if (ok) performDelete()
    } else {
      Alert.alert(
        "Delete Enquiry",
        "Are you sure you want to delete this bulk order enquiry?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete }
        ]
      )
    }
  }

  const foodItems = menu.filter((i) => i.category === "food")
  const groceryItems = menu.filter((i) => i.category === "grocery")
  const festivalOffer = kitchen?.festivalOffer
  const isOfferActive = Boolean(festivalOffer?.active)
  const festivalOfferItems = isOfferActive
    ? menu.filter((item) => {
        if (festivalOffer.category === "both") return true
        if (festivalOffer.category === "food") return (item.category || "food") === "food"
        if (festivalOffer.category === "grocery") return item.category === "grocery"
        return true
      })
    : []
  const offerItems = menu.filter((i) => i.offer)
  const offerCount = (kitchen?.offer ? 1 : 0) + offerItems.length

  const filteredTabs = tabs.filter((tab) => {
    if (loading) return true
    if (tab.id === "food") {
      const isFreshActive = kitchen?.isFreshFoodActive ?? 1
      return isFreshActive !== 0 && foodItems.length > 0
    }
    if (tab.id === "grocery") {
      const isGroceryActive = kitchen?.isGroceryActive ?? 1
      return isGroceryActive !== 0 && groceryItems.length > 0
    }
    if (tab.id === "offer") {
      return Boolean(kitchen?.festivalOffer?.active)
    }
    return true
  })

  useEffect(() => {
    if (loading || !kitchen) return
    const isCurrentTabVisible = filteredTabs.some((t) => t.id === activeTab)
    if (!isCurrentTabVisible && filteredTabs.length > 0) {
      setActiveTab(filteredTabs[0].id)
    }
  }, [filteredTabs, activeTab, loading, kitchen])

  if (loading || !kitchen) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator size="large" color="#0B6B3A" />
      </View>
    )
  }

  const locationLabel = [kitchen.city, kitchen.state].filter(Boolean).join(", ")
  const logoUrl = resolveMediaUrl(kitchen.image)
  const coverUrl = resolveMediaUrl(kitchen.cover) || resolveMediaUrl(kitchen.image)

  return (
    <SafeAreaView className="flex-1 bg-[#E9ECF0]" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-[#E9ECF0]">
        {/* Banner section */}
        <View className="relative h-56 bg-primary-dark" style={{ overflow: "hidden" }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Image
              source={require("../../../../../assets/images/banner.png")}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.6)"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Navigation Bar */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between items-center z-10">
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/(tabs)/home"))}
              className="w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-md border border-white/50"
            >
              <ArrowLeft size={20} color="#1F1F1F" />
            </TouchableOpacity>

            <TouchableOpacity className="w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-md border border-white/50">
              <Share2 size={18} color="#1F1F1F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Details Container */}
        <View className="px-4 -mt-12 z-10">
          <View
            className="bg-white rounded-[28px] p-5 shadow-lg border border-white/60"
            style={Platform.select({
              web: { boxShadow: "0px 10px 25px rgba(0,0,0,0.06)" },
              default: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5 }
            })}
          >
            <View className="flex-row gap-4 items-start">
              {/* Logo / Avatar */}
              <View
                style={[
                  { width: 72, height: 72, borderRadius: 22, marginTop: -40 },
                  Platform.select({
                    web: { boxShadow: "0px 4px 10px rgba(0,0,0,0.08)" },
                    default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }
                  })
                ]}
                className="bg-white border-4 border-white items-center justify-center overflow-hidden shadow-md"
              >
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text className="text-primary font-poppins font-extrabold text-2xl">
                    {kitchen.name?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>

              <View className="flex-1 min-w-0">
                <View className="flex-row justify-between items-start">
                  <View className="flex-grow mr-2">
                    <Text className="font-poppins font-extrabold text-dark text-xl leading-tight" numberOfLines={1}>
                      {kitchen.name}
                    </Text>
                    <Text className="font-nunito font-semibold text-gray text-xs mt-1">{kitchen.speciality}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 bg-[#FEF9E7] border border-[#FDECB2] px-2.5 py-1 rounded-xl">
                    <Star size={12} color="#F4C400" fill="#F4C400" />
                    <Text className="font-poppins font-bold text-xs text-[#7D6608]">{kitchen.rating}</Text>
                  </View>
                </View>

                {locationLabel ? (
                  <View className="flex-row items-center gap-1 mt-2.5 bg-slate-50 self-start px-2 py-0.5 rounded-lg border border-slate-100">
                    <MapPin size={11} color="#0B6B3A" />
                    <Text className="font-nunito font-bold text-gray/80 text-[10px] truncate flex-1">
                      {locationLabel}
                      {kitchen.kitchenType ? `  ·  ${KITCHEN_TYPE[kitchen.kitchenType]}` : ""}
                    </Text>
                  </View>
                ) : null}

                {kitchen.offer ? (
                  <View className="mt-2 bg-[#FDEDEC] px-2.5 py-0.5 rounded-lg self-start border border-[#FCD2D1]">
                    <Text className="text-[10px] font-poppins font-bold text-accent">{kitchen.offer}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Metrics Row (Colorful Pastel Cards matching mockup shortcut row) */}
            <View className="flex-row justify-between gap-2.5 mt-5">
              {/* Delivery */}
              <View className="flex-1 items-center justify-center py-2.5 bg-[#FAF4EB] rounded-2xl border border-[#F4EBDC]">
                <Clock size={15} color="#0C4240" strokeWidth={2.4} />
                <Text className="font-poppins font-extrabold text-xs text-[#0C4240] mt-1">{kitchen.deliveryTime}</Text>
                <Text className="font-nunito text-[9px] text-[#0C4240]/80 uppercase tracking-wider font-bold mt-0.5">Delivery</Text>
              </View>

              {/* Hygiene */}
              <View className="flex-1 items-center justify-center py-2.5 bg-[#EAF7EE] rounded-2xl border border-[#D6EAE7]">
                <ShieldCheck size={15} color="#0B6B3A" strokeWidth={2.4} />
                <Text className="font-poppins font-extrabold text-xs text-[#0B6B3A] mt-1">
                  {kitchen.hygieneScore > 0 ? `${kitchen.hygieneScore}%` : "—"}
                </Text>
                <Text className="font-nunito text-[9px] text-[#0B6B3A]/80 uppercase tracking-wider font-bold mt-0.5">Hygiene</Text>
              </View>

              {/* Menu */}
              <View className="flex-1 items-center justify-center py-2.5 bg-[#EBF5FB] rounded-2xl border border-[#D6E6F2]">
                <UtensilsCrossed size={15} color="#2980B9" strokeWidth={2.4} />
                <Text className="font-poppins font-extrabold text-xs text-[#2980B9] mt-1">
                  {foodItems.length + groceryItems.length} Items
                </Text>
                <Text className="font-nunito text-[9px] text-[#2980B9]/80 uppercase tracking-wider font-bold mt-0.5">Menu</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About this kitchen section */}
        <View className="px-4 mt-4">
          <View
            className="bg-white rounded-[24px] p-5 shadow-md border border-white/60"
            style={Platform.select({
              web: { boxShadow: "0px 6px 16px rgba(0,0,0,0.04)" },
              default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2.5 }
            })}
          >
            <Text className="font-poppins font-bold text-dark text-sm mb-2.5">About this kitchen</Text>
            <Text className="font-nunito text-gray/90 text-xs leading-relaxed">
              {kitchen.description || "Authentic homemade food prepared fresh daily with love and care."}
            </Text>
            <View className="mt-3.5 pt-3.5 border-t border-slate-100 flex-col gap-2.5">
              {kitchen.address ? (
                <View className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-lg bg-[#EAF7EE] items-center justify-center border border-[#D6EAE7]">
                    <MapPin size={11} color="#0B6B3A" />
                  </View>
                  <Text className="font-nunito font-semibold text-gray/80 text-xs flex-1" numberOfLines={1}>
                    {kitchen.address}, {kitchen.city}
                  </Text>
                </View>
              ) : null}
              {kitchen.openingTime ? (
                <View className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-lg bg-[#FAF4EB] items-center justify-center border border-[#F4EBDC]">
                    <Clock size={11} color="#0C4240" />
                  </View>
                  <Text className="font-nunito font-semibold text-gray/80 text-xs flex-1">{kitchen.openingTime}</Text>
                </View>
              ) : null}
              
            </View>
          </View>
        </View>

        {/* Bulk Order Enquiry CTA Card */}
        {!hasActiveEnquiry ? (
          <View className="px-4 mt-4">
            <LinearGradient
              colors={["#0C4240", "#135E39"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 20,
                overflow: "hidden",
                position: "relative",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.08)",
                  },
                  default: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  },
                }),
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
              />

              <View className="flex-row items-center gap-3 mb-2.5">
                <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                  <ChefHat size={16} color="#F4C400" />
                </View>
                <Text className="font-poppins font-extrabold text-white text-base">Bulk Order Enquiry</Text>
              </View>

              <Text className="font-nunito text-white/90 text-[11px] leading-relaxed mb-4">
                Planning a party, corporate event, or hosting a gathering? Get custom menus and bulk discounts directly from this home kitchen! (Min value: ₹2000)
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (requireCustomer()) {
                    setEnquiryModalVisible(true)
                  }
                }}
                style={{
                  backgroundColor: "#F4C400",
                  borderRadius: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#0a1f13", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                  Send Enquiry
                </Text>
                <ArrowRight size={13} color="#0a1f13" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (hasActiveEnquiry && activeEnquiry.status === "pending") ? (
          <View className="px-4 mt-4">
            <LinearGradient
              colors={["#0C4240", "#135E39"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 20,
                overflow: "hidden",
                position: "relative",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.08)",
                  },
                  default: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  },
                }),
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
              />

              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                    <ChefHat size={16} color="#F4C400" />
                  </View>
                  <Text className="font-poppins font-extrabold text-white text-base">Bulk Order Enquiry</Text>
                </View>
                <TouchableOpacity onPress={handleRefreshEnquiry} disabled={refreshingEnquiry} style={{ padding: 6 }}>
                  {refreshingEnquiry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <RotateCw size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              <View className="bg-white/10 rounded-2xl p-3.5 border border-white/10 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-poppins font-bold text-[#F4C400] text-xs uppercase tracking-wider">Status: Under Review</Text>
                  <Text className="font-poppins font-bold text-white text-xs">Est: ₹{activeEnquiry.estimatedValue}</Text>
                </View>
                <Text className="font-nunito text-white/95 text-xs leading-relaxed" numberOfLines={2}>
                  {`"${activeEnquiry.message}"`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setEnquiryModalVisible(true)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                  View Enquiry Status
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View className="px-4 mt-4">
            <LinearGradient
              colors={["#0C4240", "#135E39"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 20,
                overflow: "hidden",
                position: "relative",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.08)",
                  },
                  default: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  },
                }),
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
              />

              <View className="flex-row items-center gap-3 mb-2.5">
                <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                  <ChefHat size={16} color="#F4C400" />
                </View>
                <Text className="font-poppins font-extrabold text-white text-base">Quotation Received!</Text>
              </View>

              <View className="bg-white/10 rounded-2xl p-3.5 border border-white/10 mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-poppins font-bold text-[#F4C400] text-xs uppercase tracking-wider">Quotation Ready</Text>
                  <Text className="font-poppins font-bold text-white text-base">₹{activeEnquiry.quotationAmount}</Text>
                </View>
                {activeEnquiry.quotationNotes ? (
                  <Text className="font-nunito text-white/80 text-[11px] mt-1" numberOfLines={1}>
                    Note: {`"${activeEnquiry.quotationNotes}"`}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => setEnquiryModalVisible(true)}
                style={{
                  backgroundColor: "#F4C400",
                  borderRadius: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#0a1f13", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                  View & Download Quote
                </Text>
                <ArrowRight size={13} color="#0a1f13" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Festival Specials Banner CTA (Exact HomePage style) */}
        {kitchen?.festivalOffer?.active && activeTab !== "offer" ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setActiveTab("offer")}
            className="mx-4 mt-3"
          >
            <LinearGradient
              colors={["#D97706", "#EA580C", "#E11D48"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 16,
                position: "relative",
                overflow: "hidden",
                ...Platform.select({
                  web: {
                    boxShadow: "0px 8px 20px rgba(234, 88, 12, 0.25)",
                  },
                  default: {
                    shadowColor: "#EA580C",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 4,
                  },
                }),
              }}
            >
              {/* Background Circular Watermark */}
              <View
                style={{
                  position: "absolute",
                  top: -15,
                  right: -15,
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  overflow: "hidden",
                  opacity: 0.22,
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.4)",
                }}
              >
                <FestivalOfferThumb
                  uri={resolveMediaUrl(kitchen.festivalOffer.image || kitchen.festival_offer_image)}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>

              {/* Top Badges */}
              <View className="flex-row items-center justify-between mb-2.5 relative z-10">
                <View className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-poppins font-bold uppercase tracking-wider">
                    {kitchen.festivalOffer.category === "both" ? "🍲 Food & Ration" : kitchen.festivalOffer.category === "grocery" ? "🌾 Ration Only" : "🍲 Homemade Food"}
                  </Text>
                </View>
                <View className="bg-white px-2.5 py-0.5 rounded-full shadow-sm">
                  <Text className="text-[#E11D48] text-[11px] font-poppins font-black uppercase">
                    Flat {kitchen.festivalOffer.discountPercent}% OFF
                  </Text>
                </View>
              </View>

              {/* Kitchen Name & Offer Title Row */}
              <View className="flex-row items-center gap-3 my-1 relative z-10">
                <View className="w-11 h-11 rounded-2xl bg-white p-0.5 overflow-hidden shadow-sm flex-shrink-0">
                  <Image
                    source={{ uri: resolveMediaUrl(kitchen.logo || kitchen.image) || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop" }}
                    style={{ width: "100%", height: "100%", borderRadius: 12 }}
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-poppins font-bold text-white text-base leading-tight truncate" numberOfLines={1}>
                    {kitchen.name}
                  </Text>
                  <Text className="font-nunito text-amber-200 text-xs font-semibold mt-0.5 truncate" numberOfLines={1}>
                    ✨ {kitchen.festivalOffer.title}
                  </Text>
                </View>
                {/* Floating Preview Pill */}
                <View className="w-10 h-10 rounded-xl overflow-hidden border border-white/40 shadow-xs flex-shrink-0 bg-white/20">
                  <FestivalOfferThumb
                    uri={resolveMediaUrl(kitchen.festivalOffer.image || kitchen.festival_offer_image)}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Description */}
              <Text className="font-nunito text-white/90 text-xs mt-1 mb-3 leading-relaxed relative z-10" numberOfLines={2}>
                {kitchen.festivalOffer.description || "Handcrafted festive delicacies and special packages available for a limited time."}
              </Text>

              {/* Action Button */}
              <View className="bg-white rounded-xl py-2.5 px-3.5 flex-row items-center justify-between shadow-sm relative z-10">
                <Text className="font-poppins font-bold text-xs text-[#0a1f13]">
                  Unlock Secret Festival Menu
                </Text>
                <ArrowRight size={14} color="#EA580C" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* Navigation Tabs (Food / Ration / Offers) */}
        <View className="px-4 mt-4">
          <View
            className="flex-row bg-white rounded-[24px] p-1.5 shadow-md border border-white/60"
            style={Platform.select({
              web: { boxShadow: "0px 6px 16px rgba(0,0,0,0.03)" },
              default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }
            })}
          >
            {filteredTabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                  className={cn(
                    "flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-[18px]",
                    active ? "bg-primary shadow-md" : ""
                  )}
                  style={active ? Platform.select({
                    web: {
                      boxShadow: "0px 3px 6px rgba(11, 107, 58, 0.15)",
                    },
                    default: {
                      shadowColor: "#0B6B3A",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 3.5,
                    },
                  }) : null}
                >
                  <Icon size={14} color={active ? "#FFFFFF" : "#7A7A7A"} />
                  <Text className={cn("text-xs font-poppins font-bold mt-0.5", active ? "text-white" : "text-gray")}>
                    {tab.label}
                  </Text>

                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Tab Content Area */}
        <View
          className="px-5 mt-4 bg-white rounded-t-[36px] min-h-[400] py-6 pb-32 border-t border-slate-100 shadow-xl"
          style={Platform.select({
            web: { boxShadow: "0px -6px 20px rgba(0,0,0,0.03)" },
            default: { shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 4 }
          })}
        >
          {activeTab === "food" ? (
            <View>
              <Text className="font-poppins font-extrabold text-dark text-lg mb-0.5">Food Menu</Text>
              <Text className="font-nunito font-semibold text-gray/80 text-[11px] mb-5">
                Fresh homemade dishes · {foodItems.length} items
              </Text>
              {foodItems.length === 0 ? (
                <View className="py-12 items-center">
                  <UtensilsCrossed size={36} color="#E8E8E8" />
                  <Text className="font-nunito text-gray text-xs mt-2">No food items listed yet</Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap -mx-1.5">
                  {foodItems.map((item) => (
                    <View key={item.id} className="w-1/2 p-1.5">
                      <MenuListItem
                        item={item}
                        onOpen={setSelectedItem}
                        onNavigateToCart={() => router.push("/cart")}
                        onAddToCart={addItem}
                        onRemoveFromCart={removeItem}
                        getItemQty={getItemQty}
                        variant="grid"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {activeTab === "grocery" ? (
            <View>
              <Text className="font-poppins font-extrabold text-dark text-lg mb-0.5">Ration & Grocery</Text>
              <Text className="font-nunito font-semibold text-gray/80 text-[11px] mb-5">
                Daily essentials from this kitchen · {groceryItems.length} items
              </Text>
              {groceryItems.length === 0 ? (
                <View className="py-12 items-center">
                  <ShoppingBag size={36} color="#E8E8E8" />
                  <Text className="font-nunito text-gray text-xs mt-2">No ration items listed yet</Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap -mx-1.5">
                  {groceryItems.map((item) => (
                    <View key={item.id} className="w-1/2 p-1.5">
                      <MenuListItem
                        item={item}
                        onOpen={setSelectedItem}
                        onNavigateToCart={() => router.push("/cart")}
                        onAddToCart={addItem}
                        onRemoveFromCart={removeItem}
                        getItemQty={getItemQty}
                        variant="grid"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {activeTab === "offer" && kitchen?.festivalOffer?.active ? (
            <View>
              {/* Festival Offer Showcase */}
              {(() => {
                const fest = kitchen.festivalOffer
                const offerImages = [
                  fest.image || kitchen.festival_offer_image || "/festival_offer_default.jpg",
                  fest.image2 || kitchen.festival_offer_image_2,
                ].filter(Boolean)
                const activeOfferImg = offerImages[selectedOfferImageIndex] || offerImages[0]
                const offerImgSrc = resolveMediaUrl(activeOfferImg)
                return (
                  <View>
                    <View
                      className="bg-white rounded-3xl border border-amber-200 overflow-hidden mb-4"
                      style={{
                        ...Platform.select({
                          web: {
                            boxShadow: "0px 8px 20px rgba(234, 88, 12, 0.15)",
                          },
                          default: {
                            shadowColor: "#EA580C",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 10,
                            elevation: 4,
                          },
                        }),
                      }}
                    >
                      {/* Top Header Bar with Title & Badges */}
                      <LinearGradient
                        colors={["#D97706", "#EA580C", "#E11D48"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View className="flex-row items-center gap-1.5 mb-1">
                            <Sparkles size={12} color="#FEF3C7" />
                            <Text className="text-amber-100 text-[10px] font-poppins font-extrabold uppercase tracking-wider">
                              {fest.category === "both" ? "Food & Ration Fest" : fest.category === "grocery" ? "Ration Fest" : "Fresh Food Fest"}
                            </Text>
                          </View>
                          <Text className="font-poppins font-black text-white text-base leading-tight" numberOfLines={2}>
                            {fest.title}
                          </Text>
                        </View>
                        <View className="bg-white px-3 py-1 rounded-full shadow-sm">
                          <Text className="text-[#E11D48] text-xs font-poppins font-black uppercase">
                            Flat {fest.discountPercent}% OFF
                          </Text>
                        </View>
                      </LinearGradient>

                      {/* Clean Full Uncropped Poster Image with Blurred Background Fill */}
                      <View style={{ width: "100%", height: 260, position: "relative", overflow: "hidden", backgroundColor: "#1c1917", alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#fde68a" }}>
                        {/* Blurred Background Layer to fill sides */}
                        <View style={{ position: "absolute", top: -20, left: -20, right: -20, bottom: -20, opacity: 0.6 }}>
                          <FestivalOfferThumb
                            key={`blur-${activeOfferImg}`}
                            uri={offerImgSrc}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                            blurRadius={Platform.OS === "ios" ? 25 : 16}
                          />
                        </View>
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />

                        {/* Foreground Sharp Poster */}
                        <View style={{ width: "100%", height: "100%", padding: 8, alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                          <FestivalOfferThumb
                            key={`sharp-${activeOfferImg}`}
                            uri={offerImgSrc}
                            style={{ width: "100%", height: "100%", borderRadius: 12 }}
                            resizeMode="contain"
                          />
                        </View>

                        {/* < > Arrow Controls if 2 images exist */}
                        {offerImages.length > 1 ? (
                          <>
                            {/* Left Arrow Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                setSelectedOfferImageIndex((prev) => (prev > 0 ? prev - 1 : offerImages.length - 1))
                              }}
                              style={{
                                position: "absolute",
                                left: 10,
                                top: "50%",
                                marginTop: -20,
                                zIndex: 30,
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: "rgba(0,0,0,0.6)",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.3)",
                              }}
                            >
                              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {/* Right Arrow Button */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                setSelectedOfferImageIndex((prev) => (prev < offerImages.length - 1 ? prev + 1 : 0))
                              }}
                              style={{
                                position: "absolute",
                                right: 10,
                                top: "50%",
                                marginTop: -20,
                                zIndex: 30,
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: "rgba(0,0,0,0.6)",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.3)",
                              }}
                            >
                              <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {/* Dots Indicator at bottom */}
                            <View
                              style={{
                                position: "absolute",
                                bottom: 8,
                                left: 0,
                                right: 0,
                                zIndex: 30,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  paddingHorizontal: 8,
                                  paddingVertical: 3.5,
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.2)",
                                }}
                              >
                                {offerImages.map((_, idx) => (
                                  <View
                                    key={idx}
                                    style={{
                                      width: selectedOfferImageIndex === idx ? 16 : 5,
                                      height: 5,
                                      borderRadius: 2.5,
                                      backgroundColor: selectedOfferImageIndex === idx ? "#F59E0B" : "rgba(255,255,255,0.6)",
                                    }}
                                  />
                                ))}
                              </View>
                            </View>
                          </>
                        ) : null}
                      </View>

                      {/* Details & Subtext Bottom Container */}
                      <View className="p-4 bg-white">
                        <Text className="font-nunito text-gray-800 text-xs font-semibold leading-relaxed">
                          Enjoy <Text className="font-extrabold text-amber-700">{fest.discountPercent}% Instant Discount</Text> on all{" "}
                          <Text className="font-bold text-dark">
                            {fest.category === "both" ? "Fresh Food & Ration items" : fest.category === "food" ? "Fresh Food items" : "Grocery & Ration items"}
                          </Text>
                        </Text>

                        {fest.description ? (
                          <View className="bg-amber-50 rounded-xl p-2.5 mt-2 border border-amber-200/70">
                            <Text className="font-nunito text-gray-700 text-xs italic">
                              "{fest.description}"
                            </Text>
                          </View>
                        ) : null}

                        {fest.endDate ? (
                          <View className="flex-row items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
                            <Clock size={12} color="#92400E" />
                            <Text className="font-nunito text-[11px] text-amber-900 font-semibold">
                              Offer Valid till: {new Date(fest.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {/* Section Header for Discounted Items */}
                    <View className="mt-6 mb-3 flex-row items-center justify-between">
                      <View>
                        <Text className="font-poppins font-extrabold text-dark text-base">
                          Special Offer Dishes & Items
                        </Text>
                        <Text className="font-nunito font-semibold text-gray/80 text-[11px] mt-0.5">
                          {festivalOfferItems.length} items with {fest.discountPercent}% festival discount applied
                        </Text>
                      </View>
                      <View className="bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        <Text className="text-amber-800 text-[9px] font-poppins font-bold uppercase">
                          {fest.discountPercent}% OFF
                        </Text>
                      </View>
                    </View>

                    {/* Items Grid */}
                    {festivalOfferItems.length === 0 ? (
                      <View className="py-12 items-center bg-amber-50/50 rounded-2xl border border-dashed border-amber-200 p-6">
                        <Sparkles size={32} color="#EA580C" />
                        <Text className="font-poppins font-bold text-dark text-xs mt-3">No menu items under this category</Text>
                        <Text className="font-nunito text-[11px] text-gray text-center mt-1">
                          Browse our food and ration tabs for regular items.
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap -mx-1.5">
                        {festivalOfferItems.map((item) => (
                          <View key={item.id} className="w-1/2 p-1.5">
                            <MenuListItem
                              item={item}
                              onOpen={setSelectedItem}
                              onNavigateToCart={() => router.push("/cart")}
                              onAddToCart={addItem}
                              onRemoveFromCart={removeItem}
                              getItemQty={getItemQty}
                              variant="grid"
                            />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              })()}
            </View>
          ) : null}

          {activeTab === "hygiene" ? (
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <ShieldCheck size={20} color="#0B6B3A" />
                <Text className="font-poppins font-extrabold text-dark text-lg">Today's Hygiene Video</Text>
              </View>
              <Text className="font-nunito font-semibold text-gray/80 text-[11px] mb-5">
                Daily recorded video from {kitchen?.name} showing clean cooking area, washing area & refrigerator
              </Text>

              {(() => {
                const approvedVideo = hygieneData?.approvedVideo || hygieneData?.video || (hygieneData?.videos && hygieneData.videos.find(v => v.status === "approved")) || (hygieneData?.compliant && hygieneData?.videos?.[0])
                if (!approvedVideo?.mediaUrl) {
                  return (
                    <View className="py-12 items-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-6">
                      <ShieldCheck size={36} color="#CCCCCC" />
                      <Text className="font-poppins font-bold text-dark text-xs mt-3">No approved hygiene video for today</Text>
                      <Text className="font-nunito text-[11px] text-gray text-center mt-1">
                        This kitchen's daily video is either awaiting upload or under admin verification.
                      </Text>
                    </View>
                  )
                }
                return (
                  <View className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-200">
                    <View className="flex-row items-center gap-1.5 mb-3 bg-emerald-600 self-start px-3 py-1 rounded-full">
                      <CheckCircle size={12} color="#FFFFFF" />
                      <Text className="font-poppins font-bold text-[10px] text-white uppercase">Verified & Approved by Admin</Text>
                    </View>

                    <HygieneVideoPlayer src={resolveMediaUrl(approvedVideo.mediaUrl)} />

                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="font-poppins font-bold text-xs text-dark">Daily Kitchen Check</Text>
                      <Text className="font-nunito text-[10px] text-gray">
                        {approvedVideo.recordedAt ? new Date(approvedVideo.recordedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </Text>
                    </View>
                  </View>
                )
              })()}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Cart Bar */}
      <FloatingCart onNavigateToCart={() => router.push("/cart")} />

      {/* Bulk Order Enquiry Modal Dialog */}
      <Modal
        visible={enquiryModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={handleCloseEnquiryModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "flex-end" }}
          >
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
              onPress={handleCloseEnquiryModal}
            />
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                height: showChat ? "85%" : undefined,
                maxHeight: "88%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
            >
            {showChat ? (
              <View style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Chat Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F1EF" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <TouchableOpacity onPress={() => setShowChat(false)} style={{ padding: 4, marginRight: 2 }}>
                      <ArrowLeft size={20} color="#0B6B3A" />
                    </TouchableOpacity>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                      <ChefHat size={18} color="#0B6B3A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }} numberOfLines={1}>
                        {kitchen?.name || "Kitchen"}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#8A8A8A" }}>
                        Enquiry Chat #{activeEnquiry?.id}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleCloseEnquiryModal} style={{ padding: 4 }}>
                    <X size={20} color="#7A7A7A" />
                  </TouchableOpacity>
                </View>

                {/* Message History */}
                <ScrollView 
                  ref={chatScrollViewRef}
                  style={{ flex: 1, backgroundColor: "#ECE5DD" }}
                  onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                  contentContainerStyle={{ padding: 16, gap: 12, backgroundColor: "#ECE5DD", flexGrow: 1 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {chatMessages.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#8A8A8A", textAlign: "center" }}>
                        No messages yet. Send a message to start discussion about your quotation!
                      </Text>
                    </View>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === user?.id
                      const msgDate = new Date(msg.created_at)
                      const timeStr = isNaN(msgDate.getTime()) ? "" : msgDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      
                      return (
                        <View 
                          key={msg.id} 
                          style={{ 
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            maxWidth: "75%",
                            backgroundColor: isMe ? "#DCF8C6" : "#FFFFFF",
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderBottomRightRadius: isMe ? 2 : 12,
                            borderBottomLeftRadius: isMe ? 12 : 2,
                            shadowColor: "#000000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.12,
                            shadowRadius: 1,
                            elevation: 1,
                          }}
                        >
                          {!isMe && (
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins", marginBottom: 2 }}>
                              {msg.sender_name} ({msg.sender_role})
                            </Text>
                          )}
                          <Text style={{ fontSize: 13, color: "#303030", fontFamily: "Nunito" }}>
                            {msg.message}
                          </Text>
                          {timeStr ? (
                            <Text style={{ fontSize: 9, color: "#8A8A8A", fontFamily: "Nunito", alignSelf: "flex-end", marginTop: 4 }}>
                              {timeStr}
                            </Text>
                          ) : null}
                        </View>
                      )
                    })
                  )}
                </ScrollView>

                {/* Input Footer */}
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  paddingBottom: (Platform.OS === "android" ? keyboardHeight : 0) + 12,
                  borderTopWidth: 1, 
                  borderTopColor: "#F1F1EF", 
                  backgroundColor: "#FFFFFF",
                  gap: 10
                }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: "#F7F7F5",
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: "#1F1F1F",
                      maxHeight: 100,
                    }}
                    multiline
                    placeholder="Type a message..."
                    placeholderTextColor="#7A7A7A"
                    value={chatInput}
                    onChangeText={setChatInput}
                  />
                  <TouchableOpacity 
                    onPress={handleSendChatMessage}
                    disabled={!chatInput.trim()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: chatInput.trim() ? "#0B6B3A" : "#E8E8E8",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Send size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ width: "100%", flexShrink: 1, display: "flex", flexDirection: "column" }}>
                {/* Modal Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F1EF" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                      {hasActiveEnquiry ? "Enquiry Details" : "Bulk Order Enquiry"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", marginTop: 2 }}>
                      {kitchen?.name || "Kitchen"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {hasActiveEnquiry && (
                      <TouchableOpacity onPress={handleRefreshEnquiry} disabled={refreshingEnquiry} style={{ padding: 4 }}>
                        {refreshingEnquiry ? (
                          <ActivityIndicator size="small" color="#0B6B3A" />
                        ) : (
                          <RotateCw size={18} color="#0B6B3A" />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleCloseEnquiryModal} style={{ padding: 4 }}>
                      <X size={20} color="#1F1F1F" />
                    </TouchableOpacity>
                  </View>
                </View>

            <ScrollView
              ref={enquiryFormScrollRef}
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ 
                paddingHorizontal: 20, 
                paddingTop: 16, 
                paddingBottom: (Platform.OS === "android" ? keyboardHeight : 0) + (Platform.OS === "ios" ? 34 : 24) 
              }}
            >
              {!hasActiveEnquiry ? (
                // Submit Form Screen
                <View>
                  <View style={{ backgroundColor: "#EAF7EE", borderRadius: 16, padding: 14, marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#0B6B3A", lineHeight: 16 }}>
                      Need a custom quotation for a bulk order? Share your offered budget and guest requirements below, and the kitchen will respond.
                    </Text>
                  </View>

                  {enquiryError ? (
                    <Text style={{ color: "#EF4444", fontSize: 12, fontFamily: "Nunito", marginBottom: 12 }}>
                      {enquiryError}
                    </Text>
                  ) : null}

                  {/* Offered Budget */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>
                      Your Offered Budget (₹)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 2,
                        borderColor: "#E8E8E8",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: "#1F1F1F",
                        backgroundColor: "#FFFFFF",
                      }}
                      keyboardType="numeric"
                      placeholder="e.g. 5000"
                      placeholderTextColor="#7A7A7A"
                      value={enquiryValue}
                      onChangeText={setEnquiryValue}
                      onFocus={() => {
                        setTimeout(() => {
                          enquiryFormScrollRef.current?.scrollTo({ y: 0, animated: true });
                        }, 100);
                      }}
                    />
                  </View>

                  {/* Number of People */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>
                      Number of Guests / People
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 2,
                        borderColor: "#E8E8E8",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: "#1F1F1F",
                        backgroundColor: "#FFFFFF",
                      }}
                      keyboardType="numeric"
                      placeholder="e.g. 50"
                      placeholderTextColor="#7A7A7A"
                      value={enquiryPeopleCount}
                      onChangeText={setEnquiryPeopleCount}
                      onFocus={() => {
                        setTimeout(() => {
                          enquiryFormScrollRef.current?.scrollTo({ y: 50, animated: true });
                        }, 100);
                      }}
                    />
                  </View>

                  {/* What do you need? */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>
                      What do you need? (Description)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 2,
                        borderColor: "#E8E8E8",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 14,
                        fontFamily: "Nunito",
                        color: "#1F1F1F",
                        backgroundColor: "#FFFFFF",
                        minHeight: 100,
                        textAlignVertical: "top",
                      }}
                      multiline={true}
                      placeholder="e.g. 50 lunch boxes for office, veg thali, delivery on Friday..."
                      placeholderTextColor="#7A7A7A"
                      value={enquiryMessage}
                      onChangeText={setEnquiryMessage}
                      onFocus={() => {
                        setTimeout(() => {
                          enquiryFormScrollRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={submitEnquiry}
                    disabled={enquirySubmitting}
                    style={{
                      backgroundColor: "#0B6B3A",
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {enquirySubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 15 }}>
                        Submit Enquiry
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                // Status / View Quotation Screen
                <View>
                  {/* Status Box */}
                  <View style={{ backgroundColor: "#F5F5F3", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#7A7A7A" }}>
                        ENQUIRY STATUS
                      </Text>
                      <View style={{
                        backgroundColor:
                          activeEnquiry.status === "pending" ? "#FAF4EB" :
                          activeEnquiry.status === "quoted" ? "#EBF5FB" :
                          activeEnquiry.status === "accepted" ? "#EAF7EE" :
                          activeEnquiry.status === "completed" ? "#D1E7DD" : "#FDEDEC",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          activeEnquiry.status === "pending" ? "#FDECB2" :
                          activeEnquiry.status === "quoted" ? "#D6E6F2" :
                          activeEnquiry.status === "accepted" ? "#D6EAE7" :
                          activeEnquiry.status === "completed" ? "#A3CFBB" : "#FCD2D1"
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontFamily: "Poppins",
                          fontWeight: "bold",
                          color:
                            activeEnquiry.status === "pending" ? "#D35400" :
                            activeEnquiry.status === "quoted" ? "#2980B9" :
                            activeEnquiry.status === "accepted" ? "#0B6B3A" :
                            activeEnquiry.status === "completed" ? "#0F5132" : "#C0392B"
                        }}>
                          {activeEnquiry.status === "pending" ? "UNDER REVIEW" :
                           activeEnquiry.status === "quoted" ? "QUOTED" :
                           activeEnquiry.status === "accepted" ? "ACCEPTED" :
                           activeEnquiry.status === "completed" ? "ORDER PLACED (PAID)" : "REJECTED"}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F" }}>
                      Estimated Value: ₹{activeEnquiry.estimatedValue}
                    </Text>

                    <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#4A4A4A", marginTop: 8, lineHeight: 18 }}>
                      Requirements: {`"${activeEnquiry.message}"`}
                    </Text>
                  </View>

                  {/* Quotation Details */}
                  {(activeEnquiry.status === "quoted" || activeEnquiry.status === "accepted" || activeEnquiry.status === "rejected" || activeEnquiry.status === "completed") ? (
                    <View style={{ backgroundColor: "#EAF7EE", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#D6EAE7", marginBottom: 24 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <ClipboardList size={16} color="#0B6B3A" />
                        <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#0B6B3A" }}>
                          Quotation Details
                        </Text>
                      </View>

                      <Text style={{ fontSize: 20, fontFamily: "Poppins", fontWeight: "extrabold", color: "#0B6B3A" }}>
                        ₹{activeEnquiry.quotationAmount}
                      </Text>

                      {activeEnquiry.quotationNotes ? (
                        <View style={{
                          backgroundColor: "#F9F9FB",
                          borderLeftWidth: 3,
                          borderLeftColor: "#0B6B3A",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          marginTop: 10,
                          marginBottom: 4,
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins", textTransform: "uppercase", marginBottom: 2 }}>
                            Notes from Kitchen
                          </Text>
                          <Text style={{ fontSize: 12.5, fontFamily: "Nunito", color: "#4A4A4A", lineHeight: 18, fontStyle: "italic" }}>
                            {`"${activeEnquiry.quotationNotes}"`}
                          </Text>
                        </View>
                      ) : null}

                      {activeEnquiry.quotationFile ? (
                        <TouchableOpacity
                          onPress={() => {
                            setQuotationLoading(true)
                            setQuotationModalVisible(true)
                          }}
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 12,
                            paddingVertical: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 12,
                            borderWidth: 1,
                            borderColor: "#0B6B3A",
                          }}
                        >
                          <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 12 }}>
                            Download Quotation Document
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {/* Accept / Reject buttons */}
                      {activeEnquiry.status === "quoted" && (
                        <View style={{ marginTop: 18, gap: 12 }}>
                          <View style={{ flexDirection: "row", gap: 12 }}>
                            <TouchableOpacity
                              onPress={handleRejectQuotation}
                              style={{
                                  flex: 1,
                                  backgroundColor: "#FDEDEC",
                                  borderWidth: 1,
                                  borderColor: "#FCD2D1",
                                  borderRadius: 12,
                                  paddingVertical: 12,
                                  alignItems: "center",
                                  justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: "#C0392B", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                                Reject
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={handleAcceptQuotation}
                              style={{
                                flex: 1,
                                backgroundColor: "#0B6B3A",
                                borderRadius: 12,
                                paddingVertical: 12,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                                Accept
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            onPress={handleChatWithSeller}
                            style={{
                              backgroundColor: "#FFFFFF",
                              borderWidth: 1,
                              borderColor: "#0B6B3A",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 6
                            }}
                          >
                            <MessageSquare size={16} color="#0B6B3A" />
                            <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                              Discuss / Negotiate with Kitchen
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Pay button */}
                      {activeEnquiry.status === "accepted" && (
                        <TouchableOpacity
                          onPress={handlePayQuotation}
                          style={{
                            backgroundColor: "#F4C400",
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 18,
                          }}
                        >
                          <Text style={{ color: "#0a1f13", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                            ADD TO CART & CHECKOUT (₹{activeEnquiry.quotationAmount})
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Completed success message */}
                      {activeEnquiry.status === "completed" && (
                        <View style={{ backgroundColor: "#D1E7DD", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 18, borderWidth: 1, borderColor: "#A3CFBB" }}>
                          <Text style={{ color: "#0F5132", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                            Payment Successful!
                          </Text>
                          <Text style={{ color: "#0F5132", fontFamily: "Nunito", fontSize: 11, textAlign: "center", marginTop: 4 }}>
                            Your order has been placed. The kitchen will begin preparation.
                          </Text>
                        </View>
                      )}

                      {/* Rejected coordination options */}
                      {activeEnquiry.status === "rejected" && (
                        <View style={{ marginTop: 18, gap: 10 }}>
                          <TouchableOpacity
                            onPress={handleChatWithSeller}
                            style={{
                              backgroundColor: "#0B6B3A",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 6,
                            }}
                          >
                            <MessageSquare size={16} color="#FFFFFF" />
                            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                              Chat further with Kitchen
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={handleAcceptQuotation}
                            style={{
                              backgroundColor: "#FFFFFF",
                              borderWidth: 1,
                              borderColor: "#0B6B3A",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                              Accept Quote Instead
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", paddingVertical: 12, gap: 12 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", lineHeight: 18 }}>
                        The kitchen has been notified. You will receive quotation pricing and notes right here once they review and respond.
                      </Text>
                      <TouchableOpacity
                        onPress={handleChatWithSeller}
                        style={{
                          width: "100%",
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#0B6B3A",
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 6
                        }}
                      >
                        <MessageSquare size={16} color="#0B6B3A" />
                        <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                          Chat with Kitchen
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleDeleteEnquiry}
                    style={{
                      backgroundColor: "#FDEDEC",
                      borderWidth: 1,
                      borderColor: "#FCD2D1",
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 12,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: "#C0392B", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                      Delete Enquiry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
              </View>
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu Item Detail Modal */}
      <MenuItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onNavigateToCart={() => router.push("/cart")}
        onAddToCart={addItem}
        onRemoveFromCart={removeItem}
        getItemQty={getItemQty}
      />

      {/* Success Submission Popup */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 items-center w-full max-w-xs shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center mb-4">
              <CheckCircle size={36} color="#059669" />
            </View>
            <Text className="font-poppins font-bold text-lg text-dark text-center mb-2">
              Submitted!
            </Text>
            <Text className="font-nunito text-sm text-gray text-center mb-6 leading-5">
              Your bulk order enquiry has been successfully submitted to the kitchen owner. You will see their quotation update here once uploaded!
            </Text>
            <TouchableOpacity
              onPress={() => setSuccessModalVisible(false)}
              className="w-full py-3 bg-primary rounded-xl items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="font-poppins font-bold text-sm text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-App Chat Modal */}
      <Modal
        visible={chatModalVisible}
        transparent
        statusBarTranslucent={true}
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setChatModalVisible(false); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View 
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}
          >
            <Pressable 
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
              onPress={() => { Keyboard.dismiss(); setChatModalVisible(false); }}
            />
            <View 
              style={{ 
                backgroundColor: "#FFFFFF", 
                borderTopLeftRadius: 28, 
                borderTopRightRadius: 28, 
                height: "85%",
                maxHeight: "88%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
            >
                {/* Header */}
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  paddingHorizontal: 20, 
                  paddingVertical: 16, 
                  borderBottomWidth: 1, 
                  borderBottomColor: "#F1F1EF" 
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                      <ChefHat size={20} color="#0B6B3A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }} numberOfLines={1}>
                        {kitchen?.name}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setChatModalVisible(false); }} style={{ padding: 4 }}>
                    <X size={20} color="#7A7A7A" />
                  </TouchableOpacity>
                </View>

                {/* Message History */}
                <ScrollView 
                  ref={chatScrollViewRef}
                  style={{ flex: 1, backgroundColor: "#ECE5DD" }}
                  onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                  contentContainerStyle={{ padding: 20, gap: 12, backgroundColor: "#ECE5DD", flexGrow: 1 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {chatMessages.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#8A8A8A", textAlign: "center" }}>
                        No messages yet. Send a message to start discussion about your quotation!
                      </Text>
                    </View>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === user?.id
                      const msgDate = new Date(msg.created_at)
                      const timeStr = isNaN(msgDate.getTime()) ? "" : msgDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      
                      return (
                        <View 
                          key={msg.id} 
                          style={{ 
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            maxWidth: "75%",
                            backgroundColor: isMe ? "#DCF8C6" : "#FFFFFF",
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderBottomRightRadius: isMe ? 2 : 12,
                            borderBottomLeftRadius: isMe ? 12 : 2,
                            shadowColor: "#000000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.12,
                            shadowRadius: 1,
                            elevation: 1,
                          }}
                        >
                          {!isMe && (
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins", marginBottom: 2 }}>
                              {msg.sender_name} ({msg.sender_role})
                            </Text>
                          )}
                          <Text style={{ fontSize: 13, color: "#303030", fontFamily: "Nunito" }}>
                            {msg.message}
                          </Text>
                          {timeStr ? (
                            <Text style={{ fontSize: 9, color: "#8A8A8A", fontFamily: "Nunito", alignSelf: "flex-end", marginTop: 4 }}>
                              {timeStr}
                            </Text>
                          ) : null}
                        </View>
                      )
                    })
                  )}
                </ScrollView>

                {/* Input Footer */}
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  paddingBottom: (Platform.OS === "android" ? keyboardHeight : 0) + 12,
                  borderTopWidth: 1, 
                  borderTopColor: "#F1F1EF", 
                  backgroundColor: "#FFFFFF",
                  gap: 10
                }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: "#F7F7F5",
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      fontSize: 14,
                      fontFamily: "Nunito",
                      color: "#1F1F1F",
                      maxHeight: 100,
                    }}
                    multiline
                    placeholder="Type a message..."
                    placeholderTextColor="#7A7A7A"
                    value={chatInput}
                    onChangeText={setChatInput}
                  />
                  <TouchableOpacity 
                    onPress={handleSendChatMessage}
                    disabled={!chatInput.trim()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: chatInput.trim() ? "#0B6B3A" : "#E8E8E8",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Send size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quotation Document In-App Viewer Modal */}
      <Modal
        visible={quotationModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setQuotationModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          {/* Header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E5E5",
            backgroundColor: "#FFFFFF"
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#0B6B3A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 15, color: "#1F1F1F" }} numberOfLines={1}>
                  Quotation Document
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#7A7A7A" }} numberOfLines={1}>
                  {kitchen?.name || "Kitchen"} · ₹{activeEnquiry?.quotationAmount || activeEnquiry?.estimatedValue || ""}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setQuotationModalVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#F7F7F5",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={20} color="#1F1F1F" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quotation Body Container */}
          <View style={{ flex: 1, width: "100%", backgroundColor: "#FFFFFF", position: "relative" }}>
            {quotationLoading && (
              <View style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                gap: 10
              }}>
                <ActivityIndicator size="large" color="#0B6B3A" />
                <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#7A7A7A" }}>
                  Loading Quotation Document...
                </Text>
              </View>
            )}

            {(() => {
              const rawUrl = activeEnquiry?.quotationFile
              const fileUrl = rawUrl ? resolveMediaUrl(rawUrl) : ""
              if (!fileUrl) {
                return (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <FileText size={42} color="#0B6B3A" />
                    <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 16, color: "#1F1F1F", marginTop: 12 }}>
                      No Document Attached
                    </Text>
                  </View>
                )
              }

              if (isImageFile(fileUrl)) {
                return (
                  <ScrollView
                    style={{ flex: 1, backgroundColor: "#F7F7F5" }}
                    contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 12 }}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsVerticalScrollIndicator={false}
                  >
                    <Image
                      source={{ uri: fileUrl }}
                      style={{ width: "100%", height: 520, maxHeight: "100%" }}
                      resizeMode="contain"
                      onLoad={() => setQuotationLoading(false)}
                      onError={() => setQuotationLoading(false)}
                    />
                  </ScrollView>
                )
              }

              if (Platform.OS === "web") {
                return (
                  <iframe
                    src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`}
                    style={{ width: "100%", height: "100%", border: "none", display: "block", backgroundColor: "#FFFFFF" }}
                    title="Quotation Document"
                    onLoad={() => setQuotationLoading(false)}
                  />
                )
              }

              if (WebView) {
                return (
                  <WebView
                    source={{
                      uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`
                    }}
                    style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                    startInLoadingState={true}
                    onLoadEnd={() => setQuotationLoading(false)}
                    onError={() => setQuotationLoading(false)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={true}
                    originWhitelist={["*"]}
                    mixedContentMode="always"
                  />
                )
              }

              return (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                  <FileText size={42} color="#0B6B3A" />
                  <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 16, color: "#1F1F1F", marginTop: 12 }}>
                    Quotation Document Ready
                  </Text>
                </View>
              )
            })()}
          </View>

          {/* Footer Action Bar */}
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E5E5",
            flexDirection: "row",
            gap: 12
          }}>
            <TouchableOpacity
              onPress={async () => {
                const rawUrl = activeEnquiry?.quotationFile
                const fileUrl = rawUrl ? resolveMediaUrl(rawUrl) : null
                if (!fileUrl) {
                  showAlert("Notice", "No quotation file available to download.")
                  return
                }

                try {
                  setQuotationDownloading(true)
                  const cleanUrl = fileUrl.split("?")[0]
                  const ext = cleanUrl.split(".").pop() || "jpg"
                  const fileName = `Quotation_${activeEnquiry?.id || "bulk"}_${Date.now()}.${ext}`

                  if (Platform.OS === "android") {
                    const tempUri = `${FileSystem.cacheDirectory}${fileName}`
                    const downloadRes = await FileSystem.downloadAsync(fileUrl, tempUri)

                    if (FileSystem.StorageAccessFramework) {
                      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
                      if (permissions.granted) {
                        const base64Data = await FileSystem.readAsStringAsync(downloadRes.uri, {
                          encoding: FileSystem.EncodingType.Base64,
                        })
                        const mimeType = isImageFile(fileUrl)
                          ? (ext.toLowerCase() === "png" ? "image/png" : "image/jpeg")
                          : "application/pdf"

                        const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
                          permissions.directoryUri,
                          fileName,
                          mimeType
                        )
                        await FileSystem.writeAsStringAsync(createdUri, base64Data, {
                          encoding: FileSystem.EncodingType.Base64,
                        })
                        showAlert("Success", "Quotation saved to your device successfully!")
                      }
                    } else {
                      showAlert("Success", "Quotation saved to app storage!")
                    }
                  } else if (Platform.OS === "web") {
                    const link = document.createElement("a")
                    link.href = fileUrl
                    link.download = fileName
                    link.target = "_blank"
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  } else {
                    const fileUri = `${FileSystem.documentDirectory}${fileName}`
                    await FileSystem.downloadAsync(fileUrl, fileUri)
                    showAlert("Success", "Quotation downloaded successfully!")
                  }
                } catch (err) {
                  console.error("Quotation download error:", err)
                  showAlert("Notice", "Download complete or saved to cache.")
                } finally {
                  setQuotationDownloading(false)
                }
              }}
              disabled={quotationDownloading}
              style={{
                flex: 1,
                height: 48,
                backgroundColor: "#0B6B3A",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: quotationDownloading ? 0.75 : 1,
                shadowColor: "#0B6B3A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 3
              }}
            >
              {quotationDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Download size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 14 }}>
                {quotationDownloading ? "Saving to Device..." : "Download Quotation"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
