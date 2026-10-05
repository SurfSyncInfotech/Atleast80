import { useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package, Clock, Phone, MapPin, RefreshCw, Star, Eye, X, Mail,
  ChefHat, Search, MapPin as MapPinIcon, IndianRupee,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import TablePagination from "../../components/ui/TablePagination"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
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

function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap",
      STATUS_COLORS[status] || "bg-gray-100 text-gray"
    )}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null

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
            <StatusBadge status={order.status} />
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray mb-1">Kitchen</p>
            <p className="font-poppins font-semibold text-dark">{order.kitchenName}</p>
            {order.kitchenCity && <p className="font-nunito text-xs text-gray mt-0.5">{order.kitchenCity}</p>}
          </div>

          <div className="rounded-xl bg-cream/60 border border-gray-100 p-4 space-y-2">
            <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray">Customer</p>
            <p className="font-poppins font-semibold text-dark">{order.customerName}</p>
            {order.customerPhone && (
              <p className="flex items-center gap-2 text-sm text-gray font-nunito">
                <Phone size={14} className="text-primary flex-shrink-0" />+91 {order.customerPhone}
              </p>
            )}
            {order.customerEmail && (
              <p className="flex items-center gap-2 text-sm text-gray font-nunito truncate">
                <Mail size={14} className="text-primary flex-shrink-0" />{order.customerEmail}
              </p>
            )}
            <p className="flex items-start gap-2 text-sm text-gray font-nunito">
              <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />{order.deliveryAddress}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray mb-3">Order items</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {order.items?.map((item, i) => (
                <div key={item.id} className={cn("flex justify-between items-center px-4 py-3 text-sm font-nunito", i < order.items.length - 1 && "border-b border-gray-50")}>
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

          {order.review && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-amber-700 mb-2">Customer review</p>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < order.review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                ))}
              </div>
              {order.review.review && <p className="font-nunito text-sm text-dark">{order.review.review}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function KitchenListItem({ kitchen, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
        selected
          ? "bg-primary/10 border-primary/30 shadow-sm"
          : "bg-white border-gray-100 hover:border-primary/20 hover:bg-gray-50",
        kitchen.pendingOrders > 0 && !selected && "border-amber-200/80 bg-amber-50/30"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
        {kitchen.image ? (
          <img src={resolveMediaUrl(kitchen.image)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat size={16} className="text-gray-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-poppins font-semibold text-sm text-dark truncate">{kitchen.name}</p>
        {kitchen.city && (
          <p className="font-nunito text-[11px] text-gray truncate flex items-center gap-0.5 mt-0.5">
            <MapPinIcon size={10} />{kitchen.city}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {kitchen.pendingOrders > 0 && (
            <span className="text-[9px] font-poppins font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {kitchen.pendingOrders} new
            </span>
          )}
          {kitchen.activeOrders > 0 && (
            <span className="text-[9px] font-poppins font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {kitchen.activeOrders} active
            </span>
          )}
          <span className="text-[9px] font-poppins font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {kitchen.totalOrders} total
          </span>
        </div>
        <p className="font-poppins font-semibold text-[11px] text-emerald-700 mt-1.5 flex items-center gap-0.5">
          <IndianRupee size={11} />
          {formatINR(kitchen.monthlyRevenue)}
          <span className="font-nunito font-normal text-gray text-[10px]">this month</span>
        </p>
      </div>
    </button>
  )
}

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState([])
  const [kitchens, setKitchens] = useState([])
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, delivered: 0 })
  const [selectedKitchenId, setSelectedKitchenId] = useState(null)
  const [tab, setTab] = useState("active")
  const [kitchenSearch, setKitchenSearch] = useState("")
  const [orderSearch, setOrderSearch] = useState("")
  const [detailOrder, setDetailOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api("/api/admin/orders", {}, "admin")
      const kitchenList = data.kitchens || []
      setAllOrders(data.orders || [])
      setKitchens(kitchenList)
      setSummary(data.summary || {})
      setSelectedKitchenId((prev) => {
        if (prev && kitchenList.some((k) => k.id === prev)) return prev
        const withPending = kitchenList.find((k) => k.pendingOrders > 0)
        const withActive = kitchenList.find((k) => k.activeOrders > 0)
        const withOrders = kitchenList.find((k) => k.totalOrders > 0)
        return (withPending || withActive || withOrders || kitchenList[0])?.id ?? null
      })
    } catch {
      setAllOrders([])
      setKitchens([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders()
    }, 3000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const selectedKitchen = kitchens.find((k) => k.id === selectedKitchenId)

  const kitchenOrders = useMemo(
    () => allOrders.filter((o) => o.kitchenId === selectedKitchenId),
    [allOrders, selectedKitchenId]
  )

  const filteredKitchens = useMemo(() => {
    const q = kitchenSearch.trim().toLowerCase()
    if (!q) return kitchens
    return kitchens.filter(
      (k) => k.name?.toLowerCase().includes(q) || k.city?.toLowerCase().includes(q)
    )
  }, [kitchens, kitchenSearch])

  const kitchenTabCounts = useMemo(() => {
    const counts = { active: 0, all: kitchenOrders.length }
    for (const o of kitchenOrders) {
      if (!["delivered", "cancelled"].includes(o.status)) counts.active++
      counts[o.status] = (counts[o.status] || 0) + 1
    }
    return counts
  }, [kitchenOrders])

  const filteredKitchenOrders = useMemo(() => {
    let list = kitchenOrders
    if (tab === "active") {
      list = list.filter((o) => !["delivered", "cancelled"].includes(o.status))
    } else if (tab !== "all") {
      list = list.filter((o) => o.status === tab)
    }
    const q = orderSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q)
    )
  }, [kitchenOrders, tab, orderSearch])

  const paginatedOrders = useMemo(
    () => paginateSlice(filteredKitchenOrders, page, pageSize),
    [filteredKitchenOrders, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [tab, orderSearch, selectedKitchenId])

  useEffect(() => {
    if (page > paginatedOrders.totalPages) setPage(paginatedOrders.totalPages)
  }, [page, paginatedOrders.totalPages])

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Orders by kitchen</h1>
            <p className="font-nunito text-sm text-gray mt-0.5">
              {summary.kitchensWithOrders ?? 0} kitchens with orders · {summary.total ?? 0} total
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setRefreshing(true); loadOrders() }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-poppins font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-60 self-start"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total orders", value: summary.total, color: "text-primary" },
          { label: "Active", value: summary.active, color: "text-blue-600" },
          { label: "New", value: summary.pending, color: "text-amber-600" },
          { label: "Kitchens", value: summary.kitchens, color: "text-emerald-600" },
          {
            label: summary.monthLabel ? `${summary.monthLabel} revenue` : "Monthly revenue",
            value: formatINR(summary.monthlyRevenue),
            color: "text-emerald-700",
            isMoney: true,
          },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-[#e8e8e8] p-4 shadow-sm">
            <p className={cn("font-poppins font-bold", c.isMoney ? "text-lg sm:text-xl" : "text-2xl", c.color)}>{c.value ?? 0}</p>
            <p className="font-nunito text-xs sm:text-sm text-gray mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : kitchens.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
          <ChefHat size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-poppins font-semibold text-dark">No approved kitchens</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
          {/* Kitchen sidebar */}
          <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden lg:sticky lg:top-4">
            <div className="p-3 border-b border-gray-100">
              <p className="font-poppins font-semibold text-sm text-dark mb-2 flex items-center gap-2">
                <ChefHat size={16} className="text-primary" />
                Kitchens ({kitchens.length})
              </p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                <input
                  type="search"
                  value={kitchenSearch}
                  onChange={(e) => setKitchenSearch(e.target.value)}
                  placeholder="Search kitchen..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm font-nunito focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="p-2 max-h-[55vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto space-y-1.5">
              {filteredKitchens.length === 0 ? (
                <p className="text-center text-sm text-gray font-nunito py-6">No kitchens match</p>
              ) : (
                filteredKitchens.map((kitchen) => (
                  <KitchenListItem
                    key={kitchen.id}
                    kitchen={kitchen}
                    selected={kitchen.id === selectedKitchenId}
                    onClick={() => { setSelectedKitchenId(kitchen.id); setTab("active"); setOrderSearch("") }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Orders panel */}
          <div className="min-w-0">
            {selectedKitchen ? (
              <>
                <div className="bg-white rounded-xl border border-[#e8e8e8] px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                      {selectedKitchen.image ? (
                        <img src={resolveMediaUrl(selectedKitchen.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ChefHat size={18} className="text-gray" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-poppins font-bold text-dark truncate">{selectedKitchen.name}</h2>
                      <p className="font-nunito text-xs text-gray">
                        {selectedKitchen.city || "—"} · {selectedKitchen.totalOrders} orders
                      </p>
                      <p className="font-poppins font-semibold text-sm text-emerald-700 mt-1 flex items-center gap-1">
                        <IndianRupee size={14} />
                        {formatINR(selectedKitchen.monthlyRevenue)}
                        <span className="font-nunito font-normal text-gray text-xs">
                          {summary.monthLabel || "this month"} · {selectedKitchen.monthlyDelivered ?? 0} delivered
                        </span>
                      </p>
                    </div>
                  </div>
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search orders..."
                    className="w-full sm:w-52 px-3 py-2 rounded-lg border border-gray-200 text-sm font-nunito focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-3 mb-1 scrollbar-hide">
                  {TABS.map((t) => {
                    const count = kitchenTabCounts[t.key] ?? 0
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-poppins font-semibold whitespace-nowrap cursor-pointer",
                          tab === t.key ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray hover:border-primary/30"
                        )}
                      >
                        {t.label}
                        {count > 0 && (
                          <span className={cn("text-[10px] px-1 rounded-full", tab === t.key ? "bg-white/20" : "bg-gray-100")}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {kitchenOrders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
                    <Package size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-poppins font-medium text-dark text-sm">No orders for this kitchen yet</p>
                  </div>
                ) : filteredKitchenOrders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[#e8e8e8] p-8 text-center">
                    <p className="font-nunito text-sm text-gray">No orders match this filter.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] border-collapse">
                        <thead>
                          <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                            {TABLE_HEADERS.map((h) => (
                              <th key={h} className="text-left px-4 py-3 font-poppins text-[11px] font-semibold text-[#696969] uppercase tracking-wider whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOrders.items.map((order) => {
                            const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) || 0
                            return (
                              <tr
                                key={order.id}
                                className={cn(
                                  "border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]",
                                  order.status === "pending" && "bg-amber-50/40"
                                )}
                              >
                                <td className="px-4 py-3">
                                  <p className="font-poppins font-semibold text-sm">#{order.orderNumber}</p>
                                  <p className="font-nunito text-[11px] text-gray">{formatShortDate(order.createdAt)}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-poppins font-medium text-sm truncate max-w-[120px]">{order.customerName}</p>
                                  {order.customerPhone && <p className="font-nunito text-[11px] text-gray">+91 {order.customerPhone}</p>}
                                </td>
                                <td className="px-4 py-3 font-nunito text-sm whitespace-nowrap">{itemCount} items</td>
                                <td className="px-4 py-3 font-poppins font-semibold text-sm text-primary whitespace-nowrap">₹{order.grandTotal}</td>
                                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="flex items-center gap-1 font-nunito text-xs text-gray"><Clock size={12} />{formatDate(order.createdAt)}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <button type="button" onClick={() => setDetailOrder(order)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-poppins font-semibold text-primary bg-primary/10 hover:bg-primary/15 cursor-pointer">
                                    <Eye size={13} />Details
                                  </button>
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
              </>
            ) : (
              <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
                <p className="font-nunito text-gray">Select a kitchen to view orders</p>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
      </AnimatePresence>
    </AdminLayout>
  )
}
