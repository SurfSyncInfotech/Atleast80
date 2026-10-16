import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Button from "../components/ui/Button"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"
import { getLocationPreference } from "../lib/locationPreference"

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { cart, clearCart, clearKitchenCart, syncAvailability } = useCart()
  const [payment, setPayment] = useState("")
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [kitchenCity, setKitchenCity] = useState("")
  const [kitchenName, setKitchenName] = useState(location.state?.kitchenName || "")

  const targetKitchenId = location.state?.kitchenId || cart[0]?.kitchenId
  const checkoutItems = cart.filter(
    (item) => String(item.kitchenId || item.kitchen_id) === String(targetKitchenId)
  )
  const itemsToOrder = checkoutItems.length > 0 ? checkoutItems : cart

  const checkoutItemCount = itemsToOrder.reduce((sum, item) => sum + item.qty, 0)
  const checkoutItemTotal = itemsToOrder.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)

  const packingType = location.state?.packing || "standard"
  const deliveryMethod = location.state?.delivery || "free"
  const packingFee = location.state?.packingCost || 0
  const deliveryFee = location.state?.deliveryCost || 0

  const festivalDiscount = Number(
    itemsToOrder.reduce((sum, item) => {
      if (item.isOfferActive === false) return sum
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

  const gstAmount = Number(
    itemsToOrder.reduce((sum, item) => {
      const isGrocery = item.category === "grocery"
      const isLoose = (item.packaging_type || item.packagingType) === "loose" || Number(item.gst_rate) === 0 || Number(item.gstRate) === 0
      const rate = isGrocery ? (isLoose ? 0 : 5) : (item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 5)
      const effectivePrice = (item.isOfferActive !== false && item.offerPrice && Number(item.offerPrice) < Number(item.price)) ? Number(item.offerPrice) : Number(item.price)
      return sum + (effectivePrice * Number(item.qty) * (rate / 100))
    }, 0).toFixed(2)
  )
  const discountedItemTotal = Math.max(0, checkoutItemTotal - festivalDiscount)
  const grandTotal = Number((discountedItemTotal + gstAmount + packingFee + deliveryFee).toFixed(2))

  const kitchenId = targetKitchenId
  const profileAddr = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ")
  
  const headerPref = getLocationPreference()
  const headerAddr = [headerPref?.address || headerPref?.suburb, headerPref?.city, headerPref?.state, headerPref?.pincode].filter(Boolean).join(", ")
  
  const deliveryAddress = profileAddr || headerAddr

  useEffect(() => {
    if (kitchenId) {
      api(`/api/kitchens/${kitchenId}`)
        .then((res) => {
          if (res?.kitchen) {
            setKitchenCity(res.kitchen.city || "")
            if (!kitchenName) {
              setKitchenName(res.kitchen.name || "")
            }
          }
        })
        .catch(() => {})
    }
  }, [kitchenId, kitchenName])

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
    (item) => item.is_available === 0 || item.is_available === false || item.isAvailable === false
  )

  const hasClosedOfferItems = itemsToOrder.some((item) => item.isOfferClosed)

  const customerCity = (user?.city || headerPref?.city || "").trim().toLowerCase()
  const targetKitchenCity = (kitchenCity || "").trim().toLowerCase()
  const isDeliveryUnavailable = deliveryMethod !== "self" && Boolean(customerCity) && Boolean(targetKitchenCity) && customerCity !== targetKitchenCity

  const handlePlaceOrder = async () => {
    if (hasClosedOfferItems) {
      setError("The festival offer from this kitchen has ended or was closed by the seller. Please review your cart before proceeding.")
      return
    }
    if (hasUnavailableItems) {
      setError("Some items in your cart are currently unavailable. Please go back to your cart and remove them before ordering.")
      return
    }
    if (!payment) {
      setError("Please select a payment method (UPI / Online or Cash on Delivery) to proceed.")
      return
    }
    if (!kitchenId) {
      setError("Missing kitchen information. Please add items from a kitchen page.")
      return
    }

    setLoading(true)
    setError("")

    try {
      if (payment === "upi" || payment === "online" || (payment === "cod" && deliveryMethod !== "self")) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          setError("Razorpay payment gateway failed to load. Check your connection.")
          setLoading(false)
          return
        }

        const payAmount = payment === "cod" ? (deliveryFee || 30) : grandTotal

        const hasOffer = itemsToOrder.some(
          (i) => i.isOfferActive !== false && ((i.discountPercent && Number(i.discountPercent) > 0) || (i.offerPrice && Number(i.offerPrice) < Number(i.price)))
        )

        const rzpRes = await api("/api/payments/razorpay/create-order", {
          method: "POST",
          body: JSON.stringify({
            amount: payAmount,
            kitchenId,
            festivalDiscount,
            hasOffer,
          }),
        }, "customer")

        if (!rzpRes || !rzpRes.rzpOrderId) {
          throw new Error("Failed to initiate payment session")
        }

        const options = {
          key: rzpRes.keyId,
          amount: rzpRes.amount,
          currency: rzpRes.currency,
          name: "Atleast80",
          description: payment === "cod" ? "COD Advance Delivery Fee" : `Order Payment for ${cart[0]?.kitchen || "Home Kitchen"}`,
          image: "https://atleast80.com/logo.png",
          order_id: rzpRes.rzpOrderId,
          modal: {
            ondismiss: () => {
              setLoading(false)
            },
          },
          handler: async (response) => {
            try {
              const verifyRes = await api("/api/payments/razorpay/verify", {
                method: "POST",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }, "customer")

              if (!verifyRes || !verifyRes.success) {
                throw new Error("Payment signature verification failed")
              }

              const data = await api("/api/orders", {
                method: "POST",
                body: JSON.stringify({
                  kitchenId,
                  items: itemsToOrder.map((item) => ({
                    id: item.id,
                    menuItemId: item.id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    image: item.image,
                    category: item.category,
                    gst_rate: item.gst_rate,
                    offerPrice: item.isOfferActive !== false ? item.offerPrice : null,
                    discountPercent: item.isOfferActive !== false ? item.discountPercent : 0,
                    isBulk: item.isBulk || (typeof item.id === "string" && item.id.startsWith("bulk_")),
                  })),
                  festivalDiscount,
                  paymentMethod: payment === "cod" ? "cod" : "online",
                  paymentRef: response.razorpay_payment_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  packingType,
                  deliveryMethod,
                  packingFee,
                  deliveryFee,
                  deliveryAddress,
                }),
              }, "customer")

              setOrderPlaced(true)
              if (itemsToOrder.length === cart.length) {
                clearCart()
              } else {
                clearKitchenCart(kitchenId)
              }
              setTimeout(() => navigate(`/orders/${data.order.id}`), 2000)
            } catch (vErr) {
              setError(vErr.message || "Payment verification failed")
              setLoading(false)
              const itemIds = cart.map((i) => i.id).filter(Boolean)
              if (itemIds.length > 0) {
                api("/api/menu/check-availability", { method: "POST", body: JSON.stringify({ itemIds }) })
                  .then((res) => { if (res) syncAvailability(res) })
                  .catch(() => {})
              }
            }
          },
          prefill: {
            name: user?.name || user?.ownerName || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          theme: {
            color: "#0B6B3A",
          },
          modal: {
            ondismiss: () => {
              setLoading(false)
            },
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.on("payment.failed", (resp) => {
          setError(resp.error?.description || "Payment failed. Please try again.")
          setLoading(false)
        })
        rzp.open()
        return
      }

      // Cash on Delivery Flow (Self Pickup / Zero Delivery Fee)
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          kitchenId,
          items: itemsToOrder.map((item) => ({
            id: item.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            image: item.image,
            category: item.category,
            gst_rate: item.gst_rate,
            offerPrice: item.isOfferActive !== false ? item.offerPrice : null,
            discountPercent: item.isOfferActive !== false ? item.discountPercent : 0,
            isBulk: item.isBulk || (typeof item.id === "string" && item.id.startsWith("bulk_")),
          })),
          festivalDiscount,
          paymentMethod: "cod",
          packingType,
          deliveryMethod,
          packingFee,
          deliveryFee,
          deliveryAddress,
        }),
      }, "customer")
      setOrderPlaced(true)
      if (itemsToOrder.length === cart.length) {
        clearCart()
      } else {
        clearKitchenCart(kitchenId)
      }
      setTimeout(() => navigate(`/orders/${data.order.id}`), 2000)
    } catch (err) {
      setError(err.message || "Failed to place order")
      setLoading(false)
      const itemIds = cart.map((i) => i.id).filter(Boolean)
      if (itemIds.length > 0) {
        api("/api/menu/check-availability", { method: "POST", body: JSON.stringify({ itemIds }) })
          .then((res) => { if (res) syncAvailability(res) })
          .catch(() => {})
      }
    }
  }

  if (cart.length === 0 && !orderPlaced) {
    navigate("/cart", { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      <AnimatePresence>
        {orderPlaced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-primary/95 flex flex-col items-center justify-center"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
              <CheckCircle size={80} className="text-white" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-poppins font-bold text-white text-2xl mt-6"
            >
              Order Placed!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="font-nunito text-white/80 mt-2"
            >
              Your food is being prepared with love
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-gray-light/50">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-poppins font-bold text-lg text-dark">Checkout</h1>
        </div>
      </div>

      <div className="px-4 md:px-6 mt-4 max-w-5xl mx-auto">
        {hasUnavailableItems && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-nunito flex items-start gap-2.5 shadow-xs">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div>
              <p className="font-poppins font-bold text-red-800">Items Unavailable</p>
              <p className="mt-0.5">
                Some items in your cart are currently unavailable. Please go back to your cart and remove them before placing your order.
              </p>
            </div>
          </div>
        )}

        {isDeliveryUnavailable && !hasUnavailableItems && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-nunito flex items-start gap-2.5 shadow-xs">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div>
              <p className="font-poppins font-bold text-red-800">Delivery Unavailable for this Kitchen</p>
              <p className="mt-0.5">
                {kitchenName || "This kitchen"} only delivers within <strong>{kitchenCity}</strong>. Please change your delivery location or select a kitchen in {user?.city || headerPref?.city || "your area"}.
              </p>
            </div>
          </div>
        )}

        {error && !isDeliveryUnavailable && !hasUnavailableItems && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
            {error}
          </div>
        )}

        <div className="md:grid md:grid-cols-[1fr_380px] md:gap-8">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-poppins font-semibold text-sm text-dark">Delivery Address</h3>
                  <p className="font-nunito text-gray text-sm mt-1">
                    {deliveryAddress || "Add your address in Profile for delivery"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="text-primary text-sm font-medium cursor-pointer hover:underline"
                >
                  {deliveryAddress ? "Change" : "Add"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-dark" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-sm text-dark">Estimated Delivery</h3>
                  <p className="font-nunito text-gray text-sm mt-0.5">30-45 minutes</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-poppins font-semibold text-sm text-dark mb-3">Payment Method</h3>
              <div className="space-y-2">
                {[
                  { id: "upi", label: "UPI / Google Pay", icon: Wallet },
                  { id: "cod", label: "Cash on Delivery", icon: CreditCard },
                ].map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPayment(opt.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        payment === opt.id ? "bg-primary/10 border-2 border-primary" : "bg-cream border-2 border-transparent"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${payment === opt.id ? "bg-primary text-white" : "bg-gray-light text-gray"}`}>
                        <Icon size={18} />
                      </div>
                      <span className="font-poppins font-medium text-sm text-dark">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-poppins font-semibold text-sm text-dark">
                  Order Items {kitchenName ? `(${kitchenName})` : ""}
                </h3>
                <span className="text-xs font-poppins font-semibold text-primary">
                  {checkoutItemCount} {checkoutItemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="space-y-2">
                {itemsToOrder.map((item) => {
                  const isItemUnavail = item.is_available === 0 || item.is_available === false || item.isAvailable === false
                  return (
                    <div key={item.id} className={`flex items-center gap-3 py-2 ${isItemUnavail ? "opacity-70" : ""}`}>
                      <img src={resolveMediaUrl(item.image)} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-nunito text-sm text-dark truncate">{item.name}</p>
                          {isItemUnavail && (
                            <span className="text-[10px] font-poppins font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray">x{item.qty}</p>
                      </div>
                      <span className="font-poppins font-semibold text-sm">₹{item.price * item.qty}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <div className="md:sticky md:top-20 bg-white rounded-2xl p-4 md:p-6 shadow-sm">
              <h3 className="font-poppins font-semibold text-base text-dark mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm font-nunito">
                <div className="flex justify-between"><span>Items ({checkoutItemCount})</span><span>₹{checkoutItemTotal}</span></div>
                {festivalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>🎉 Festival Discount</span>
                    <span>- ₹{festivalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>Packing</span><span>{packingFee === 0 ? "Free" : `₹${packingFee}`}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span></div>
                <div className="flex justify-between"><span>Taxes & GST</span><span>₹{gstAmount}</span></div>
                <div className="border-t pt-3 flex justify-between font-poppins font-bold text-base">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
              <div className="hidden md:block mt-6">
                <Button onClick={handlePlaceOrder} size="lg" className="w-full disabled:opacity-50" disabled={loading || isDeliveryUnavailable || hasUnavailableItems}>
                  {hasUnavailableItems ? "Unavailable Items in Cart" : isDeliveryUnavailable ? "Delivery Unavailable" : loading ? "Placing order..." : `Place Order - ₹${grandTotal}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
        <Button onClick={handlePlaceOrder} size="lg" className="w-full disabled:opacity-50" disabled={loading || isDeliveryUnavailable || hasUnavailableItems}>
          {hasUnavailableItems ? "Unavailable Items in Cart" : isDeliveryUnavailable ? "Delivery Unavailable" : loading ? "Placing order..." : `Place Order - ₹${grandTotal}`}
        </Button>
      </div>
    </div>
  )
}
