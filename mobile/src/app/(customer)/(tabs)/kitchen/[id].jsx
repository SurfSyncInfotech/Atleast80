import { useState, useEffect } from "react"
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Linking, Modal, TextInput, Pressable, Alert } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, Star, ShieldCheck, Clock, Share2, MapPin, Phone, ShoppingCart, ChevronRight, UtensilsCrossed, ShoppingBag, Tag, Sparkles, X, ChefHat, ArrowRight, ClipboardList, CheckCircle } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import MenuListItem from "../../../../components/common/MenuListItem"
import MenuItemDetailModal from "../../../../components/common/MenuItemDetailModal"
import { useCart } from "../../../../context/CartContext"
import { useAuth } from "../../../../context/AuthContext"
import { api } from "../../../../lib/api"
import { resolveMenuItemMedia, resolveMediaUrl } from "../../../../lib/media"
import { cn } from "../../../../lib/utils"

const KITCHEN_TYPE = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

const tabs = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "grocery", label: "Ration", icon: ShoppingBag },
  { id: "combo", label: "Combo", icon: Sparkles },
  { id: "offers", label: "Offers", icon: Tag },
]

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`)
  } else {
    Alert.alert(title, message)
  }
}

export default function KitchenDetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("food")
  const [kitchen, setKitchen] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)

  const { itemCount, total, requireCustomer } = useCart()

  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false)
  const [enquiryMessage, setEnquiryMessage] = useState("")
  const [enquiryValue, setEnquiryValue] = useState("2000")
  const [enquirySubmitting, setEnquirySubmitting] = useState(false)
  const [enquiryError, setEnquiryError] = useState("")
  const [activeEnquiry, setActiveEnquiry] = useState(null)
  const [successModalVisible, setSuccessModalVisible] = useState(false)

  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const fetchEnquiry = (!authLoading && user)
          ? api(`/api/bulk-enquiries/kitchen/${id}`).catch(() => null)
          : Promise.resolve(null)

        const [kitchenRes, menuRes, enquiryRes] = await Promise.all([
          api(`/api/kitchens/${id}`),
          api(`/api/menu/kitchen/${id}`),
          fetchEnquiry,
        ])

        if (cancelled) return

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
        }
        setKitchen(mappedKitchen)

        const mappedMenu = (menuRes.items || []).map((item) =>
          resolveMenuItemMedia({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            category: item.category || "food",
            itemType: item.item_type || "veg",
            offer: item.offer || null,
            image: item.image,
            images: item.images,
            videos: item.videos,
            kitchen: k.name,
            kitchenId: k.id,
            isCombo: item.isCombo || item.is_combo,
            comboItems: item.comboItems || [],
          })
        )
        setMenu(mappedMenu)

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
          setActiveTab("offers")
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

  const submitEnquiry = async () => {
    const val = Number(enquiryValue)
    if (!enquiryMessage || enquiryMessage.trim().length < 10) {
      setEnquiryError("Describe your requirements (at least 10 characters)")
      return
    }
    if (!val || Number.isNaN(val) || val < 2000) {
      setEnquiryError("Minimum order value is ₹2000")
      return
    }

    setEnquiryError("")
    setEnquirySubmitting(true)
    try {
      const data = await api("/api/bulk-enquiries", {
        method: "POST",
        body: JSON.stringify({
          kitchenId: kitchen.id,
          message: enquiryMessage.trim(),
          estimatedValue: val,
        }),
      })

      if (data.enquiry) {
        setActiveEnquiry(data.enquiry)
      }
      setEnquiryModalVisible(false)
      setEnquiryMessage("")
      setEnquiryValue("2000")
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
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchen.id}`)
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
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchen.id}`)
      setActiveEnquiry(updated.enquiry)
      showAlert("Success", "You have rejected the quotation. You can now coordinate with the seller.")
    } catch (err) {
      showAlert("Error", err.message || "Failed to reject quotation")
    }
  }

  const handlePayQuotation = () => {
    const processPayment = async () => {
      try {
        await api(`/api/bulk-enquiries/${activeEnquiry.id}/pay`, {
          method: "POST",
        })
        const updated = await api(`/api/bulk-enquiries/kitchen/${kitchen.id}`)
        setActiveEnquiry(updated.enquiry)
        showAlert("Payment Success", "Thank you! Your payment for the bulk order is successful.")
      } catch (err) {
        showAlert("Error", err.message || "Failed to process payment")
      }
    }

    if (Platform.OS === "web") {
      const ok = window.confirm(`Proceed to pay ₹${activeEnquiry.quotationAmount} for bulk order enquiry #${activeEnquiry.id}?`)
      if (ok) {
        processPayment()
      }
    } else {
      Alert.alert(
        "Payment",
        `Proceed to pay ₹${activeEnquiry.quotationAmount} for bulk order enquiry #${activeEnquiry.id}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Pay Now", 
            onPress: processPayment
          }
        ]
      )
    }
  }

  const handleChatWithSeller = () => {
    if (kitchen.phone) {
      const formattedPhone = kitchen.phone.replace(/[^0-9]/g, "")
      const phoneWithCode = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone
      Linking.openURL(`https://wa.me/${phoneWithCode}?text=Hello, I am contacting you regarding bulk order enquiry #${activeEnquiry.id}`)
    } else {
      showAlert("Not Available", "This kitchen does not have a contact number listed.")
    }
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

  const foodItems = menu.filter((i) => i.category === "food" && !(i.isCombo || i.is_combo))
  const groceryItems = menu.filter((i) => i.category === "grocery" && !(i.isCombo || i.is_combo))
  const comboItems = menu.filter((i) => i.isCombo || i.is_combo)
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
    if (tab.id === "combo") {
      return comboItems.length > 0
    }
    return true
  })

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
              onPress={() => router.back()}
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
              {kitchen.phone ? (
                <View className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-lg bg-[#EBF5FB] items-center justify-center border border-[#D6E6F2]">
                    <Phone size={11} color="#2980B9" />
                  </View>
                  <Text className="font-nunito font-semibold text-gray/80 text-xs flex-1">{kitchen.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Bulk Order Enquiry CTA Card */}
        {!activeEnquiry ? (
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
        ) : activeEnquiry.status === "pending" ? (
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
                  {tab.id === "offers" && offerCount > 0 ? (
                    <View className={cn("w-4 h-4 rounded-full items-center justify-center ml-1", active ? "bg-white/20" : "bg-accent/15")}>
                      <Text className={cn("text-[9px] font-bold", active ? "text-white" : "text-accent")}>
                        {offerCount}
                      </Text>
                    </View>
                  ) : null}
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
                      <MenuListItem item={item} onOpen={setSelectedItem} variant="grid" />
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
                      <MenuListItem item={item} onOpen={setSelectedItem} variant="grid" />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {activeTab === "combo" ? (
            <View>
              <Text className="font-poppins font-extrabold text-dark text-lg mb-0.5">Combos & Packages</Text>
              <Text className="font-nunito font-semibold text-gray/80 text-[11px] mb-5">
                Constituent items in one package · {comboItems.length} combos
              </Text>
              {comboItems.length === 0 ? (
                <View className="py-12 items-center">
                  <Sparkles size={36} color="#E8E8E8" />
                  <Text className="font-nunito text-gray text-xs mt-2">No combos listed yet</Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap -mx-1.5">
                  {comboItems.map((item) => (
                    <View key={item.id} className="w-1/2 p-1.5">
                      <MenuListItem item={item} onOpen={setSelectedItem} variant="grid" />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {activeTab === "offers" ? (
            <View>
              <Text className="font-poppins font-extrabold text-dark text-lg mb-0.5">Offers & Deals</Text>
              <Text className="font-nunito font-semibold text-gray/80 text-[11px] mb-5">
                Active deals from this kitchen · {offerCount} active
              </Text>
              {offerCount === 0 ? (
                <View className="py-12 items-center">
                  <Tag size={36} color="#E8E8E8" />
                  <Text className="font-nunito text-gray text-xs mt-2">No offers right now</Text>
                </View>
              ) : (
                <View>
                  {kitchen.offer ? (
                    <LinearGradient
                      colors={["#0B6B3A", "#064d29", "#04331b"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 20,
                        borderRadius: 16,
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: 16,
                        ...Platform.select({
                          web: {
                            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.05)",
                          },
                          default: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 6,
                            elevation: 2,
                          },
                        }),
                      }}
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Sparkles size={14} color="#FFD740" />
                        <Text className="text-secondary text-[9px] font-poppins font-bold uppercase tracking-wider">
                          Kitchen-wide offer
                        </Text>
                      </View>
                      <Text className="font-poppins font-bold text-white text-xl mt-3">{kitchen.offer}</Text>
                      <Text className="font-nunito text-white/60 text-xs mt-1 leading-relaxed">
                        Applies to your order from {kitchen.name}. Add items to your cart and check out.
                      </Text>
                    </LinearGradient>
                  ) : null}

                  <View className="flex-row flex-wrap -mx-1.5">
                    {offerItems.map((item) => (
                      <View key={item.id} className="w-1/2 p-1.5">
                        <MenuListItem item={item} onOpen={setSelectedItem} variant="grid" />
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bulk Order Enquiry Modal Dialog */}
      <Modal
        visible={enquiryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}
          onPress={() => setEnquiryModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Platform.OS === "ios" ? 44 : 28,
              maxHeight: "85%"
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>
                  {activeEnquiry ? "Enquiry Details" : "Bulk Order Enquiry"}
                </Text>
                <Text style={{ fontSize: 11, color: "#7A7A7A", fontFamily: "Nunito", marginTop: 2 }}>
                  {kitchen.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnquiryModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#1F1F1F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {!activeEnquiry ? (
                // Submit Form Screen
                <View>
                  <View style={{ backgroundColor: "#EAF7EE", borderRadius: 16, padding: 14, marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#0B6B3A", lineHeight: 16 }}>
                      Need a quotation for a bulk order? Minimum order value is ₹2000. Share your requirements and the kitchen will upload a quotation for you.
                    </Text>
                  </View>

                  {enquiryError ? (
                    <Text style={{ color: "#EF4444", fontSize: 12, fontFamily: "Nunito", marginBottom: 12 }}>
                      {enquiryError}
                    </Text>
                  ) : null}

                  {/* Estimated Value */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>
                      Estimated Order Value (₹, Min 2000)
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
                      value={enquiryValue}
                      onChangeText={setEnquiryValue}
                    />
                  </View>

                  {/* What do you need? */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>
                      What do you need?
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
                        <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#4A4A4A", marginTop: 8, lineHeight: 18 }}>
                          Notes from Kitchen: {`"${activeEnquiry.quotationNotes}"`}
                        </Text>
                      ) : null}

                      {activeEnquiry.quotationFile ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(activeEnquiry.quotationFile)}
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
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
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
                            PROCEED TO PAY ₹{activeEnquiry.quotationAmount}
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
                              backgroundColor: "#25D366",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 6,
                            }}
                          >
                            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 13 }}>
                              Chat further with Seller (WhatsApp)
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
                    <View style={{ alignItems: "center", paddingVertical: 12 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", lineHeight: 18 }}>
                        The kitchen has been notified. You will receive quotation pricing and notes right here once they review and respond.
                      </Text>
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
                      marginBottom: 20,
                    }}
                  >
                    <Text style={{ color: "#C0392B", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                      Delete Enquiry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Menu Item Detail Modal */}
      <MenuItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />

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
    </SafeAreaView>
  )
}
