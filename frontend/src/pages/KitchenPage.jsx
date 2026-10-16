import { useState, useEffect } from "react"

import { useParams, useNavigate, useSearchParams } from "react-router-dom"

import { motion } from "framer-motion"

import {
  ArrowLeft, Star, ShieldCheck, Clock, Share2, MapPin, Phone,
  ShoppingCart, ChevronLeft, ChevronRight, UtensilsCrossed, ShoppingBag, Tag, Sparkles,
  Plus, Minus, ChefHat, ArrowRight,
} from "lucide-react"

import MenuListItem from "../components/common/MenuListItem"
import MenuItemDetailModal from "../components/common/MenuItemDetailModal"
import KitchenAvatar from "../components/common/KitchenAvatar"
import BulkOrderChatbot from "../components/common/BulkOrderChatbot"
import InlineBulkEnquiryCard from "../components/kitchen/InlineBulkEnquiryCard"
import BulkOrderEnquiryModal from "../components/common/BulkOrderEnquiryModal"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { resolveMenuItemMedia, resolveMediaUrl } from "../lib/media"
import { toKitchenCard } from "../lib/kitchen"
import { kitchens as mockKitchens, menuItems as mockMenu, groceryItems as mockGrocery } from "../data/mockData"
import { cn } from "../lib/utils"

const BANNER = "/banner.png"
const KITCHEN_TYPE = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

const tabs = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "grocery", label: "Ration", icon: ShoppingBag },
  { id: "offer", label: "Offer", icon: Sparkles },
  { id: "hygiene", label: "Check Hygiene", icon: ShieldCheck },
]

function mapApiKitchen(k) {
  const card = toKitchenCard(k)
  return {
    ...card,
    description: k.description,
    address: k.address,
    pincode: k.pincode,
    openingTime: k.opening_time,
    phone: k.phone,
    image: k.image || null,
    isFreshFoodActive: k.is_fresh_food_active ?? 1,
    isGroceryActive: k.is_grocery_active ?? 1,
    festivalOffer: k.festivalOffer || null,
    festival_offer_enabled: k.festival_offer_enabled,
    festival_offer_title: k.festival_offer_title,
    festival_offer_category: k.festival_offer_category,
    festival_offer_discount_percent: k.festival_offer_discount_percent,
    festival_offer_start_date: k.festival_offer_start_date,
    festival_offer_end_date: k.festival_offer_end_date,
    festival_offer_description: k.festival_offer_description,
    festival_offer_image: k.festival_offer_image,
    festival_offer_image_2: k.festival_offer_image_2,
  }
}

function mapApiMenuItem(item, kitchenName, kitchenId, festivalOffer) {
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

  if (festivalOffer?.active && Number(festivalOffer.discountPercent) > 0) {
    const isCatMatch =
      festivalOffer.category === "both" ||
      (festivalOffer.category === "food" && item.category === "food") ||
      (festivalOffer.category === "grocery" && item.category === "grocery")

    if (isCatMatch) {
      discountPercent = Number(festivalOffer.discountPercent)
      offerPrice = Number(Math.max(1, originalPrice * (1 - discountPercent / 100)).toFixed(2))
      festivalOfferTitle = festivalOffer.title
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
    kitchen: kitchenName,
    kitchenId: kitchenId || item.kitchen_id,
    is_available: item.is_available === undefined || item.is_available === null ? true : Boolean(item.is_available),
    isAvailable: item.is_available === undefined || item.is_available === null ? true : Boolean(item.is_available),
    isCombo: item.isCombo || item.is_combo,
    comboItems: item.comboItems || [],
  })
}

export default function KitchenPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState("food")
  const [kitchen, setKitchen] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [activeOfferImageIndex, setActiveOfferImageIndex] = useState(0)
  const [hygieneData, setHygieneData] = useState({ videos: [], compliant: false, areas: [] })

  const [activeEnquiry, setActiveEnquiry] = useState(null)
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const [refreshingEnquiry, setRefreshingEnquiry] = useState(false)

  const { itemCount, total, requireCustomer } = useCart()
  const { customerUser } = useAuth()

  const handleRefreshEnquiry = async () => {
    if (!id || !customerUser) return
    setRefreshingEnquiry(true)
    try {
      const data = await api(`/api/bulk-enquiries/kitchen/${id}`, {}, "customer")
      setActiveEnquiry(data.enquiry || null)
    } catch {
      setActiveEnquiry(null)
    } finally {
      setRefreshingEnquiry(false)
    }
  }

  useEffect(() => {
    if (!id || !customerUser) {
      setActiveEnquiry(null)
      return
    }

    let cancelled = false
    const pollEnquiry = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/kitchen/${id}`, {}, "customer")
        if (!cancelled) setActiveEnquiry(data.enquiry || null)
      } catch {
        if (!cancelled) setActiveEnquiry(null)
      }
    }

    pollEnquiry()
    const interval = setInterval(pollEnquiry, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id, customerUser])



  useEffect(() => {

    let cancelled = false



    async function load() {

      setLoading(true)

      try {

        const [kitchenRes, menuRes, hygieneRes] = await Promise.all([

          api(`/api/kitchens/${id}`),

          api(`/api/menu/kitchen/${id}`),

          api(`/api/hygiene/kitchen/${id}`).catch(() => ({ videos: [], compliant: false, areas: [] })),

        ])

        if (cancelled) return

        const k = mapApiKitchen(kitchenRes.kitchen)

        setKitchen(k)

        const mappedMenu = menuRes.items.map((item) => mapApiMenuItem(item, k.name, k.id, k.festivalOffer))
        setMenu(mappedMenu)

        // Auto-open selected dish if coming from search redirect
        const selectedItemId = searchParams.get("selectedItemId")
        const dishParam = searchParams.get("dish")
        if (selectedItemId || dishParam) {
          const targetId = selectedItemId ? Number(selectedItemId) : null
          const targetName = dishParam ? String(dishParam).trim().toLowerCase() : null
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

        setHygieneData(hygieneRes)

        // Set default active tab dynamically based on availability
        const hasFood = (k.isFreshFoodActive !== 0) && mappedMenu.some(item => item.category === "food" && !(item.isCombo || item.is_combo))
        const hasGrocery = (k.isGroceryActive !== 0) && mappedMenu.some(item => item.category === "grocery" && !(item.isCombo || item.is_combo))
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

      } catch {

        if (cancelled) return

        const mock = mockKitchens.find((k) => k.id === Number(id)) || mockKitchens[0]

        setKitchen({

          ...mock,

          city: "Lucknow",

          state: "UP",

          address: "Hazratganj",

          pincode: "226001",

          openingTime: "8:00 AM - 9:00 PM",

          kitchenType: "veg",

          description: "Authentic homemade food prepared fresh daily with love and care.",

          image: null,

        })

        setMenu([

          ...mockMenu.map((i) => ({ ...mapMockFood(i), kitchenId: mock.id })),

          ...mockGrocery.map((i) => ({ ...mapMockGrocery(i), kitchenId: mock.id })),

        ])

      } finally {

        if (!cancelled) setLoading(false)

      }

    }



    load()

    const pollInterval = setInterval(() => {
      Promise.all([
        api(`/api/kitchens/${id}`).catch(() => null),
        api(`/api/menu/kitchen/${id}`).catch(() => null),
      ])
        .then(([kRes, mRes]) => {
          if (cancelled) return
          let latestKitchen = kitchen
          if (kRes?.kitchen) {
            latestKitchen = mapApiKitchen(kRes.kitchen)
            setKitchen(latestKitchen)
          }
          if (mRes?.items) {
            const kName = latestKitchen?.name || ""
            const festOffer = latestKitchen?.festivalOffer
            setMenu(mRes.items.map((item) => mapApiMenuItem(item, kName, id, festOffer)))
          }
        })
        .catch(() => {})
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(pollInterval)
    }
  }, [id])



  const foodItems = menu.filter((i) => i.category === "food" && !(i.isCombo || i.is_combo))
  const groceryItems = menu.filter((i) => i.category === "grocery" && !(i.isCombo || i.is_combo))
  const comboItems = menu.filter((i) => i.isCombo || i.is_combo)
  const festivalOffer = kitchen?.festivalOffer
  const isOfferActive = Boolean(festivalOffer?.active)
  const festivalOfferItems = isOfferActive
    ? menu.filter((item) => {
        if (festivalOffer.category === "both") return true
        if (festivalOffer.category === "food") return item.category === "food"
        if (festivalOffer.category === "grocery") return item.category === "grocery"
        return true
      })
    : []
  const offerItems = menu.filter((i) => i.offer)
  const offerCount = (kitchen?.offer ? 1 : 0) + offerItems.length



  if (loading || !kitchen) {

    return (

      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center">

        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />

      </div>

    )

  }



  const location = [kitchen.city, kitchen.state].filter(Boolean).join(", ")



  return (

    <div className="min-h-screen bg-[#f5f5f4] pb-28">

      {/* Hero banner */}

      <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden bg-primary-dark">

        <img src={BANNER} alt="" className="w-full h-full object-cover object-center" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#f5f5f4]" />



        <div className="absolute top-0 left-0 right-0 z-10">

          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between py-4">

            <button

              onClick={() => navigate(-1)}

              className="w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-white transition-colors"

              aria-label="Go back"

            >

              <ArrowLeft size={20} className="text-dark" />

            </button>

            <button

              className="w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-white transition-colors"

              aria-label="Share"

            >

              <Share2 size={18} className="text-dark" />

            </button>

          </div>

        </div>

      </div>



      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-10">

        {/* Kitchen profile card */}

        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">

          <div className="p-5 sm:p-6">

            <div className="flex gap-4 sm:gap-5">

              <KitchenAvatar kitchen={kitchen} image={kitchen.image} size="xl" className="flex-shrink-0 -mt-2 sm:-mt-4" />

              <div className="flex-1 min-w-0 pt-1">

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <h1 className="font-poppins font-bold text-dark text-xl sm:text-2xl lg:text-[1.65rem] leading-tight truncate">

                      {kitchen.name}

                    </h1>

                    <p className="font-nunito text-gray text-sm mt-1">{kitchen.speciality}</p>

                  </div>

                  {kitchen.ratingVisible && kitchen.rating != null ? (
                  <div className="flex-shrink-0 flex items-center gap-1 bg-secondary/15 text-dark px-2.5 py-1.5 rounded-xl">
                    <Star size={14} className="fill-secondary text-secondary" />
                    <span className="font-poppins font-bold text-sm">{kitchen.rating}</span>
                  </div>
                  ) : (
                  <div className="flex-shrink-0 text-[10px] font-poppins font-semibold text-gray bg-gray-100 px-2.5 py-1.5 rounded-xl">
                    New
                  </div>
                  )}

                </div>



                {location && (

                  <p className="font-nunito text-gray/80 text-xs sm:text-sm mt-2 flex items-center gap-1.5">

                    <MapPin size={13} className="text-primary flex-shrink-0" />

                    {location}

                    {kitchen.kitchenType && (

                      <span className="text-gray/40 mx-1">·</span>

                    )}

                    {kitchen.kitchenType && (

                      <span className="text-primary font-medium">{KITCHEN_TYPE[kitchen.kitchenType]}</span>

                    )}

                  </p>

                )}



                {kitchen.offer && (

                  <span className="inline-block mt-2.5 text-[11px] font-poppins font-bold px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20">

                    {kitchen.offer}

                  </span>

                )}

              </div>

            </div>

          </div>



          {/* Metrics strip */}

          <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50/50">

            <MetricCell icon={Clock} label="Delivery" value={kitchen.deliveryTime} />

            <MetricCell icon={UtensilsCrossed} label="Menu" value={`${foodItems.length + groceryItems.length} items`} />

          </div>



        </div>



        {/* Inline Bulk Order Enquiry CTA & Active Status Card */}
        <InlineBulkEnquiryCard
          enquiry={activeEnquiry}
          onOpenModal={() => setEnquiryModalOpen(true)}
          onRefresh={handleRefreshEnquiry}
          refreshing={refreshingEnquiry}
          onRequireCustomer={requireCustomer}
        />

        {/* Festival Offer Banner CTA (Exact HomePage style) */}
        {kitchen?.festivalOffer?.active && activeTab !== "offer" && (
          <div
            onClick={() => setActiveTab("offer")}
            className="mt-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group"
          >
            {/* Floating Festival Visual Badge / Illustration on the right */}
            <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 opacity-25 group-hover:opacity-40 group-hover:scale-110 transition-all pointer-events-none shadow-2xl">
              <img
                src={resolveMediaUrl(kitchen.festivalOffer.image || kitchen.festival_offer_image) || "/festival_offer_default.jpg"}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = "/festival_offer_default.jpg"
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
              <Sparkles size={120} />
            </div>

            <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
              <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-poppins font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {kitchen.festivalOffer.category === "both" ? "🍲 Food & Ration" : kitchen.festivalOffer.category === "grocery" ? "🌾 Ration Only" : "🍲 Homemade Food"}
              </span>
              <span className="bg-white text-rose-600 font-poppins font-extrabold text-xs px-3 py-1 rounded-full shadow-sm">
                Flat {kitchen.festivalOffer.discountPercent}% OFF
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-2 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white p-0.5 overflow-hidden shadow-md flex-shrink-0">
                <img
                  src={resolveMediaUrl(kitchen.logo || kitchen.image) || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop"}
                  alt={kitchen.name}
                  className="w-full h-full rounded-[14px] object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-poppins font-bold text-white text-base sm:text-lg leading-tight truncate">
                  {kitchen.name}
                </h4>
                <p className="font-nunito text-amber-200 text-xs font-semibold mt-0.5 truncate">
                  ✨ {kitchen.festivalOffer.title}
                </p>
              </div>
              {/* Floating Preview Pill */}
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/40 shadow-sm flex-shrink-0 bg-white/20">
                <img
                  src={resolveMediaUrl(kitchen.festivalOffer.image || kitchen.festival_offer_image) || "/festival_offer_default.jpg"}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = "/festival_offer_default.jpg"
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <p className="font-nunito text-white/90 text-xs mt-1 mb-4 line-clamp-2 leading-relaxed relative z-10">
              {kitchen.festivalOffer.description || "Handcrafted festive delicacies and special packages available for a limited time."}
            </p>

            <div className="bg-white text-dark rounded-xl py-2.5 px-4 flex items-center justify-between shadow-sm group-hover:bg-amber-50 transition-colors relative z-10">
              <span className="font-poppins font-bold text-xs text-[#0a1f13]">
                Unlock Secret Festival Menu
              </span>
              <ArrowRight size={14} className="text-orange-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="sticky top-0 z-20 mt-5 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 bg-[#f5f5f4]/95 backdrop-blur-md">
          <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
            {tabs.filter(tab => {
              if (tab.id === "food" && (kitchen?.isFreshFoodActive === 0 || foodItems.length === 0)) return false
              if (tab.id === "grocery" && (kitchen?.isGroceryActive === 0 || groceryItems.length === 0)) return false
              if (tab.id === "combo" && comboItems.length === 0) return false
              if (tab.id === "offer" && !kitchen?.festivalOffer?.active) return false
              return true
            }).map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-poppins font-semibold cursor-pointer transition-all duration-200",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray hover:text-dark hover:bg-gray-50"
                  )}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[50vh]">
            {activeTab === "food" && (
              <MenuSection title="Food Menu" subtitle="Fresh homemade dishes" count={foodItems.length} empty="No food items listed yet">
                {foodItems.map((item) => (
                  <MenuListItem key={item.id} item={item} onOpen={setSelectedItem} />
                ))}
              </MenuSection>
            )}

            {activeTab === "grocery" && (
              <MenuSection title="Ration & Grocery" subtitle="Daily essentials from this kitchen" count={groceryItems.length} empty="No ration items listed yet">
                {groceryItems.map((item) => (
                  <MenuListItem key={item.id} item={item} onOpen={setSelectedItem} />
                ))}
              </MenuSection>
            )}

            {activeTab === "combo" && (
              <MenuSection title="Combos & Packages" subtitle="Constituent items in one package" count={comboItems.length} empty="No combos listed yet">
                {comboItems.map((item) => (
                  <MenuListItem key={item.id} item={item} onOpen={setSelectedItem} />
                ))}
              </MenuSection>
            )}

            {activeTab === "offer" && kitchen?.festivalOffer?.active && (() => {
              const offerImages = [
                kitchen.festivalOffer.image || kitchen.festival_offer_image || "/festival_offer_default.jpg",
                kitchen.festivalOffer.image2 || kitchen.festival_offer_image_2,
              ].filter(Boolean)
              const activeOfferImg = offerImages[activeOfferImageIndex] || offerImages[0]
              const activeOfferImgSrc = resolveMediaUrl(activeOfferImg) || "/festival_offer_default.jpg"

              return (
              <div className="p-4 sm:p-6">
                {/* Festival Offer Full Uncropped Poster Card */}
                <div className="bg-white rounded-3xl border border-amber-200 shadow-xl overflow-hidden mb-6 animate-in fade-in transition-all">
                  {/* Top Header Strip with Title & Badges */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={14} className="text-amber-200" />
                        <span className="text-amber-100 font-poppins font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                          {kitchen.festivalOffer.category === "both"
                            ? "Food & Ration Festival"
                            : kitchen.festivalOffer.category === "food"
                            ? "Fresh Food Festival"
                            : "Grocery & Ration Festival"}
                        </span>
                      </div>
                      <h2 className="font-poppins font-black text-xl sm:text-2xl text-white">
                        {kitchen.festivalOffer.title}
                      </h2>
                    </div>

                    <div className="self-start sm:self-auto bg-white px-4 py-1.5 rounded-full shadow-md">
                      <span className="text-rose-600 font-poppins font-black text-xs sm:text-sm uppercase tracking-wide">
                        Flat {kitchen.festivalOffer.discountPercent}% OFF
                      </span>
                    </div>
                  </div>

                  {/* Clean Full Uncropped Poster Image with Blurred Background Fill */}
                  <div className="relative w-full h-72 sm:h-88 md:h-96 overflow-hidden flex items-center justify-center border-b border-amber-100 bg-neutral-900 group/poster">
                    {/* Blurred Background Layer (Fill Side Spaces) */}
                    <img
                      key={`blur-${activeOfferImg}`}
                      src={activeOfferImgSrc}
                      alt=""
                      aria-hidden="true"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = "/festival_offer_default.jpg"
                      }}
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />

                    {/* Crisp Foreground Poster Layer */}
                    <img
                      key={`sharp-${activeOfferImg}`}
                      src={activeOfferImgSrc}
                      alt={kitchen.festivalOffer.title || "Festival Offer"}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = "/festival_offer_default.jpg"
                      }}
                      className="relative z-10 max-h-full max-w-full object-contain p-2 drop-shadow-2xl rounded-2xl transition-all duration-300"
                    />

                    {/* < > Arrow Controls if 2 images exist */}
                    {offerImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveOfferImageIndex((prev) => (prev > 0 ? prev - 1 : offerImages.length - 1))
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center cursor-pointer transition-all shadow-xl backdrop-blur-md border border-white/30 active:scale-95 hover:scale-105"
                          aria-label="Previous Image"
                        >
                          <ChevronLeft size={22} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveOfferImageIndex((prev) => (prev < offerImages.length - 1 ? prev + 1 : 0))
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center cursor-pointer transition-all shadow-xl backdrop-blur-md border border-white/30 active:scale-95 hover:scale-105"
                          aria-label="Next Image"
                        >
                          <ChevronRight size={22} />
                        </button>

                        {/* Dot / Slide Indicator */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                          {offerImages.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveOfferImageIndex(idx)
                              }}
                              className={cn(
                                "h-2 rounded-full transition-all cursor-pointer",
                                activeOfferImageIndex === idx ? "w-6 bg-amber-400 shadow-xs" : "w-2 bg-white/50 hover:bg-white"
                              )}
                              aria-label={`Go to slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Bottom Highlights & Details Strip */}
                  <div className="p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-nunito text-sm sm:text-base text-gray-800 leading-relaxed font-semibold">
                        Enjoy <strong className="text-amber-700 font-extrabold">{kitchen.festivalOffer.discountPercent}% Instant Discount</strong> on all{" "}
                        <span className="text-dark font-bold underline decoration-amber-400">
                          {kitchen.festivalOffer.category === "both"
                            ? "Food & Ration items"
                            : kitchen.festivalOffer.category === "food"
                            ? "Fresh Homemade Food"
                            : "Grocery & Ration items"}
                        </span>
                      </p>

                      {kitchen.festivalOffer.description && (
                        <div className="mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70 inline-block">
                          <p className="font-nunito text-xs sm:text-sm text-gray-700 italic">
                            "{kitchen.festivalOffer.description}"
                          </p>
                        </div>
                      )}
                    </div>

                    {kitchen.festivalOffer.endDate && (
                      <div className="bg-amber-100 border border-amber-300/80 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 self-start md:self-auto flex-shrink-0 shadow-xs">
                        <Clock size={16} className="text-amber-800" />
                        <div>
                          <p className="font-nunito text-[11px] font-bold text-amber-800 uppercase tracking-wide">Offer Valid Till</p>
                          <p className="font-poppins font-bold text-xs sm:text-sm text-dark mt-0.5">
                            {new Date(kitchen.festivalOffer.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-poppins font-bold text-dark text-lg sm:text-xl">
                    Special Offer Dishes & Items
                  </h3>
                  <p className="font-nunito text-xs sm:text-sm text-gray mt-0.5">
                    {festivalOfferItems.length} items with {kitchen.festivalOffer.discountPercent}% festival discount applied
                  </p>
                </div>

                {festivalOfferItems.length === 0 ? (
                  <div className="py-16 text-center text-gray font-nunito bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No menu items listed under this offer category yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {festivalOfferItems.map((item) => (
                      <MenuListItem key={item.id} item={item} onOpen={setSelectedItem} />
                    ))}
                  </div>
                )}
              </div>
              )
            })()}

            {activeTab === "hygiene" && (
              <HygieneTab data={hygieneData} kitchen={kitchen} />
            )}

          </div>



          <aside className="hidden lg:block space-y-4 sticky top-20">

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">

              <AboutPanel kitchen={kitchen} />

            </div>

            {kitchen.bestItem && (

              <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-md">

                <p className="text-[10px] font-poppins font-bold uppercase tracking-widest text-secondary">Must Try</p>

                <p className="font-poppins font-bold text-lg mt-2">{kitchen.bestItem}</p>

                <p className="font-nunito text-white/60 text-xs mt-2">Chef&apos;s signature recommendation</p>

              </div>

            )}

          </aside>

        </div>

      </div>



      <MenuItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      <BulkOrderEnquiryModal
        isOpen={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
        kitchenId={kitchen.id}
        kitchenName={kitchen.name}
        enquiry={activeEnquiry}
        onEnquiryChange={(updated) => setActiveEnquiry(updated)}
        onRefresh={handleRefreshEnquiry}
        refreshing={refreshingEnquiry}
      />

      {/* Floating Enquiry Trigger Button */}
      <div className={cn("fixed right-4 z-40 transition-all", itemCount > 0 ? "bottom-24 sm:bottom-28" : "bottom-6")}>
        <button
          type="button"
          onClick={() => {
            if (requireCustomer()) {
              setEnquiryModalOpen(true)
            }
          }}
          className="flex items-center gap-2 bg-[#0C4240] hover:bg-[#135E39] text-white px-5 py-3 rounded-full shadow-2xl transition-all cursor-pointer font-poppins font-bold text-sm active:scale-95 border border-emerald-700/50"
        >
          <ChefHat size={18} className="text-[#F4C400]" />
          <span>{activeEnquiry ? "Enquiry Status" : "Enquire now"}</span>
        </button>
      </div>

      {itemCount > 0 && (

        <motion.div

          initial={{ y: 80, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"

        >

          <button

            onClick={() => requireCustomer() && navigate("/cart")}

            className="pointer-events-auto w-full max-w-[1200px] mx-auto bg-primary text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between hover:bg-primary-dark transition-colors cursor-pointer"

          >

            <div className="flex items-center gap-3">

              <div className="relative bg-white/15 rounded-xl p-2.5">

                <ShoppingCart size={20} />

                <span className="absolute -top-1.5 -right-1.5 bg-secondary text-dark text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">

                  {itemCount}

                </span>

              </div>

              <span className="font-poppins font-semibold text-sm">

                View cart · {itemCount} item{itemCount > 1 ? "s" : ""}

              </span>

            </div>

            <div className="flex items-center gap-1 font-poppins font-bold text-base">

              ₹{total}

              <ChevronRight size={18} />

            </div>

          </button>

        </motion.div>

      )}

    </div>

  )

}



function MetricCell({ icon: Icon, label, value, highlight }) {

  return (

    <div className={cn(

      "flex flex-col items-center justify-center py-4 px-2 text-center border-r border-gray-100 last:border-r-0",

      highlight && "bg-primary/[0.03]"

    )}>

      <Icon size={16} className={cn("mb-1.5", highlight ? "text-primary" : "text-gray")} />

      <span className="font-poppins font-bold text-dark text-sm leading-none">{value}</span>

      <span className="font-nunito text-[10px] text-gray mt-1 uppercase tracking-wide">{label}</span>

    </div>

  )

}



function AboutPanel({ kitchen, compact }) {

  return (

    <>

      <h4 className="font-poppins font-bold text-dark text-sm mb-3">About this kitchen</h4>

      {kitchen.description ? (

        <p className={cn("font-nunito text-gray leading-relaxed", compact ? "text-xs" : "text-sm")}>

          {kitchen.description}

        </p>

      ) : (

        <p className="font-nunito text-gray text-sm italic">No description provided yet.</p>

      )}

      <div className={cn("space-y-2.5", compact ? "mt-3" : "mt-4 pt-4 border-t border-gray-50")}>

        {kitchen.address && <InfoRow icon={MapPin} text={`${kitchen.address}, ${kitchen.city}`} />}

        {kitchen.openingTime && <InfoRow icon={Clock} text={kitchen.openingTime} />}

        

      </div>

    </>

  )

}



function MenuSection({ title, subtitle, count, empty, children }) {

  return (

    <>

      <div className="px-5 sm:px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/30">

        <h2 className="font-poppins font-bold text-dark text-lg">{title}</h2>

        <p className="font-nunito text-xs text-gray mt-0.5">{subtitle} · {count} item{count !== 1 ? "s" : ""}</p>

      </div>

      <div className="px-5 sm:px-6">

        {count === 0 ? (

          <div className="py-16 text-center">

            <UtensilsCrossed size={36} className="text-gray-light mx-auto mb-3 opacity-50" />

            <p className="font-nunito text-gray text-sm">{empty}</p>

          </div>

        ) : children}

      </div>

    </>

  )

}




function InfoRow({ icon: Icon, text }) {

  return (

    <div className="flex items-start gap-2.5 text-sm font-nunito text-gray">

      <Icon size={14} className="text-primary mt-0.5 flex-shrink-0" />

      <span>{text}</span>

    </div>

  )

}



function HygieneTab({ data, kitchen }) {
  const videos = data?.videos || []

  return (
    <>
      <div className="px-5 sm:px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/30">
        <h2 className="font-poppins font-bold text-dark text-lg">Check Hygiene</h2>
        <p className="font-nunito text-xs text-gray mt-0.5">
          Latest daily video from {kitchen.name} covering washing area, refrigerator, and cooking area
          {data?.compliant ? " · Updated within 24 hours" : ""}
        </p>
      </div>
      <div className="px-5 sm:px-6 py-6">
        {videos.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck size={36} className="text-gray-light mx-auto mb-3 opacity-50" />
            <p className="font-nunito text-gray text-sm">No hygiene videos available yet.</p>
          </div>
        ) : (
          <div className="max-w-xl">
            {videos.map((v) => (
              <div key={v.id} className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
                <video src={resolveMediaUrl(v.mediaUrl)} className="w-full aspect-video object-cover bg-black" controls playsInline />
                <div className="p-4">
                  <p className="font-poppins font-semibold text-sm text-dark">{v.label}</p>
                  <p className="font-nunito text-xs text-gray mt-1">
                    {v.recordedAt ? new Date(v.recordedAt).toLocaleString("en-IN") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}


