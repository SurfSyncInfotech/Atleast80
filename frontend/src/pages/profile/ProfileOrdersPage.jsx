import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Package, ShoppingBag, Clock, ChevronRight, Star, MapPin } from "lucide-react"
import Button from "../../components/ui/Button"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-primary/10 text-primary",
  out_for_delivery: "bg-secondary/30 text-dark",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
}

function formatDate(value) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function OrderCard({ order, highlight, onTrack }) {
  const logoSrc = resolveMediaUrl(order.kitchenImage)

  return (
    <motion.button
      type="button"
      onClick={() => onTrack(order.id)}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full text-left rounded-2xl p-4 transition-all cursor-pointer",
        highlight
          ? "bg-gradient-to-br from-primary/8 via-white to-secondary/10 border-2 border-primary/20 shadow-md"
          : "bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/15"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 bg-primary/10">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag size={18} className="text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-poppins font-semibold text-sm text-dark truncate">{order.kitchenName}</p>
            <p className="font-nunito text-xs text-gray mt-0.5">#{order.orderNumber}</p>
            {order.kitchenAddress && (
              <p className="font-nunito text-xs text-gray mt-1 flex items-start gap-1 line-clamp-2">
                <MapPin size={11} className="flex-shrink-0 mt-0.5 text-primary/70" />
                <span>{order.kitchenAddress}</span>
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] font-poppins font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0",
            STATUS_COLORS[order.status] || "bg-gray-100 text-gray"
          )}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/80">
        <div className="flex items-center gap-3 text-xs font-nunito text-gray">
          <span>{order.items?.length || 0} items</span>
          <span>·</span>
          <span className="font-poppins font-semibold text-dark">₹{order.grandTotal}</span>
          {order.createdAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(order.createdAt)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {order.review && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star size={12} className="fill-amber-400" />
              <span className="text-xs font-poppins font-semibold">{order.review.rating}</span>
            </span>
          )}
          <span className="text-primary text-xs font-poppins font-semibold flex items-center gap-0.5">
            {order.status === "delivered" && !order.review ? "Review" : "Track"} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </motion.button>
  )
}

export default function ProfileOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [ordersRes, currentRes] = await Promise.all([
          api("/api/orders"),
          api("/api/orders/current"),
        ])
        if (!cancelled) {
          setOrders(ordersRes.orders || [])
          setCurrentOrder(currentRes.order || null)
        }
      } catch {
        if (!cancelled) {
          setOrders([])
          setCurrentOrder(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const pastOrders = orders.filter((o) => !currentOrder || o.id !== currentOrder.id)

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Package size={18} className="text-primary" />
          <h2 className="font-poppins font-semibold text-dark text-lg">Current order</h2>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-100 p-8 flex justify-center">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : currentOrder ? (
          <OrderCard
            order={currentOrder}
            highlight
            onTrack={(id) => navigate(`/orders/${id}`)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center bg-cream/40">
            <Package size={24} className="mx-auto text-primary mb-2" />
            <p className="font-poppins font-medium text-dark text-sm">No active order</p>
            <Button className="mt-3" size="sm" onClick={() => navigate("/home")}>
              Browse kitchens
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-poppins font-semibold text-dark text-lg mb-4">Order history</h2>
        {loading ? (
          <p className="text-center text-gray font-nunito text-sm py-4">Loading...</p>
        ) : pastOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-cream/40 p-5 text-center">
            <p className="font-nunito text-gray text-sm">Past orders will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <OrderCard order={order} onTrack={(id) => navigate(`/orders/${id}`)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
