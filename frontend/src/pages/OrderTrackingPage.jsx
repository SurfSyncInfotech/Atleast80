import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle, ChefHat, Bike, Home, Phone } from "lucide-react"
import Button from "../components/ui/Button"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"

const STEPS = [
  { id: "confirmed", label: "Order Confirmed", desc: "Your order has been accepted", icon: CheckCircle },
  { id: "preparing", label: "Being Prepared", desc: "Kitchen is cooking your food", icon: ChefHat },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "Rider is on the way", icon: Bike },
  { id: "delivered", label: "Delivered", desc: "Enjoy your meal!", icon: Home },
]

const STATUS_ORDER = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]

function stepState(orderStatus, stepId) {
  const current = STATUS_ORDER.indexOf(orderStatus)
  const step = STATUS_ORDER.indexOf(stepId)
  if (current < 0 || step < 0) return { done: false, active: false }
  if (current > step) return { done: true, active: false }
  if (current === step) return { done: true, active: true }
  return { done: false, active: false }
}

export default function OrderTrackingPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) {
      navigate("/orders", { replace: true })
      return
    }
    let cancelled = false
    api(`/api/orders/${id}`)
      .then((data) => {
        if (!cancelled) setOrder(data.order)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Order not found")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <p className="font-nunito text-gray">{error || "Order not found"}</p>
        <Button className="mt-4" onClick={() => navigate("/orders")}>Back to orders</Button>
      </div>
    )
  }

  const progress =
    order.status === "delivered"
      ? 100
      : order.status === "out_for_delivery"
      ? 75
      : order.status === "preparing"
      ? 50
      : 35

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-gray-light/50">
        <div className="px-4 md:px-10 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/orders")}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-poppins font-bold text-lg text-dark">Order #{order.orderNumber}</h1>
        </div>
      </div>

      <div className="px-4 md:px-10 max-w-2xl mx-auto mt-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm text-center"
        >
          <p className="font-nunito text-gray text-sm">Estimated Arrival</p>
          <p className="font-poppins font-bold text-3xl text-dark mt-1">25-30 min</p>
          <div className="w-full bg-gray-light rounded-full h-2 mt-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-poppins font-semibold text-sm text-dark mb-4">Order Status</h3>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const { done, active } = stepState(order.status, step.id)
              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done ? "bg-primary text-white" : active ? "bg-primary/20 text-primary border-2 border-primary" : "bg-gray-light text-gray"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-12 ${done ? "bg-primary" : "bg-gray-light"}`} />
                    )}
                  </div>
                  <div className="pt-2 pb-4">
                    <p className={`font-poppins font-semibold text-sm ${done || active ? "text-dark" : "text-gray"}`}>
                      {step.label}
                    </p>
                    <p className="font-nunito text-xs text-gray mt-0.5">{step.desc}</p>
                    {active && (
                      <span className="inline-block mt-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-poppins font-semibold text-sm text-dark mb-3">Items</h3>
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <img
                src={resolveMediaUrl(item.image)}
                alt={item.name}
                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
              />
              <div className="flex-1 min-w-0">
                <p className="font-nunito text-sm text-dark truncate">{item.name}</p>
                <p className="text-xs text-gray">x{item.qty}</p>
              </div>
              <span className="font-poppins font-semibold text-sm">₹{item.price * item.qty}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-3 flex justify-between font-poppins font-bold">
            <span>Total</span>
            <span>₹{order.grandTotal}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ChefHat size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-poppins font-semibold text-sm text-dark">{order.kitchenName}</p>
            <p className="font-nunito text-xs text-gray">Preparing your order</p>
          </div>
          {order.kitchenPhone && (
            <a
              href={`tel:${order.kitchenPhone}`}
              className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"
            >
              <Phone size={18} className="text-primary" />
            </a>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate("/home")}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}
