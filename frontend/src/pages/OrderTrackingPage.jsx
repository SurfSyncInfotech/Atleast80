import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, CheckCircle, ChefHat, Bike, Home, Star, Clock, Check, Phone, AlertTriangle } from "lucide-react"
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

  const [cancelling, setCancelling] = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const data = await api(`/api/orders/${id}`)
      setOrder(data.order)
      setError("")
    } catch (err) {
      setError(err.message || "Order not found")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      navigate("/orders", { replace: true })
      return
    }
    loadOrder()
  }, [id, navigate, loadOrder])

  useEffect(() => {
    if (!order) return
    const isFinalStatus = ["delivered", "cancelled"].includes(order.status)
    if (isFinalStatus) return

    const interval = setInterval(loadOrder, 10000)
    return () => clearInterval(interval)
  }, [order, loadOrder])

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("")

  const openCancelModal = () => {
    setCancelSuccessMsg("")
    setCancelModalOpen(true)
  }

  const confirmCancelOrder = async () => {
    setCancelling(true)
    try {
      const data = await api(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
      })
      setOrder(data.order)

      const isOutForDelivery = order.status === "out_for_delivery"
      const isOnline = ["online", "upi", "razorpay"].includes(order.paymentMethod)
      const deliveryFee = Number(order.deliveryFee) > 0 ? Number(order.deliveryFee) : 30
      const refundAmt = Math.max(0, Number(order.grandTotal) - deliveryFee)

      let successMsg = ""
      if (isOutForDelivery) {
        if (isOnline) {
          successMsg = `Your order has been cancelled. Note: ₹${deliveryFee} delivery charge is non-refundable for rider trip. The remaining ₹${refundAmt} will be refunded to your account within 24-48 hours.`
        } else {
          successMsg = `Your order has been cancelled. Advance ₹${deliveryFee} delivery charge is non-refundable for rider trip.`
        }
      } else if (isOnline) {
        successMsg = `Your order has been cancelled. Your full payment of ₹${order.grandTotal} will be refunded to your account within 24-48 hours.`
      } else {
        successMsg = `Your order has been cancelled. Your ₹30 advance delivery charge will be refunded to your account within 24-48 hours.`
      }

      setCancelSuccessMsg(successMsg)
    } catch (err) {
      alert(err.message || "Failed to cancel order")
      setCancelModalOpen(false)
    } finally {
      setCancelling(false)
    }
  }

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
            <p className="font-nunito text-sm text-red-600 mt-1">This order was cancelled.</p>
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

        {/* Doorstep Cancellation OTP Card */}
        {(order.cancellationOtp || order.cancellation_otp) && order.status !== "cancelled" && (
          <div className="bg-red-50 border border-red-200 rounded-[24px] p-5 text-center shadow-xs space-y-2">
            <h4 className="font-poppins font-bold text-xs text-red-700 uppercase tracking-wider">
              🔑 Doorstep Cancellation OTP
            </h4>
            <div className="font-poppins font-black text-3xl text-red-600 tracking-widest">
              {order.cancellationOtp || order.cancellation_otp}
            </div>
            <p className="font-nunito text-xs text-red-800 leading-relaxed max-w-md mx-auto">
              {["online", "upi", "razorpay"].includes(order.paymentMethod)
                ? `Doorstep cancellation requested. Note: ₹30 delivery fee is non-refundable for rider trip, and ₹${Math.max(0, Number(order.grandTotal) - 30)} will be refunded to your account within 24-48 hours. Share this OTP with rider to confirm:`
                : "Doorstep cancellation requested. Note: ₹30 advance delivery fee is non-refundable for rider trip. Share this OTP with rider to confirm:"}
            </p>
          </div>
        )}

        {/* Delivery Verification OTP Card */}
        {order.deliveryOtp && order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="bg-[#EAF7EE] border border-[#D6EAE7] rounded-[24px] p-4 px-5 flex items-center justify-between shadow-xs">
            <div>
              <h4 className="font-poppins font-bold text-xs text-[#0B6B3A]">Delivery Verification OTP</h4>
              <p className="font-nunito text-[11px] text-gray-600 mt-0.5">Share this code with the rider at your door</p>
            </div>
            <div className="bg-white border-2 border-[#0B6B3A] rounded-xl px-4 py-1.5 shadow-xs">
              <span className="font-poppins font-extrabold text-lg text-[#0B6B3A] tracking-wider">
                {order.deliveryOtp}
              </span>
            </div>
          </div>
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
                          done ? "bg-[#0B6B3A]" : "bg-gray-200"
                        )}
                      />
                    )}

                    {/* Icon Circle */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center z-10 flex-shrink-0 transition-all",
                        done ? "bg-[#0B6B3A] text-white" : "bg-[#FAF6F0]"
                      )}
                    >
                      {done ? (
                        active ? (
                          <Icon size={14} className="stroke-[2.5]" />
                        ) : (
                          <Check size={14} className="stroke-[3]" />
                        )
                      ) : (
                        <Icon size={14} className="text-[#8D7355]" />
                      )}
                    </div>

                    {/* Step Card */}
                    <div
                      className={cn(
                        "flex-1 border rounded-[20px] p-3 flex items-center justify-between transition-all",
                        active
                          ? "bg-[#EAF7EE] border-[#0B6B3A] border-2 shadow-sm"
                          : done
                          ? "bg-[#F0FDF4] border-[#DCFCE7]"
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
                      </div>

                      {active ? (
                        <span className="bg-[#0B6B3A] text-white text-[10px] font-poppins font-bold px-2.5 py-1 rounded-lg shrink-0">
                          {step.id === "out_for_delivery" ? "ON THE WAY" : "IN PROGRESS"}
                        </span>
                      ) : done ? (
                        <Check size={16} className="text-[#0B6B3A] stroke-[2.5] shrink-0" />
                      ) : null}
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
          <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-sm font-nunito">
            <div className="flex justify-between text-gray-600">
              <span>Item Total</span>
              <span className="font-semibold text-dark">₹{order.itemTotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes & GST</span>
              <span className="font-semibold text-dark">₹{order.gstAmount !== undefined && order.gstAmount !== null ? order.gstAmount : Number((order.itemTotal * 0.05).toFixed(2))}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-dark">{order.deliveryFee === 0 ? "Free" : `₹${order.deliveryFee}`}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex justify-between font-poppins font-bold text-dark text-base">
              <span>Grand Total</span>
              <span className="text-primary">₹{order.grandTotal}</span>
            </div>
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

        {["pending", "confirmed", "preparing", "out_for_delivery"].includes(order.status) && (
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-poppins font-bold rounded-full py-3"
            onClick={openCancelModal}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </Button>
        )}

        <Button variant="outline" className="w-full font-poppins font-bold rounded-full py-3" onClick={() => navigate("/home")}>
          Back to Home
        </Button>
      </div>

      {/* Custom Refund & Cancellation Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl text-center"
            >
              {cancelSuccessMsg ? (
                <div>
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="font-poppins font-bold text-lg text-dark">
                    Order Cancelled 🛑
                  </h3>
                  <p className="font-nunito text-sm text-gray-600 mt-2 leading-relaxed">
                    {cancelSuccessMsg}
                  </p>
                  <button
                    onClick={() => {
                      setCancelModalOpen(false)
                      setCancelSuccessMsg("")
                    }}
                    className="mt-6 w-full py-3 bg-[#0B6B3A] text-white rounded-full font-poppins font-bold text-sm hover:bg-[#09572e] transition-colors cursor-pointer"
                  >
                    OK, Got It
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="font-poppins font-bold text-lg text-dark">
                    {order?.status === "out_for_delivery" ? "Cancel In-Transit Order?" : "Cancel Order?"}
                  </h3>
                  <p className="font-nunito text-sm text-gray-600 mt-2 leading-relaxed">
                    {(() => {
                      const isOutForDelivery = order?.status === "out_for_delivery"
                      const isOnline = ["online", "upi", "razorpay"].includes(order?.paymentMethod)
                      const deliveryFee = Number(order?.deliveryFee) > 0 ? Number(order?.deliveryFee) : 30
                      const refundAmt = Math.max(0, Number(order?.grandTotal || 0) - deliveryFee)

                      if (isOutForDelivery) {
                        if (isOnline) {
                          return `Since the order is out for delivery, ₹${deliveryFee} delivery fee is non-refundable for rider trip. Your remaining ₹${refundAmt} will be refunded within 24-48 hours.`
                        }
                        return `Since the order is out for delivery, your advance ₹${deliveryFee} delivery fee is non-refundable to cover rider trip expenses.`
                      }

                      if (isOnline) {
                        return `Are you sure you want to cancel? Your full payment of ₹${order?.grandTotal} will be refunded within 24-48 hours.`
                      }

                      return `Are you sure you want to cancel? Your ₹30 advance delivery charge will be refunded within 24-48 hours.`
                    })()}
                  </p>

                  <div className="mt-6 space-y-2.5">
                    <button
                      onClick={confirmCancelOrder}
                      disabled={cancelling}
                      className="w-full py-3 bg-red-600 text-white rounded-full font-poppins font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                    </button>

                    <button
                      onClick={() => setCancelModalOpen(false)}
                      disabled={cancelling}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-full font-poppins font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
