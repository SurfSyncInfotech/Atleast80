import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Minus, Plus, Trash2, Package, Truck, MapPin, ShoppingCart, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import Button from "../components/ui/Button"
import { useCart } from "../context/CartContext"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"

const packingOptions = [
  { id: "standard", label: "Standard", desc: "Basic packaging", price: 0 },
  { id: "eco", label: "Eco-Friendly", desc: "Biodegradable containers", price: 15 },
  { id: "premium", label: "Premium", desc: "Insulated + sealed", price: 30 },
]

const deliveryOptions = [
  { id: "free", label: "Seller Free Delivery", desc: "30-45 min", price: 0, icon: Truck },
  { id: "self", label: "Self Pickup", desc: "Ready in 20 min", price: 0, icon: MapPin },
  { id: "express", label: "Express Delivery", desc: "15-20 min", price: 40, icon: Package },
]

export default function CartPage() {
  const navigate = useNavigate()
  const { cart, addItem, removeItem, deleteItem, syncAvailability, itemCount, total: itemTotal, requireCustomer } = useCart()
  const [packing, setPacking] = useState("standard")
  const [delivery, setDelivery] = useState("free")

  const packingCost = packingOptions.find((p) => p.id === packing)?.price || 0
  const deliveryCost = deliveryOptions.find((d) => d.id === delivery)?.price || 0

  // Group cart items by kitchen
  const kitchenGroups = useMemo(() => {
    const map = {}
    for (const item of cart) {
      const kId = String(item.kitchenId || item.kitchen_id || "default")
      if (!map[kId]) {
        map[kId] = {
          kitchenId: item.kitchenId || item.kitchen_id,
          kitchenName: item.kitchen || item.kitchenName || "Kitchen Store",
          items: [],
        }
      }
      map[kId].items.push(item)
    }
    return Object.values(map)
  }, [cart])

  const isMultiKitchen = kitchenGroups.length > 1

  const cartItemIdsKey = cart.map((i) => i.id).join(",")

  useEffect(() => {
    const itemIds = cart.map((i) => i.id).filter(Boolean)
    if (itemIds.length === 0) return

    const syncMenu = () => {
      api("/api/menu/check-availability", {
        method: "POST",
        body: JSON.stringify({ itemIds }),
      })
        .then((res) => {
          if (res) {
            syncAvailability(res)
          }
        })
        .catch(() => {})
    }

    syncMenu()
    const interval = setInterval(syncMenu, 3000)
    return () => clearInterval(interval)
  }, [cartItemIdsKey, syncAvailability])

  const hasUnavailableItems = cart.some(
    (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false || item.isOfferClosed
  )

  const calcGroupTotals = (groupItems) => {
    const subtotal = groupItems.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)
    
    // Calculate festival discount on eligible items
    const festivalDiscount = Number(
      groupItems.reduce((sum, item) => {
        if (item.isOfferActive === false || item.isOfferClosed) return sum
        if (item.discountPercent && Number(item.discountPercent) > 0) {
          const itemBase = Number(item.originalPrice || item.price) * Number(item.qty)
          return sum + (itemBase * Number(item.discountPercent)) / 100
        }
        if (item.offerPrice && Number(item.offerPrice) < Number(item.price)) {
          return sum + (Number(item.price) - Number(item.offerPrice)) * Number(item.qty)
        }
        return sum
      }, 0).toFixed(2)
    )

    const discountedSubtotal = Math.max(0, subtotal - festivalDiscount)

    const gst = Number(
      groupItems.reduce((sum, item) => {
        const isGrocery = item.category === "grocery"
        const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
        const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
        const effectivePrice = (!item.isOfferClosed && item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
        return sum + (effectivePrice * Number(item.qty) * (rate / 100))
      }, 0).toFixed(2)
    )
    const grand = Number((discountedSubtotal + gst + packingCost + deliveryCost).toFixed(2))
    return { subtotal, festivalDiscount, discountedSubtotal, gst, grand }
  }

  // Global total
  const globalFestivalDiscount = Number(
    cart.reduce((sum, item) => {
      if (item.isOfferActive === false || item.isOfferClosed) return sum
      if (item.discountPercent && Number(item.discountPercent) > 0) {
        const itemBase = Number(item.originalPrice || item.price) * Number(item.qty)
        return sum + (itemBase * Number(item.discountPercent)) / 100
      }
      if (item.offerPrice && Number(item.offerPrice) < Number(item.price)) {
        return sum + (Number(item.price) - Number(item.offerPrice)) * Number(item.qty)
      }
      return sum
    }, 0).toFixed(2)
  )

  const globalGst = Number(
    cart.reduce((sum, item) => {
      const isGrocery = item.category === "grocery"
      const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
      const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
      const effectivePrice = (!item.isOfferClosed && item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
      return sum + (effectivePrice * Number(item.qty) * (rate / 100))
    }, 0).toFixed(2)
  )
  const globalGrandTotal = Number((Math.max(0, itemTotal - globalFestivalDiscount) + globalGst + packingCost + deliveryCost).toFixed(2))

  const handleCheckoutKitchen = (group) => {
    const groupHasOfferClosed = group.items.some((item) => item.isOfferClosed)
    if (groupHasOfferClosed) {
      alert("The seller has closed the festival offer for some items. Please remove them before checkout.")
      return
    }
    const groupHasUnavailable = group.items.some(
      (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false
    )
    if (groupHasUnavailable) {
      alert("Some items from this kitchen are currently unavailable. Please remove them before checkout.")
      return
    }
    if (!requireCustomer()) return

    const { subtotal, festivalDiscount, gst, grand } = calcGroupTotals(group.items)
    navigate("/checkout", {
      state: {
        kitchenId: group.kitchenId,
        kitchenName: group.kitchenName,
        packing,
        delivery,
        packingCost,
        deliveryCost,
        gstAmount: gst,
        itemTotal: subtotal,
        festivalDiscount,
        grandTotal: grand,
      },
    })
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-gray-light/50 rounded-3xl flex items-center justify-center mb-6">
          <ShoppingCart size={36} className="text-gray" />
        </div>
        <h2 className="font-poppins font-bold text-xl text-dark">Your cart is empty</h2>
        <p className="font-nunito text-gray text-sm mt-2 text-center max-w-sm">
          Explore kitchens and add your favorite homemade food & groceries
        </p>
        <Button className="mt-6" onClick={() => navigate("/home")}>
          Browse Kitchens
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-gray-light/50">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-light/50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-poppins font-bold text-lg text-dark">Your Cart</h1>
            {isMultiKitchen && (
              <p className="font-nunito text-xs text-primary font-semibold">
                {kitchenGroups.length} Kitchens in cart
              </p>
            )}
          </div>
          <span className="ml-auto bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
            {itemCount} items
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 mt-6">
        {hasUnavailableItems && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="font-nunito text-xs sm:text-sm font-medium">
              Some items in your cart are currently unavailable. Please remove them to proceed with checkout.
            </p>
          </div>
        )}

        {isMultiKitchen && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 text-amber-900">
            <Package size={20} className="flex-shrink-0 text-amber-700" />
            <p className="font-nunito text-xs sm:text-sm font-medium">
              You have items from <strong>{kitchenGroups.length} different kitchens</strong>. In Atleast80, you can order from each kitchen one by one to ensure separate fresh delivery.
            </p>
          </div>
        )}

        <div className="md:grid md:grid-cols-[1fr_380px] md:gap-8">
          {/* Left column: Kitchen Groups */}
          <div className="space-y-6">
            {kitchenGroups.map((group, groupIdx) => {
              const { subtotal, gst, grand } = calcGroupTotals(group.items)
              const groupHasUnavailable = group.items.some(
                (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false
              )

              return (
                <div key={group.kitchenId || groupIdx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  {/* Kitchen Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-poppins font-bold text-sm">
                        {groupIdx + 1}
                      </div>
                      <div>
                        <h3 className="font-poppins font-bold text-base text-dark">
                          {group.kitchenName}
                        </h3>
                        <p className="font-nunito text-xs text-gray">
                          {group.items.length} {group.items.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    {isMultiKitchen && (
                      <span className="text-xs font-poppins font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        Kitchen #{groupIdx + 1}
                      </span>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-gray-light/40">
                    {group.items.map((item) => {
                      const isUnavailable = item.is_available === 0 || item.is_available === false || item.isAvailable === false
                      const isOfferClosed = Boolean(item.isOfferClosed)
                      const isBlocked = isUnavailable || isOfferClosed
                      const isGrocery = item.category === "grocery"
                      const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
                      const itemRate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 py-3.5 ${
                            isBlocked ? "opacity-85 bg-red-50/50 -mx-3 px-3 rounded-xl border border-red-200/60 my-1" : ""
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={resolveMediaUrl(item.image)}
                              alt={item.name}
                              className={`w-16 h-16 rounded-xl object-cover ${isBlocked ? "grayscale" : ""}`}
                            />
                            {isBlocked && (
                              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center p-1">
                                <span className="text-[9px] font-poppins font-bold text-white uppercase text-center leading-tight">
                                  {isOfferClosed ? "Offer Ended" : "Unavailable"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-poppins font-medium text-sm md:text-base text-dark truncate">
                                {item.name}
                              </h4>
                              {isOfferClosed && (
                                <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  Offer Closed by Seller
                                </span>
                              )}
                              {!isOfferClosed && isUnavailable && (
                                <span className="text-[10px] font-poppins font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  Currently Unavailable
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray">{item.weight || (isGrocery ? "Grocery" : "Food")}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-medium">
                                GST: {itemRate}%
                              </span>
                            </div>
                            <span className="font-poppins font-bold text-base text-dark block mt-1">
                              ₹{item.price * item.qty}
                            </span>
                            {isOfferClosed && (
                              <p className="text-[11px] text-red-600 font-semibold mt-1">
                                ⚠️ This item cannot be ordered because the festival offer was closed.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-2.5 py-1.5">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform"
                              >
                                <Minus size={15} />
                              </button>
                              <span className="font-poppins font-bold text-primary text-sm w-4 text-center">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => addItem(item)}
                                disabled={isBlocked}
                                className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform disabled:opacity-40"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Per-kitchen subtotal & individual checkout if multiple kitchens */}
                  {isMultiKitchen && (
                    <div className="mt-4 pt-3 border-t border-gray-100 bg-cream/30 -mx-5 -mb-5 p-4 rounded-b-2xl">
                      <div className="flex items-center justify-between text-xs font-nunito text-dark-light mb-1.5">
                        <span>Items Total: ₹{subtotal}</span>
                        <span>Taxes & GST: ₹{gst}</span>
                      </div>
                      {festivalDiscount > 0 && (
                        <div className="flex items-center justify-between text-xs font-nunito text-emerald-600 font-bold mb-1.5">
                          <span>🎉 Festival Offer Discount</span>
                          <span>- ₹{festivalDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 mb-3">
                        <span className="font-poppins font-bold text-sm text-dark">Kitchen Total:</span>
                        <span className="font-poppins font-bold text-base text-primary">₹{grand}</span>
                      </div>
                      <Button
                        onClick={() => handleCheckoutKitchen(group)}
                        disabled={groupHasUnavailable}
                        size="md"
                        className="w-full font-poppins text-xs font-bold uppercase tracking-wide"
                      >
                        {groupHasUnavailable ? "Unavailable Items" : `Order from ${group.kitchenName} (₹${grand})`}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Packaging & Delivery options (Global options for checkout) */}
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">Packing Preference</h3>
                <div className="space-y-2">
                  {packingOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPacking(opt.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                        packing === opt.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-cream border-2 border-transparent hover:border-gray-light"
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-poppins font-medium text-sm text-dark">{opt.label}</p>
                        <p className="text-xs text-gray mt-0.5">{opt.desc}</p>
                      </div>
                      <span className="font-poppins font-semibold text-sm text-dark">
                        {opt.price === 0 ? "Free" : `+₹${opt.price}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">Delivery Preference</h3>
                <div className="space-y-2">
                  {deliveryOptions.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDelivery(opt.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                          delivery === opt.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-cream border-2 border-transparent hover:border-gray-light"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          delivery === opt.id ? "bg-primary text-white" : "bg-gray-light text-gray"
                        }`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-poppins font-medium text-sm text-dark">{opt.label}</p>
                          <p className="text-xs text-gray mt-0.5">{opt.desc}</p>
                        </div>
                        <span className="font-poppins font-semibold text-sm text-dark">
                          {opt.price === 0 ? "Free" : `+₹${opt.price}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Overall Bill Summary */}
          <div className="mt-4 md:mt-0">
            <div className="md:sticky md:top-20">
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">
                  {isMultiKitchen ? "Cart Summary (All Kitchens)" : "Bill Summary"}
                </h3>
                <div className="space-y-3 text-sm font-nunito">
                  <div className="flex justify-between text-dark-light">
                    <span>Item Total ({itemCount} items)</span>
                    <span className="font-medium">₹{itemTotal}</span>
                  </div>
                  {globalFestivalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span className="flex items-center gap-1">
                        <span>🎉</span> Festival Discount
                      </span>
                      <span>- ₹{globalFestivalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-dark-light">
                    <span>Packing</span>
                    <span className={packingCost === 0 ? "text-primary font-semibold" : "font-medium"}>
                      {packingCost === 0 ? "Free" : `₹${packingCost}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-dark-light">
                    <span>Delivery</span>
                    <span className={deliveryCost === 0 ? "text-primary font-semibold" : "font-medium"}>
                      {deliveryCost === 0 ? "Free" : `₹${deliveryCost}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-dark-light">
                    <span>Taxes & GST</span>
                    <span className="font-medium">₹{globalGst}</span>
                  </div>
                  <div className="border-t border-gray-light pt-3 flex justify-between">
                    <span className="font-poppins font-bold text-dark text-base">Total Value</span>
                    <span className="font-poppins font-bold text-dark text-xl">₹{globalGrandTotal}</span>
                  </div>
                </div>

                {/* Single kitchen direct checkout */}
                {!isMultiKitchen && (
                  <div className="hidden md:block mt-6">
                    <Button
                      onClick={() => handleCheckoutKitchen(kitchenGroups[0])}
                      disabled={hasUnavailableItems}
                      size="lg"
                      className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hasUnavailableItems ? "Unavailable Items in Cart" : "Proceed to Checkout"}
                    </Button>
                  </div>
                )}

                {isMultiKitchen && (
                  <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-nunito text-primary">
                    Click <strong>"Order from [Kitchen]"</strong> above to checkout that specific kitchen's order.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom CTA if single kitchen */}
      {!isMultiKitchen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light/50 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray font-nunito">Total</p>
              <p className="font-poppins font-bold text-xl text-dark">₹{globalGrandTotal}</p>
            </div>
            <Button
              onClick={() => handleCheckoutKitchen(kitchenGroups[0])}
              disabled={hasUnavailableItems}
              size="lg"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasUnavailableItems ? "Unavailable" : "Checkout"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
