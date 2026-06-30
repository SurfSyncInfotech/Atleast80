import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle, ChefHat, Bike, Home, Star, Clock } from "lucide-react"
import Button from "../components/ui/Button"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"
import { cn } from "../lib/utils"

const STEPS = [
  { id: "pending", label: "Order Placed", desc: "Waiting for kitchen to accept", icon: Clock },
  { id: "confirmed", label: "Order Confirmed", desc: "Your order has been accepted", icon: CheckCircle },
  { id: "preparing", label: "Being Prepared", desc: "Kitchen is cooking your food", icon: ChefHat },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "Rider is on the way", icon: Bike },
  { id: "delivered", label: "Delivered", desc: "Enjoy your meal!", icon: Home },
]

const STATUS_ORDER = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]

function stepState(orderStatus, stepId) {
  if (orderStatus === "cancelled") return { done: false, active: false }
  const current = STATUS_ORDER.indexOf(orderStatus)
  const step = STATUS_ORDER.indexOf(stepId)
  if (current < 0 || step < 0) return { done: false, active: false }
  if (current > step) return { done: true, active: false }
  if (current === step) return { done: true, active: true }
  return { done: false, active: false }
}

function StarRating({ value, onChange, readonly }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            "cursor-pointer transition-transform",
            !readonly && "hover:scale-110",
            readonly && "cursor-default"
          )}
        >
          <Star
            size={28}
            className={star <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewSection({ order, onReviewSubmitted }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (order.review) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-poppins font-semibold text-sm text-dark mb-3">Your Review</h3>
        <StarRating value={order.review.rating} readonly />
        {order.review.review && (
          <p className="font-nunito text-sm text-gray mt-3">{order.review.review}</p>
        )}
        <p className="font-nunito text-xs text-gray mt-2">
          Submitted on {new Date(order.review.createdAt).toLocaleDateString("en-IN")}
        </p>
      </div>
    )
  }

  if (order.status !== "delivered") return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating < 1) {
      setError("Please select a rating")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const data = await api(`/api/orders/${order.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, review: review.trim() || null }),
      })
      onReviewSubmitted(data.review)
    } catch (err) {
      setError(err.message || "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
      <h3 className="font-poppins font-semibold text-sm text-dark mb-1">Rate your experience</h3>
      <p className="font-nunito text-xs text-gray mb-4">How was your order from {order.kitchenName}?</p>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <StarRating value={rating} onChange={setRating} />
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-light font-nunito text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
        />
        <Button type="submit" className="w-full" disabled={submitting || rating < 1}>
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
      </form>
    </div>
  )
}

export default function OrderTrackingPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadOrder = async () => {
    try {
      const data = await api(`/api/orders/${id}`)
      setOrder(data.order)
      setError("")
    } catch (err) {
      setError(err.message || "Order not found")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) {
      navigate("/orders", { replace: true })
      return
    }
    loadOrder()
    const interval = setInterval(loadOrder, 10000)
    return () => clearInterval(interval)
  }, [id, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isCancelled = order.status === "cancelled"
  const isActive = !isCancelled && order.status !== "delivered"

  const progress = isCancelled
    ? 0
    : order.status === "delivered"
    ? 100
    : order.status === "out_for_delivery"
    ? 80
    : order.status === "preparing"
    ? 60
    : order.status === "confirmed"
    ? 40
    : 20

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-gray-light/50">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/orders")}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-poppins font-bold text-lg text-dark">Order #{order.orderNumber}</h1>
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto mt-6 space-y-5">
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="font-poppins font-semibold text-red-700">Order Cancelled</p>
            <p className="font-nunito text-sm text-red-600 mt-1">This order was cancelled by the kitchen.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm text-center"
          >
            <p className="font-nunito text-gray text-sm">
              {isActive ? "Estimated Arrival" : "Order Complete"}
            </p>
            <p className="font-poppins font-bold text-3xl text-dark mt-1">
              {isActive ? "25-30 min" : "Delivered!"}
            </p>
            <div className="w-full bg-gray-light rounded-full h-2 mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {!isCancelled && (
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
        )}

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
            <p className="font-nunito text-xs text-gray">
              {isActive ? "Preparing your order" : "Thank you for ordering!"}
            </p>
          </div>
        </div>

        <ReviewSection
          order={order}
          onReviewSubmitted={(review) => setOrder((o) => ({ ...o, review }))}
        />

        <Button variant="outline" className="w-full" onClick={() => navigate("/home")}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}
