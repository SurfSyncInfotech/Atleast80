import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, MapPin, Clock, CreditCard, Wallet, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Button from "../components/ui/Button"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { cart, itemCount, total, clearCart } = useCart()
  const [payment, setPayment] = useState("")
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const packingType = location.state?.packing || "standard"
  const deliveryMethod = location.state?.delivery || "free"
  const packingFee = location.state?.packingCost || 0
  const deliveryFee = location.state?.deliveryCost || 0
  const grandTotal = total + packingFee + deliveryFee

  const kitchenId = cart[0]?.kitchenId
  const deliveryAddress = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ")

  const handlePlaceOrder = async () => {
    if (!payment) {
      setError("Please select a payment method (UPI / Google Pay or Cash on Delivery) to proceed.")
      return
    }
    if (!kitchenId) {
      setError("Missing kitchen information. Please add items from a kitchen page.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          kitchenId,
          items: cart.map((item) => ({
            id: item.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            image: item.image,
          })),
          paymentMethod: payment,
          packingType,
          deliveryMethod,
          packingFee,
          deliveryFee,
          deliveryAddress,
        }),
      })
      setOrderPlaced(true)
      clearCart()
      setTimeout(() => navigate(`/orders/${data.order.id}`), 2000)
    } catch (err) {
      setError(err.message || "Failed to place order")
    } finally {
      setLoading(false)
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
        {error && (
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
              <h3 className="font-poppins font-semibold text-sm text-dark mb-3">Your Items</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <img src={resolveMediaUrl(item.image)} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-nunito text-sm text-dark truncate">{item.name}</p>
                      <p className="text-xs text-gray">x{item.qty}</p>
                    </div>
                    <span className="font-poppins font-semibold text-sm">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <div className="md:sticky md:top-20 bg-white rounded-2xl p-4 md:p-6 shadow-sm">
              <h3 className="font-poppins font-semibold text-base text-dark mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm font-nunito">
                <div className="flex justify-between"><span>Items ({itemCount})</span><span>₹{total}</span></div>
                <div className="flex justify-between"><span>Packing</span><span>{packingFee === 0 ? "Free" : `₹${packingFee}`}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span></div>
                <div className="border-t pt-3 flex justify-between font-poppins font-bold text-base">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
              <div className="hidden md:block mt-6">
                <Button onClick={handlePlaceOrder} size="lg" className="w-full" disabled={loading}>
                  {loading ? "Placing order..." : `Place Order - ₹${grandTotal}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
        <Button onClick={handlePlaceOrder} size="lg" className="w-full" disabled={loading}>
          {loading ? "Placing order..." : `Place Order - ₹${grandTotal}`}
        </Button>
      </div>
    </div>
  )
}
