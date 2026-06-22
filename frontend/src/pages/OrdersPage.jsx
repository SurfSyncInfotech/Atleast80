import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Package } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import Button from "../components/ui/Button"

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
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

  if (!user) return null

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-gray-light/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-poppins font-bold text-lg text-dark">Your Orders</h1>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-2xl mx-auto space-y-6">
        {currentOrder && (
          <div>
            <h2 className="font-poppins font-semibold text-sm text-primary mb-3 flex items-center gap-2">
              <Package size={16} />
              Current Order
            </h2>
            <button
              type="button"
              onClick={() => navigate(`/orders/${currentOrder.id}`)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-primary/20 text-left cursor-pointer hover:shadow-md"
            >
              <p className="font-poppins font-semibold text-dark">{currentOrder.kitchenName}</p>
              <p className="font-nunito text-xs text-gray mt-1">#{currentOrder.orderNumber}</p>
              <p className="font-poppins text-sm text-primary mt-2">
                {STATUS_LABELS[currentOrder.status]} · Track order →
              </p>
            </button>
          </div>
        )}

        <div>
          <h2 className="font-poppins font-semibold text-dark mb-3">Order History</h2>
          {loading ? (
            <p className="text-center text-gray font-nunito text-sm py-8">Loading...</p>
          ) : orders.filter((o) => o.id !== currentOrder?.id).length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="font-nunito text-gray text-sm">No orders yet</p>
              <Button className="mt-4" onClick={() => navigate("/home")}>Start ordering</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders
                .filter((o) => o.id !== currentOrder?.id)
                .map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left cursor-pointer hover:shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-poppins font-semibold text-sm text-dark">{order.kitchenName}</p>
                        <p className="font-nunito text-xs text-gray">#{order.orderNumber}</p>
                      </div>
                      <span className="text-xs font-poppins font-semibold text-gray">
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="font-nunito text-xs text-gray mt-2">
                      ₹{order.grandTotal} · {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
