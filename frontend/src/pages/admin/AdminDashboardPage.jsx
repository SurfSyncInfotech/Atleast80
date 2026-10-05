import { useEffect, useState, useCallback } from "react"
import {
  ChefHat, Clock, CheckCircle, XCircle, MapPin, Phone, Mail,
  User, Leaf, FileText, Calendar, Store, Search, Filter,
  ChevronLeft, ChevronRight, X, Eye, ShieldCheck, Trash2, ImageIcon,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const kitchenTypeLabel = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }
const PAGE_SIZES = [10, 15, 25, 50]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [kitchens, setKitchens] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 })
  const [cities, setCities] = useState([])
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [selected, setSelected] = useState(null)
  const [approveModal, setApproveModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      if (filter) params.set("status", filter)
      if (search) params.set("search", search)
      if (cityFilter) params.set("city", cityFilter)

      const [statsData, kitchensData] = await Promise.all([
        api("/api/admin/stats"),
        api(`/api/admin/kitchens?${params}`),
      ])
      setStats(statsData.stats)
      setKitchens(kitchensData.kitchens)
      setPagination(kitchensData.pagination)
    } catch (err) {
      console.error(err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [filter, search, cityFilter, page, pageSize])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false)
    }, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    api("/api/admin/kitchens/cities").then((d) => setCities(d.cities)).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [filter, search, cityFilter, pageSize])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleApprove = async (id) => {
    setActionId(id)
    try {
      await api(`/api/admin/kitchens/${id}/approve`, { method: "PATCH" })
      setApproveModal(null)
      setSelected(null)
      await loadData()
    } catch (err) { alert(err.message) }
    finally { setActionId(null) }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setActionId(rejectModal)
    try {
      await api(`/api/admin/kitchens/${rejectModal}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason }),
      })
      setRejectModal(null)
      setRejectReason("")
      setSelected(null)
      await loadData()
    } catch (err) { alert(err.message) }
    finally { setActionId(null) }
  }

  const handleDelete = async (id) => {
    setActionId(id)
    try {
      await api(`/api/admin/kitchens/${id}`, { method: "DELETE" })
      setDeleteModal(null)
      setSelected(null)
      await loadData()
    } catch (err) { alert(err.message) }
    finally { setActionId(null) }
  }

  const statCards = [
    { label: "Total", value: stats.total, icon: ChefHat, color: "text-primary", onClick: () => setFilter("") },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600", onClick: () => setFilter("pending") },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-600", onClick: () => setFilter("approved") },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500", onClick: () => setFilter("rejected") },
  ]

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Partner Kitchens</h1>
          <p className="font-nunito text-[#696969] text-sm mt-1">
            {pagination.total} kitchen{pagination.total !== 1 ? "s" : ""} {filter ? `· ${filter}` : "· all statuses"}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => {
          const Icon = s.icon
          const active = (s.label === "Total" && !filter) || filter === s.label.toLowerCase()
          return (
            <button
              key={s.label}
              onClick={s.onClick}
              className={cn(
                "bg-white rounded-lg border p-4 text-left cursor-pointer transition-all hover:shadow-md",
                active ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-[#e8e8e8]"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={s.color} />
                <span className="font-nunito text-xs text-[#696969]">{s.label}</span>
              </div>
              <p className="font-poppins font-bold text-2xl text-[#1c1c1c]">{s.value}</p>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-[#e8e8e8] p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, owner, email, phone, city, FSSAI..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 focus:bg-white"
            />
          </form>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full pl-8 pr-8 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 appearance-none cursor-pointer sm:min-w-[140px]"
              >
                <option value="">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 cursor-pointer"
            >
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg border border-[#e8e8e8] py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : kitchens.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#e8e8e8] py-16 text-center">
            <ChefHat size={36} className="text-[#ddd] mx-auto mb-3" />
            <p className="font-poppins font-medium text-[#1c1c1c]">No kitchens found</p>
            <p className="font-nunito text-sm text-[#999] mt-1">Try changing filters or search term</p>
          </div>
        ) : (
          kitchens.map((k) => (
            <div
              key={k.id}
              className="bg-white rounded-lg border border-[#e8e8e8] p-4 shadow-sm"
              onClick={() => setSelected(k)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate">{k.name}</p>
                  <p className="font-nunito text-xs text-[#999] mt-0.5 truncate">{k.speciality}</p>
                </div>
                <StatusBadge status={k.status} />
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="font-nunito text-xs text-[#696969] flex items-center gap-1.5">
                  <User size={12} className="flex-shrink-0" /> {k.owner_name}
                </p>
                <p className="font-nunito text-xs text-[#696969] flex items-center gap-1.5">
                  <MapPin size={12} className="flex-shrink-0" /> {k.city}, {k.state}
                </p>
                <p className="font-nunito text-xs text-[#696969] flex items-center gap-1.5">
                  <Phone size={12} className="flex-shrink-0" /> {k.phone}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                <span className="font-nunito text-[10px] text-[#999]">
                  {new Date(k.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelected(k)}
                    className="p-2 rounded-md border border-[#e8e8e8] text-[#696969] cursor-pointer"
                  >
                    <Eye size={15} />
                  </button>
                  {k.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(k.id)}
                        disabled={actionId === k.id}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-poppins font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectModal(k.id)}
                        className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-[11px] font-poppins font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {!loading && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2">
            <p className="font-nunito text-xs text-[#696969]">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-md bg-white border border-[#e8e8e8] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-poppins text-xs text-[#696969]">{page} / {pagination.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-md bg-white border border-[#e8e8e8] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop data table */}
      <div className="hidden lg:block bg-white rounded-lg border border-[#e8e8e8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                {["Kitchen", "Owner", "Location", "Contact", "Applied", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-poppins text-[11px] font-semibold text-[#696969] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : kitchens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ChefHat size={36} className="text-[#ddd] mx-auto mb-3" />
                    <p className="font-poppins font-medium text-[#1c1c1c]">No kitchens found</p>
                    <p className="font-nunito text-sm text-[#999] mt-1">Try changing filters or search term</p>
                  </td>
                </tr>
              ) : (
                kitchens.map((k) => (
                  <tr
                    key={k.id}
                    className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors cursor-pointer"
                    onClick={() => setSelected(k)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-poppins font-semibold text-sm text-[#1c1c1c]">{k.name}</p>
                      <p className="font-nunito text-xs text-[#999] truncate max-w-[180px]">{k.speciality}</p>
                    </td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636]">{k.owner_name}</td>
                    <td className="px-4 py-3">
                      <p className="font-nunito text-sm text-[#363636]">{k.city}</p>
                      <p className="font-nunito text-xs text-[#999]">{k.state}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-nunito text-xs text-[#363636]">{k.phone}</p>
                      <p className="font-nunito text-xs text-[#999] truncate max-w-[140px]">{k.email}</p>
                    </td>
                    <td className="px-4 py-3 font-nunito text-xs text-[#696969]">
                      {new Date(k.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={k.status} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelected(k)}
                          className="p-1.5 rounded-md hover:bg-[#eee] text-[#696969] cursor-pointer"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                        {k.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(k.id)}
                              disabled={actionId === k.id}
                              className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-poppins font-semibold hover:bg-primary-dark cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal(k.id)}
                              className="px-2.5 py-1 rounded-md border border-red-200 text-red-600 text-[11px] font-poppins font-semibold hover:bg-red-50 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#e8e8e8] bg-[#fafafa]">
            <div className="flex items-center gap-2 font-nunito text-xs text-[#696969]">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded border border-[#e8e8e8] bg-white text-xs cursor-pointer"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="ml-2">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-md hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum
                if (pagination.totalPages <= 5) pageNum = i + 1
                else if (page <= 3) pageNum = i + 1
                else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                else pageNum = page - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-md text-xs font-poppins font-medium cursor-pointer",
                      page === pageNum ? "bg-primary text-white" : "hover:bg-white text-[#696969]"
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-md hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <KitchenDrawer
          kitchen={selected}
          onClose={() => setSelected(null)}
          onApprove={() => setApproveModal(selected.id)}
          onReject={() => setRejectModal(selected.id)}
          onDelete={() => setDeleteModal(selected.id)}
          actionLoading={actionId === selected.id}
        />
      )}

      {approveModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Approve Kitchen</h3>
            <p className="font-nunito text-[#696969] text-sm mt-1">
              This kitchen will go live on the marketplace. The partner must record daily hygiene videos after approval.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setApproveModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-[#e8e8e8] font-poppins text-sm font-medium cursor-pointer hover:bg-[#fafafa]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approveModal)}
                disabled={actionId === approveModal}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white font-poppins text-sm font-semibold hover:bg-primary-dark cursor-pointer disabled:opacity-50"
              >
                {actionId === approveModal ? "Approving..." : "Approve kitchen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Delete Kitchen</h3>
            <p className="font-nunito text-[#696969] text-sm mt-2 leading-relaxed">
              This permanently removes the kitchen, partner account, menu, stories, and related orders. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-[#e8e8e8] font-poppins text-sm font-medium cursor-pointer hover:bg-[#fafafa]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                disabled={actionId === deleteModal}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-poppins text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {actionId === deleteModal ? "Deleting..." : "Delete kitchen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Reject Application</h3>
            <p className="font-nunito text-[#696969] text-sm mt-1">This reason will be shown to the kitchen owner</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Invalid FSSAI, incomplete address, hygiene concerns..."
              className="w-full mt-4 px-4 py-3 bg-[#f8f8f8] rounded-lg border border-[#e8e8e8] focus:outline-none focus:border-primary font-nunito text-sm min-h-[100px] resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason("") }} className="flex-1 py-2.5 rounded-lg border border-[#e8e8e8] font-poppins text-sm font-medium cursor-pointer hover:bg-[#fafafa]">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-poppins text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function KitchenDrawer({ kitchen: k, onClose, onApprove, onReject, onDelete, actionLoading }) {
  const [stories, setStories] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(true)
  const coverUrl = resolveMediaUrl(k.cover_image)
  const hasCover = Boolean(coverUrl)

  let setupPhotos = []
  try {
    if (Array.isArray(k.kitchen_images)) {
      setupPhotos = k.kitchen_images
    } else if (typeof k.kitchen_images === "string" && k.kitchen_images.trim()) {
      setupPhotos = JSON.parse(k.kitchen_images)
    } else if (Array.isArray(k.kitchenImages)) {
      setupPhotos = k.kitchenImages
    }
  } catch {
    setupPhotos = []
  }
  setupPhotos = (Array.isArray(setupPhotos) ? setupPhotos : []).filter(Boolean)

  const hasSetupPhotos = setupPhotos.length >= 2
  const canApprove = hasCover

  useEffect(() => {
    let cancelled = false
    setStoriesLoading(true)
    api(`/api/admin/kitchens/${k.id}/stories`)
      .then((data) => {
        if (!cancelled) setStories(data.stories || [])
      })
      .catch(() => {
        if (!cancelled) setStories([])
      })
      .finally(() => {
        if (!cancelled) setStoriesLoading(false)
      })
    return () => { cancelled = true }
  }, [k.id])

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 h-full w-full sm:max-w-lg bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
          <div>
            <h2 className="font-poppins font-bold text-lg text-[#1c1c1c]">{k.name}</h2>
            <StatusBadge status={k.status} />
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f0f0f0] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <DrawerSection title="Kitchen" icon={Store}>
            <DrawerField label="Name" value={k.name} />
            <DrawerField label="Owner" value={k.owner_name} />
            <DrawerField label="Speciality" value={k.speciality} />
            <DrawerField label="Signature Dish" value={k.best_item} />
            <DrawerField label="Type" value={kitchenTypeLabel[k.kitchen_type]} />
            <DrawerField label="Hours" value={k.opening_time} />
          </DrawerSection>

          <DrawerSection title="Home card image" icon={ImageIcon}>
            {hasCover ? (
              <a
                href={coverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-[#e8e8e8] aspect-video max-w-xs bg-[#f0f0f0]"
              >
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              </a>
            ) : (
              <p className="font-nunito text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                No home image uploaded yet. Kitchen must upload a home card image before approval.
              </p>
            )}
          </DrawerSection>

          <DrawerSection title="Contact" icon={Phone}>
            <DrawerField label="Email" value={k.email} />
            <DrawerField label="Phone" value={k.phone} />
          </DrawerSection>

          <DrawerSection title="Location" icon={MapPin}>
            <DrawerField label="Address" value={k.address} />
            <DrawerField label="City" value={k.city} />
            <DrawerField label="State" value={k.state} />
            <DrawerField label="Pincode" value={k.pincode} />
          </DrawerSection>

          <DrawerSection title={`Cooking Area Setup Photos (${setupPhotos.length})`} icon={ShieldCheck}>
            {setupPhotos.length === 0 ? (
              <p className="font-nunito text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                No cooking area setup photos uploaded yet. (Min 2 required for approval)
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {setupPhotos.map((url, idx) => {
                    const mediaUrl = resolveMediaUrl(url)
                    return (
                      <a
                        key={url + idx}
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-[#e8e8e8] aspect-square bg-[#f0f0f0] relative group hover:opacity-90 transition-opacity"
                      >
                        <img src={mediaUrl} alt={`Setup ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-poppins font-bold text-white bg-emerald-700 rounded px-1.5 py-0.5 shadow-sm">
                          Setup {idx + 1}
                        </span>
                      </a>
                    )
                  })}
                </div>
                {setupPhotos.length >= 2 && (
                  <p className="font-nunito text-xs text-emerald-700 bg-emerald-50 rounded-md px-2 py-1 mt-2 font-medium">
                    ✅ {setupPhotos.length} setup photos verified & ready for review.
                  </p>
                )}
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Daily Hygiene Stories / Videos (24h)" icon={ShieldCheck}>
            {storiesLoading ? (
              <p className="font-nunito text-sm text-[#999]">Loading media...</p>
            ) : stories.length === 0 ? (
              <p className="font-nunito text-xs text-[#888] bg-[#f9f9f9] rounded-lg px-3 py-2">
                No active 24h daily story uploaded today.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {stories.map((s) => (
                  <a
                    key={s.id}
                    href={s.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-[#e8e8e8] aspect-video bg-[#f0f0f0]"
                  >
                    {s.mediaType === "video" ? (
                      <video src={s.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Compliance & KYC" icon={FileText}>
            <DrawerField label="FSSAI No." value={k.fssai_number || "—"} />
            {k.fssai_license ? (
              <a
                href={k.fssai_license}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-nunito text-primary hover:underline block mb-3"
              >
                <FileText size={14} /> View FSSAI license
              </a>
            ) : (
              <p className="font-nunito text-xs text-gray mt-1 mb-3">No FSSAI file uploaded</p>
            )}

            <div className="border-t border-[#f0f0f0] my-3" />

            <DrawerField label="Aadhaar No." value={k.aadhaar_number || "—"} />
            <div className="flex flex-col gap-2 mt-2">
              {k.aadhaar_card ? (
                <a
                  href={k.aadhaar_card}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-nunito text-primary hover:underline block"
                >
                  <FileText size={14} /> View Aadhaar Front
                </a>
              ) : (
                <p className="font-nunito text-xs text-gray">No Aadhaar Front uploaded</p>
              )}
              {k.aadhaar_card_back ? (
                <a
                  href={k.aadhaar_card_back}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-nunito text-primary hover:underline block"
                >
                  <FileText size={14} /> View Aadhaar Back
                </a>
              ) : (
                <p className="font-nunito text-xs text-gray">No Aadhaar Back uploaded</p>
              )}
            </div>

            <div className="border-t border-[#f0f0f0] my-3" />

            <DrawerField label="PAN No." value={k.pan_number || "—"} />
            {k.pan_card ? (
              <a
                href={k.pan_card}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-nunito text-primary hover:underline block"
              >
                <FileText size={14} /> View PAN Card
              </a>
            ) : (
              <p className="font-nunito text-xs text-gray mt-1">No PAN file uploaded</p>
            )}
          </DrawerSection>

          <DrawerSection title="Agreement Acceptance Log" icon={ShieldCheck}>
            <DrawerField label="Accepted" value={k.agreement_accepted_version ? "Yes" : "No"} />
            {k.agreement_accepted_version ? (
              <>
                <DrawerField label="Accepted Version" value={`v${k.agreement_accepted_version}.0`} />
                <DrawerField label="Accepted At" value={k.agreement_accepted_at_log ? new Date(k.agreement_accepted_at_log).toLocaleString("en-IN") : (k.agreement_accepted_at ? new Date(k.agreement_accepted_at).toLocaleString("en-IN") : "—")} />
                <DrawerField label="IP Address" value={k.agreement_ip || "—"} />
                <DrawerField label="Device" value={k.agreement_device || "—"} />
                <DrawerField label="App Version" value={k.agreement_app_version || "—"} />
              </>
            ) : null}
          </DrawerSection>

          {k.description && (
            <DrawerSection title="About" icon={Leaf}>
              <p className="font-nunito text-sm text-[#363636] leading-relaxed">{k.description}</p>
            </DrawerSection>
          )}

          <DrawerSection title="Timeline" icon={Calendar}>
            <DrawerField label="Submitted" value={new Date(k.submitted_at).toLocaleString("en-IN")} />
            <DrawerField label="Reviewed" value={k.reviewed_at ? new Date(k.reviewed_at).toLocaleString("en-IN") : "—"} />
          </DrawerSection>

          {k.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-poppins text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
              <p className="font-nunito text-sm text-red-800">{k.rejection_reason}</p>
            </div>
          )}
        </div>

        {(k.status === "pending" || k.status === "rejected") && (
          <div className="p-4 border-t border-[#e8e8e8] flex gap-3">
            <button
              onClick={onApprove}
              disabled={actionLoading || !canApprove}
              className="flex-1 py-3 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? "Approving..." : k.status === "rejected" ? "Re-Approve Kitchen" : "Approve Kitchen"}
            </button>
            {k.status === "pending" && (
              <button onClick={onReject} className="flex-1 py-3 rounded-lg border border-red-300 text-red-600 font-poppins font-semibold text-sm hover:bg-red-50 cursor-pointer">
                Reject
              </button>
            )}
          </div>
        )}

        <div className="p-4 border-t border-[#e8e8e8]">
          <button
            onClick={onDelete}
            disabled={actionLoading}
            className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 font-poppins text-sm font-semibold hover:bg-red-50 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Delete kitchen
          </button>
        </div>
      </div>
    </>
  )
}

function DrawerSection({ title, icon: Icon, children }) {
  return (
    <div>
      <h3 className="font-poppins text-xs font-semibold text-[#999] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Icon size={13} /> {title}
      </h3>
      <div className="space-y-2.5 bg-[#fafafa] rounded-lg p-4 border border-[#f0f0f0]">{children}</div>
    </div>
  )
}

function DrawerField({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
      <span className="font-nunito text-xs text-[#999] flex-shrink-0">{label}</span>
      <span className="font-nunito text-sm text-[#1c1c1c] font-medium sm:text-right break-words">{value || "—"}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  }
  return (
    <span className={cn("inline-block text-[10px] font-poppins font-semibold px-2 py-0.5 rounded capitalize", styles[status])}>
      {status}
    </span>
  )
}
