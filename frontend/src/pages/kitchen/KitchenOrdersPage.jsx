import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package, Clock, Phone, MapPin, RefreshCw, XCircle, Star,
  Eye, X, ChevronRight,
} from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import Button from "../../components/ui/Button"
import TablePagination from "../../components/ui/TablePagination"
import { api } from "../../lib/api"
import { paginateSlice } from "../../lib/pagination"
import { cn } from "../../lib/utils"

const STATUS_LABELS = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-primary/15 text-primary",
  out_for_delivery: "bg-secondary/40 text-dark",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
}

const NEXT_STATUS = {
  pending: { status: "confirmed", label: "Accept" },
  confirmed: { status: "preparing", label: "Prepare" },
  preparing: { status: "out_for_delivery", label: "Dispatch" },
  out_for_delivery: { status: "delivered", label: "Deliver" },
}

const TABS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
]

const TABLE_HEADERS = ["Order", "Customer", "Items", "Amount", "Status", "Time", "Actions"]

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

function formatShortDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function StatusBadge({ status, showCancelledAlert }) {
  const displayStatus = showCancelledAlert ? "cancelled" : status
  return (
    <span className={cn(
      "inline-flex text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap",
      STATUS_COLORS[displayStatus] || "bg-gray-100 text-gray"
    )}>
      {STATUS_LABELS[displayStatus] || displayStatus}
    </span>
  )
}

function OrderDetailModal({ order, onClose, onStatusUpdate, onAcknowledge, updating }) {
  if (!order) return null
  const next = NEXT_STATUS[order.status]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <p className="font-poppins font-bold text-lg text-dark">#{order.orderNumber}</p>
            <p className="font-nunito text-xs text-gray mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} showCancelledAlert={order.showCancelledAlert} />
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl bg-cream/60 border border-gray-100 p-4 space-y-2">
            <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray">Customer</p>
            <p className="font-poppins font-semibold text-dark">{order.customerName}</p>
            {order.customerPhone && (
              <p className="flex items-center gap-2 text-sm text-gray font-nunito">
                <Phone size={14} className="text-primary flex-shrink-0" />
                +91 {order.customerPhone}
              </p>
            )}
            <p className="flex items-start gap-2 text-sm text-gray font-nunito">
              <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
              {order.deliveryAddress}
            </p>
            {order.pickupCode && (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mt-3 flex items-center justify-between">
                <span className="text-xs font-poppins font-bold text-gray uppercase tracking-wider">Rider Pickup Code:</span>
                <span className="text-sm font-poppins font-bold text-primary tracking-widest bg-white border border-primary/20 rounded px-2.5 py-0.5">{order.pickupCode}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray mb-3">Order items</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {order.items?.map((item, i) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex justify-between items-center px-4 py-3 text-sm font-nunito",
                    i < order.items.length - 1 && "border-b border-gray-50"
                  )}
                >
                  <span className="text-dark">{item.name} <span className="text-gray">× {item.qty}</span></span>
                  <span className="font-poppins font-semibold">₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 bg-[#fafafa] font-poppins font-bold text-sm border-t border-gray-100">
                <span>Grand total</span>
                <span className="text-primary">₹{order.grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-poppins font-bold uppercase text-gray">Payment</p>
              <p className="font-nunito text-dark mt-1 capitalize">{order.paymentMethod || "COD"}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-poppins font-bold uppercase text-gray">Packing</p>
              <p className="font-nunito text-dark mt-1 capitalize">{order.packingType || "Standard"}</p>
            </div>
          </div>

          {order.review && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-amber-700 mb-2">Customer review</p>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < order.review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                ))}
              </div>
              {order.review.review && (
                <p className="font-nunito text-sm text-dark">{order.review.review}</p>
              )}
            </div>
          )}

          {order.showCancelledAlert ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center gap-3 w-full">
              <p className="text-sm font-poppins font-bold text-red-700 text-center">⚠️ This order was cancelled by the customer.</p>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  onAcknowledge(order.id)
                  onClose()
                }}
              >
                OK
              </Button>
            </div>
          ) : (
            next && (
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={() => onStatusUpdate(order.id, next.status)}
                  disabled={updating}
                >
                  {updating ? "Updating..." : next.label}
                </Button>
                {["pending", "confirmed", "preparing"].includes(order.status) && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 px-4"
                    onClick={() => onStatusUpdate(order.id, "cancelled")}
                    disabled={updating}
                    title="Cancel order"
                  >
                    <XCircle size={16} />
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function KitchenOrdersPage() {
  const navigate = useNavigate()
  const [allOrders, setAllOrders] = useState([])
  const [tab, setTab] = useState("active")
  const [detailOrder, setDetailOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api("/api/orders/kitchen", {}, "kitchen")
      const newOrders = data.orders || []

      setAllOrders((prevOrders) => {
        const prevList = prevOrders || []
        return newOrders.map((newO) => {
          if (newO.status === "cancelled") {
            const oldO = prevList.find((o) => o.id === newO.id)
            const wasActive = oldO && ["pending", "confirmed", "preparing"].includes(oldO.status)
            const wasShowingAlert = oldO && oldO.showCancelledAlert
            if (wasActive || wasShowingAlert) {
              return {
                ...newO,
                status: oldO.status, // keep in old tab visually
                actualStatus: "cancelled",
                showCancelledAlert: true,
              }
            }
          }
          return newO
        })
      })
    } catch {
      setAllOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const hasActive = allOrders.some((o) => ["pending", "confirmed", "preparing"].includes(o.status))
    const intervalTime = hasActive ? 1000 : 25000
    const interval = setInterval(loadOrders, intervalTime)
    return () => clearInterval(interval)
  }, [allOrders, loadOrders])

  const tabCounts = useMemo(() => {
    const counts = { active: 0, all: allOrders.length }
    for (const o of allOrders) {
      if (!["delivered", "cancelled"].includes(o.status)) counts.active++
      counts[o.status] = (counts[o.status] || 0) + 1
    }
    return counts
  }, [allOrders])

  const filteredOrders = useMemo(() => {
    if (tab === "all") return allOrders
    if (tab === "active") return allOrders.filter((o) => !["delivered", "cancelled"].includes(o.status))
    return allOrders.filter((o) => o.status === tab)
  }, [allOrders, tab])

  const paginatedOrders = useMemo(
    () => paginateSlice(filteredOrders, page, pageSize),
    [filteredOrders, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [tab])

  useEffect(() => {
    if (page > paginatedOrders.totalPages) setPage(paginatedOrders.totalPages)
  }, [page, paginatedOrders.totalPages])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders()
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true)
    try {
      const data = await api(
        `/api/orders/kitchen/${orderId}/status`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) },
        "kitchen"
      )
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)))
      setDetailOrder((prev) => (prev?.id === orderId ? data.order : prev))
      if (newStatus === "out_for_delivery") {
        alert(`Order Dispatched Successfully!\n\nAwaiting rider assignment.\n\nRider Pickup Code: ${data.order.pickupCode}`)
      } else {
        alert(`Order status updated to "${STATUS_LABELS[newStatus] || newStatus}" successfully!`)
      }
    } catch (err) {
      if (err.status === 400 || err.message?.toLowerCase().includes("cancel")) {
        alert("This order has already been cancelled by the customer.")
        loadOrders()
      } else {
        alert(err.message || "Failed to update status")
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleAcknowledgeCancellation = (orderId) => {
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: "cancelled",
            showCancelledAlert: false,
          }
        }
        return o
      })
    )
  }

  return (
    <KitchenLayout fullBleed>
      <div className="w-full px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="font-poppins font-bold text-dark text-xl sm:text-2xl">Orders</h1>
            <p className="font-nunito text-sm text-gray mt-0.5">
              Manage and fulfil customer orders
              {(tabCounts.pending || 0) > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">{tabCounts.pending} new</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-poppins font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-60 self-start"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide border-b border-gray-200">
          {TABS.map((t) => {
            const count = tabCounts[t.key] ?? 0
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-poppins font-semibold whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-[13px]",
                  tab === t.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-gray hover:text-dark hover:bg-gray-50"
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    tab === t.key ? "bg-primary text-white" : "bg-gray-200 text-gray-600",
                    t.key === "pending" && count > 0 && tab !== t.key && "bg-amber-200 text-amber-800"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-poppins font-semibold text-dark">No orders in this tab</p>
            <p className="font-nunito text-sm text-gray mt-1">
              {tab === "active" ? "New orders will appear here when customers place them." : "Try another tab."}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/kitchen/menu")}>
              Manage Menu
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-poppins text-[11px] font-semibold text-[#696969] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.items.map((order) => {
                    const next = NEXT_STATUS[order.status]
                    const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) || order.items?.length || 0

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          "border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors",
                          order.status === "pending" && "bg-amber-50/40"
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className="font-poppins font-semibold text-sm text-dark">#{order.orderNumber}</p>
                          <p className="font-nunito text-[11px] text-gray">{formatShortDate(order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-poppins font-medium text-sm text-dark truncate max-w-[140px]">
                            {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="font-nunito text-[11px] text-gray">+91 {order.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 font-poppins font-semibold text-sm text-primary whitespace-nowrap">
                          ₹{order.grandTotal}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={order.status} showCancelledAlert={order.showCancelledAlert} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-nunito text-xs text-gray">
                            <Clock size={12} />
                            {formatDate(order.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {order.showCancelledAlert ? (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 text-xs text-red-700 font-poppins font-medium">
                              <span>Cancelled by Customer</span>
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeCancellation(order.id)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailOrder(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-poppins font-semibold text-primary bg-primary/10 hover:bg-primary/15 cursor-pointer transition-colors"
                              >
                                <Eye size={13} />
                                Details
                              </button>
                              {next && (
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() => handleStatusUpdate(order.id, next.status)}
                                  className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-poppins font-semibold text-white bg-primary hover:bg-primary-dark cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  {next.label}
                                  <ChevronRight size={12} />
                                </button>
                              )}
                              {["pending", "confirmed", "preparing"].includes(order.status) && (
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                  title="Cancel order"
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={paginatedOrders.page}
              pageSize={pageSize}
              total={paginatedOrders.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {detailOrder && (
          <OrderDetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onStatusUpdate={handleStatusUpdate}
            onAcknowledge={handleAcknowledgeCancellation}
            updating={updating}
          />
        )}
      </AnimatePresence>
    </KitchenLayout>
  )
}
