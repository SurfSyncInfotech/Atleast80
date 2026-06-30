import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Minus, Plus, Trash2, Package, Truck, MapPin, ShoppingCart } from "lucide-react"
import { motion } from "framer-motion"
import Button from "../components/ui/Button"
import { useCart } from "../context/CartContext"
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
  const { cart, addItem, removeItem, deleteItem, itemCount, total: itemTotal, requireCustomer } = useCart()
  const [packing, setPacking] = useState("standard")
  const [delivery, setDelivery] = useState("free")

  const packingCost = packingOptions.find((p) => p.id === packing)?.price || 0
  const deliveryCost = deliveryOptions.find((d) => d.id === delivery)?.price || 0
  const grandTotal = itemTotal + packingCost + deliveryCost

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
          <h1 className="font-poppins font-bold text-lg text-dark">Your Cart</h1>
          <span className="ml-auto bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
            {itemCount} items
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 mt-6">
        <div className="md:grid md:grid-cols-[1fr_380px] md:gap-8">
          {/* Left column */}
          <div className="space-y-4">
            {/* Cart items */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-poppins font-semibold text-base text-dark mb-4">
                Cart Items
              </h3>
              {cart.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 py-4 ${
                    i < cart.length - 1 ? "border-b border-gray-light/50" : ""
                  }`}
                >
                  <img
                    src={resolveMediaUrl(item.image)}
                    alt={item.name}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-poppins font-medium text-sm md:text-base text-dark truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray mt-0.5">{item.kitchen || item.weight || ""}</p>
                    <span className="font-poppins font-bold text-base text-dark">
                      ₹{item.price * item.qty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 bg-primary/10 rounded-xl px-3 py-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-poppins font-bold text-primary text-base w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => addItem(item)}
                        className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-gray hover:text-error cursor-pointer p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Packing + Delivery */}
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">Packing Type</h3>
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
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">Delivery Method</h3>
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

          {/* Right: Bill */}
          <div className="mt-4 md:mt-0">
            <div className="md:sticky md:top-20">
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="font-poppins font-semibold text-base text-dark mb-4">Bill Summary</h3>
                <div className="space-y-3 text-sm font-nunito">
                  <div className="flex justify-between text-dark-light">
                    <span>Item Total ({itemCount} items)</span>
                    <span className="font-medium">₹{itemTotal}</span>
                  </div>
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
                  <div className="border-t border-gray-light pt-3 flex justify-between">
                    <span className="font-poppins font-bold text-dark text-base">Grand Total</span>
                    <span className="font-poppins font-bold text-dark text-xl">₹{grandTotal}</span>
                  </div>
                </div>
                <div className="hidden md:block mt-6">
                  <Button
                    onClick={() => {
                      if (!requireCustomer()) return
                      navigate("/checkout", {
                        state: { packing, delivery, packingCost, deliveryCost },
                      })
                    }}
                    size="lg"
                    className="w-full"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light/50 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray font-nunito">Total</p>
            <p className="font-poppins font-bold text-xl text-dark">₹{grandTotal}</p>
          </div>
          <Button
            onClick={() => {
              if (!requireCustomer()) return
              navigate("/checkout", {
                state: { packing, delivery, packingCost, deliveryCost },
              })
            }}
            size="lg"
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
  )
}
