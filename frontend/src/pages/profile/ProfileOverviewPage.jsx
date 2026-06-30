import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Package, ShoppingBag, Clock, ChevronRight } from "lucide-react"
import Button from "../../components/ui/Button"
import { api } from "../../lib/api"
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

export default function ProfileOverviewPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    api("/api/alerts").then((d) => setAlerts(d.alerts || [])).catch(() => setAlerts([]))
  }, [])

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary px-4 py-4 text-center shadow-sm">
          <p className="font-poppins font-bold text-2xl text-dark">{orders.length}</p>
          <p className="font-nunito text-xs text-dark/80 mt-0.5 font-semibold">Total orders</p>
        </div>
        <div className="rounded-xl bg-error px-4 py-4 text-center shadow-sm">
          <p className="font-poppins font-bold text-2xl text-white">{currentOrder ? "1" : "0"}</p>
          <p className="font-nunito text-xs text-white/90 mt-0.5 font-semibold">Active order</p>
        </div>
        <div className="rounded-xl bg-primary px-4 py-4 text-center shadow-sm col-span-2 sm:col-span-1">
          <p className="font-poppins font-bold text-2xl text-white">
            {orders.filter((o) => o.status === "delivered").length}
          </p>
          <p className="font-nunito text-xs text-white/90 mt-0.5 font-semibold">Delivered</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-2xl border border-primary/15 p-4 shadow-sm">
              <p className="font-poppins font-semibold text-sm text-dark">{alert.title}</p>
              <p className="font-nunito text-sm text-gray mt-1">{alert.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="font-poppins font-semibold text-dark text-lg">Current order</h2>
          </div>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/profile/orders")}
              className="text-xs font-poppins font-semibold text-primary cursor-pointer hover:underline"
            >
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-100 p-8 flex justify-center">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : currentOrder ? (
          <button
            type="button"
            onClick={() => navigate(`/orders/${currentOrder.id}`)}
            className="w-full text-left rounded-xl p-4 bg-gradient-to-br from-primary/8 via-white to-secondary/10 border-2 border-primary/20 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-poppins font-semibold text-sm text-dark truncate">{currentOrder.kitchenName}</p>
                  <p className="font-nunito text-xs text-gray">#{currentOrder.orderNumber}</p>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-poppins font-bold uppercase px-2.5 py-1 rounded-full flex-shrink-0",
                STATUS_COLORS[currentOrder.status]
              )}>
                {STATUS_LABELS[currentOrder.status]}
              </span>
            </div>
            <p className="mt-3 text-xs font-poppins font-semibold text-primary flex items-center gap-1">
              Track order <ChevronRight size={14} />
            </p>
          </button>
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
    </div>
  )
}
