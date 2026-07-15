import { useState, useEffect } from "react"

import { useParams, useNavigate } from "react-router-dom"

import { motion } from "framer-motion"

import {

  ArrowLeft, Star, ShieldCheck, Clock, Share2, MapPin, Phone,

  ShoppingCart, ChevronRight, UtensilsCrossed, ShoppingBag, Tag, Sparkles,

  Plus, Minus,

} from "lucide-react"

import MenuListItem from "../components/common/MenuListItem"

import MenuItemDetailModal from "../components/common/MenuItemDetailModal"

import KitchenAvatar from "../components/common/KitchenAvatar"
import BulkOrderChatbot from "../components/common/BulkOrderChatbot"

import { useCart } from "../context/CartContext"

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
  { id: "combo", label: "Combo", icon: Sparkles },
  { id: "offers", label: "Offers", icon: Tag },
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
  }
}



function mapApiMenuItem(item, kitchenName, kitchenId) {
  return resolveMenuItemMedia({
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
    kitchen: kitchenName,
    kitchenId: kitchenId || item.kitchen_id,
    isCombo: item.isCombo || item.is_combo,
    comboItems: item.comboItems || [],
  })
}



function mapMockFood(item) {

  return {

    id: item.id,

    name: item.name,

    description: item.kitchen,

    price: item.price,

    category: "food",

    itemType: "veg",

    image: item.image,

    kitchen: item.kitchen,

  }

}



function mapMockGrocery(item) {

  return {

    id: item.id + 1000,

    name: item.name,

    description: item.weight,

    price: item.price,

    category: "grocery",

    itemType: "veg",

    image: item.image,

    kitchen: item.kitchen,

  }

}



export default function KitchenPage() {

  const { id } = useParams()

  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("food")

  const [kitchen, setKitchen] = useState(null)

  const [menu, setMenu] = useState([])

  const [loading, setLoading] = useState(true)

  const [selectedItem, setSelectedItem] = useState(null)

  const [hygieneData, setHygieneData] = useState({ videos: [], compliant: false, areas: [] })

  const { itemCount, total, requireCustomer } = useCart()



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

        const mappedMenu = menuRes.items.map((item) => mapApiMenuItem(item, k.name, k.id))
        setMenu(mappedMenu)

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
          setActiveTab("offers")
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

    return () => { cancelled = true }

  }, [id])



  const foodItems = menu.filter((i) => i.category === "food" && !(i.isCombo || i.is_combo))
  const groceryItems = menu.filter((i) => i.category === "grocery" && !(i.isCombo || i.is_combo))
  const comboItems = menu.filter((i) => i.isCombo || i.is_combo)
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



        {/* Mobile about */}

        <div className="lg:hidden mt-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

          <AboutPanel kitchen={kitchen} compact />

        </div>



        {/* Tabs */}

        <div className="sticky top-0 z-20 mt-5 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 bg-[#f5f5f4]/95 backdrop-blur-md">

          <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl">

            {tabs.filter(tab => {
              if (tab.id === "food" && kitchen?.isFreshFoodActive === 0) return false
              if (tab.id === "grocery" && kitchen?.isGroceryActive === 0) return false
              if (tab.id === "combo" && comboItems.length === 0) return false
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

                  {tab.id === "offers" && offerCount > 0 && (

                    <span

                      className={cn(

                        "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-poppins font-bold flex items-center justify-center",

                        active ? "bg-white/20 text-white" : "bg-accent/15 text-accent"

                      )}

                    >

                      {offerCount}

                    </span>

                  )}

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

            {activeTab === "offers" && (

              <OffersTab

                kitchen={kitchen}

                items={offerItems}

                onOpenItem={setSelectedItem}

              />

            )}

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

      <BulkOrderChatbot
        kitchenId={kitchen.id}
        kitchenName={kitchen.name}
        cartVisible={itemCount > 0}
      />

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

        {kitchen.phone && <InfoRow icon={Phone} text={kitchen.phone} />}

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



const OFFER_IMG_PLACEHOLDER =

  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"



function OffersTab({ kitchen, items, onOpenItem }) {

  const hasKitchenOffer = Boolean(kitchen?.offer)

  const hasItemOffers = items.length > 0

  const totalCount = (hasKitchenOffer ? 1 : 0) + items.length



  return (

    <>

      <div className="px-5 sm:px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/30">

        <h2 className="font-poppins font-bold text-dark text-lg">Offers &amp; Deals</h2>

        <p className="font-nunito text-xs text-gray mt-0.5">

          {totalCount > 0

            ? `${totalCount} active offer${totalCount !== 1 ? "s" : ""} from this kitchen`

            : "Check back soon for new deals"}

        </p>

      </div>



      <div className="px-5 sm:px-6 py-6">

        {!hasKitchenOffer && !hasItemOffers ? (

          <div className="py-14 text-center max-w-sm mx-auto">

            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">

              <Tag size={28} className="text-primary" />

            </div>

            <p className="font-poppins font-semibold text-dark">No offers right now</p>

            <p className="font-nunito text-gray text-sm mt-2">

              This kitchen hasn&apos;t posted any deals yet. Browse the food and grocery menus in the meantime.

            </p>

          </div>

        ) : (

          <div className="space-y-8">

            {hasKitchenOffer && (

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-[#0a4025] p-6 sm:p-7 text-white shadow-lg">

                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />

                <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full bg-secondary/10" />

                <div className="relative">

                  <div className="flex items-center gap-2 text-secondary">

                    <Sparkles size={16} />

                    <span className="text-[10px] font-poppins font-bold uppercase tracking-[0.2em]">

                      Kitchen-wide offer

                    </span>

                  </div>

                  <p className="font-poppins font-bold text-2xl sm:text-[1.65rem] leading-tight mt-3">

                    {kitchen.offer}

                  </p>

                  <p className="font-nunito text-white/65 text-sm mt-2 max-w-md">

                    Applies to your order from {kitchen.name}. Add items from the menu and checkout to redeem.

                  </p>

                </div>

              </div>

            )}



            {hasItemOffers && (

              <div>

                <div className="flex items-center gap-2 mb-4">

                  <Tag size={16} className="text-accent" />

                  <h3 className="font-poppins font-semibold text-dark">

                    Item deals

                  </h3>

                  <span className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray bg-gray-100 px-2 py-0.5 rounded-full">

                    {items.length} item{items.length !== 1 ? "s" : ""}

                  </span>

                </div>



                <div className="grid gap-4 sm:grid-cols-2">

                  {items.map((item) => (

                    <OfferItemCard key={item.id} item={item} onOpen={onOpenItem} />

                  ))}

                </div>

              </div>

            )}

          </div>

        )}

      </div>

    </>

  )

}



function OfferItemCard({ item, onOpen }) {

  const { addItem, removeItem, getItemQty } = useCart()

  const qty = getItemQty(item.id)

  const isVeg = item.itemType === "veg" || item.item_type === "veg"

  const cover = resolveMediaUrl(item.image) || OFFER_IMG_PLACEHOLDER



  const openDetail = () => onOpen?.(item)



  return (

    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-primary/15 transition-all duration-200">

      <div className="relative h-36 sm:h-40 overflow-hidden">

        <button

          type="button"

          onClick={openDetail}

          className="w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-inset"

          aria-label={`View ${item.name} offer`}

        >

          <img

            src={cover}

            alt={item.name}

            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"

          />

        </button>

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-poppins font-bold text-white shadow-md">

          <Tag size={11} />

          {item.offer}

        </span>

        <span

          className={cn(

            "absolute top-3 right-3 w-[15px] h-[15px] rounded-[3px] border-[1.5px] bg-white/90 flex items-center justify-center",

            isVeg ? "border-emerald-600" : "border-red-600"

          )}

        >

          <span className={cn("w-[7px] h-[7px] rounded-full", isVeg ? "bg-emerald-600" : "bg-red-600")} />

        </span>

      </div>



      <div className="flex flex-1 flex-col p-4">

        <button

          type="button"

          onClick={openDetail}

          className="text-left cursor-pointer focus:outline-none"

        >

          <h4 className="font-poppins font-semibold text-dark text-[15px] leading-snug group-hover:text-primary transition-colors line-clamp-2">

            {item.name}

          </h4>

          {item.description && (

            <p className="font-nunito text-gray text-xs mt-1 line-clamp-2 leading-relaxed">

              {item.description}

            </p>

          )}

        </button>



        <div className="mt-auto pt-3 flex items-center justify-between gap-3">

          <p className="font-poppins font-bold text-dark text-lg">

            ₹{Number(item.price)}

          </p>



          <div onClick={(e) => e.stopPropagation()}>

            {qty > 0 ? (

              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-2 py-1">

                <button onClick={() => removeItem(item.id)} className="text-primary cursor-pointer p-0.5" aria-label="Decrease">

                  <Minus size={15} />

                </button>

                <span className="font-poppins font-bold text-primary text-sm min-w-[14px] text-center">{qty}</span>

                <button onClick={() => addItem(item)} className="text-primary cursor-pointer p-0.5" aria-label="Increase">

                  <Plus size={15} />

                </button>

              </div>

            ) : (

              <button

                onClick={() => addItem(item)}

                className="bg-primary text-white font-poppins font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-primary-dark transition-colors cursor-pointer"

              >

                ADD

              </button>

            )}

          </div>

        </div>

      </div>

    </article>

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


