import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle, ChefHat, Bike, Home, Star, Clock, Check, Phone } from "lucide-react"
import Button from "../components/ui/Button"
import { api } from "../lib/api"
import { resolveMediaUrl } from "../lib/media"
import { cn } from "../lib/utils"

const STEPS = [
  { id: "pending", label: "Order Placed", desc: "Your order has been placed successfully", icon: CheckCircle },
  { id: "confirmed", label: "Order Confirmed", desc: "Your order has been accepted by the kitchen", icon: ChefHat },
  { id: "preparing", label: "Being Prepared", desc: "Kitchen is cooking your delicious food", icon: Clock },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "Rider is on the way to you", icon: Bike },
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
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
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
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-amber-100">
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
    ? 75
    : order.status === "preparing"
    ? 50
    : 35

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
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 text-center"
          >
            <p className="font-poppins font-black text-[11px] text-gray-400 uppercase tracking-widest">
              {isActive ? "Estimated Arrival" : "Order Status"}
            </p>
            <p className="font-poppins font-extrabold text-3xl text-dark mt-1">
              {isActive ? "25-30 min" : "Delivered!"}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-[#0B6B3A] rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {!isCancelled && (
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
            <h3 className="font-poppins font-bold text-dark text-base mb-6">Order Status</h3>
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const { done, active } = stepState(order.status, step.id)
                const isCompleted = done && !active

                return (
                  <div key={step.id} className="flex items-center gap-3 relative">
                    {/* Connecting line between circles */}
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "absolute left-[17px] top-[36px] w-[2px] z-0",
                          "h-[calc(100%+12px)]",
                          isCompleted ? "bg-[#0B6B3A]" : "bg-gray-200"
                        )}
                      />
                    )}

                    {/* Icon Circle */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center z-10 flex-shrink-0 transition-all",
                        isCompleted ? "bg-[#0B6B3A] text-white" : active ? "bg-white border-2 border-[#0B6B3A]" : "bg-[#FAF6F0]"
                      )}
                    >
                      {isCompleted ? (
                        <Check size={14} className="stroke-[3]" />
                      ) : (
                        <Icon size={14} className={active ? "text-[#0B6B3A]" : "text-[#8D7355]"} />
                      )}
                    </div>

                    {/* Step Card */}
                    <div
                      className={cn(
                        "flex-1 border rounded-[20px] p-3 flex items-center justify-between transition-all",
                        active
                          ? "bg-[#EAF7EE] border-[#D6EAE7]"
                          : "bg-[#FAF6F0] border-[#EADEC9]"
                      )}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p
                          className={cn(
                            "font-poppins font-bold text-sm leading-tight",
                            active ? "text-[#0B6B3A]" : "text-[#1F2937]"
                          )}
                        >
                          {step.label}
                        </p>
                        <p
                          className={cn(
                            "font-nunito text-xs mt-1 leading-normal",
                            active ? "text-[#0B6B3A]" : "text-gray-500"
                          )}
                        >
                          {step.desc}
                        </p>
                        {active && (
                          <span className="inline-block mt-2 bg-[#0B6B3A] text-white text-[9px] font-poppins font-bold px-2 py-0.5 rounded-lg">
                            In Progress
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          isCompleted || active ? "bg-[#EADEC9]" : "bg-gray-200"
                        )}
                      >
                        <Check
                          size={10}
                          className={cn(
                            "stroke-[3]",
                            isCompleted || active ? "text-[#8D7355]" : "text-gray-400"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
          <h3 className="font-poppins font-bold text-dark text-base mb-4">Items</h3>
          <div className="space-y-3.5">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="relative w-full h-[100px] rounded-[20px] overflow-hidden bg-gray-100"
                style={{
                  backgroundImage: `url(${resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=200&fit=crop"})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/50 p-4 flex flex-col justify-end">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveMediaUrl(item.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        alt={item.name}
                        className="w-10 h-10 rounded-[10px] object-cover border-2 border-white"
                      />
                      <div className="min-w-0">
                        <p className="font-poppins font-bold text-sm text-white truncate max-w-[200px]">
                          {item.name}
                        </p>
                        <p className="font-nunito text-xs text-white/80 mt-0.5">
                          x{item.qty}
                        </p>
                      </div>
                    </div>
                    <span className="font-poppins font-bold text-sm text-white">
                      ₹{item.price * item.qty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between font-poppins font-bold text-dark text-base">
            <span>Total</span>
            <span>₹{order.grandTotal}</span>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#0C4240] flex items-center justify-center flex-shrink-0">
              <ChefHat size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-poppins font-bold text-sm text-dark truncate">
                {order.kitchenName}
              </p>
              <p className="font-nunito text-xs text-gray-500 mt-0.5">
                {isActive ? "Preparing your order" : "Thank you for ordering!"}
              </p>
            </div>
          </div>
          {order.kitchenPhone && (
            <a
              href={`tel:${order.kitchenPhone}`}
              className="flex items-center gap-2 bg-gradient-to-r from-[#FAF6F0] to-[#EADEC9] border border-[#EADEC9] px-3.5 py-2 rounded-full text-dark hover:brightness-95 transition-all flex-shrink-0 shadow-sm"
            >
              <span className="font-poppins font-bold text-xs text-[#1F2937]">
                Contact Restaurant
              </span>
              <div className="w-6 h-6 rounded-full bg-[#1F2937] flex items-center justify-center">
                <Phone size={10} className="text-white" />
              </div>
            </a>
          )}
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
