import { useEffect, useState, useCallback } from "react"
import { 
  Users, 
  Search, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  Ban, 
  Play, 
  Pause,
  ChefHat,
  Truck,
  Filter
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const PAGE_SIZES = [10, 20, 50]

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    suspended: "bg-amber-100 text-amber-800 border-amber-200",
    blocked: "bg-rose-100 text-rose-800 border-rose-200",
  }
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-poppins font-medium border capitalize",
      styles[status] || styles.active
    )}>
      {status}
    </span>
  )
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState("customer") // customer, kitchen, rider
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  
  // Modals / Confirmations
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null) // { user, nextStatus }
  const [error, setError] = useState("")

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true)
      setError("")
    }
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        role: activeTab,
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const data = await api(`/api/admin/users?${params}`, {}, "admin")
      setUsers(data.users || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 })
    } catch (err) {
      console.error(err)
      if (showSpinner) {
        setUsers([])
        setError(err.message || "Failed to load users list")
      }
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, activeTab])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!deleteTarget && !statusTarget && !actionId) loadData(false)
    }, 3000)
    return () => clearInterval(interval)
  }, [loadData, deleteTarget, statusTarget, actionId])

  // Reset page when search or tab changes
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, activeTab, pageSize])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionId(deleteTarget.id)
    try {
      await api(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" }, "admin")
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to delete user")
    } finally {
      setActionId(null)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget) return
    const { user, nextStatus } = statusTarget
    setActionId(user.id)
    try {
      await api(
        `/api/admin/users/${user.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
        "admin"
      )
      setStatusTarget(null)
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to update user status")
    } finally {
      setActionId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-poppins font-bold text-2xl text-[#1c1c1c] flex items-center gap-2">
              <Users size={24} className="text-primary" />
              User Directory
            </h1>
            <p className="font-nunito text-[#696969] text-sm mt-1">
              Manage accounts, check verification status, suspend, block or delete users.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-nunito text-[#696969]">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-[#e8e8e8] shadow-sm font-semibold">
              {pagination.total} Total {activeTab}s
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#e8e8e8] mb-6 gap-2 bg-[#f8f8f8] p-1.5 rounded-xl max-w-md shadow-inner">
          <button
            onClick={() => setActiveTab("customer")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-poppins text-xs font-semibold cursor-pointer transition-all duration-200",
              activeTab === "customer" 
                ? "bg-white text-primary shadow-sm" 
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <Users size={14} />
            Customers
          </button>
          <button
            onClick={() => setActiveTab("kitchen")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-poppins text-xs font-semibold cursor-pointer transition-all duration-200",
              activeTab === "kitchen" 
                ? "bg-white text-primary shadow-sm" 
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <ChefHat size={14} />
            Kitchens
          </button>
          <button
            onClick={() => setActiveTab("rider")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-poppins text-xs font-semibold cursor-pointer transition-all duration-200",
              activeTab === "rider" 
                ? "bg-white text-primary shadow-sm" 
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <Truck size={14} />
            Riders
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito animate-shake">
            {error}
          </div>
        )}

        {/* Filters and search */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="w-full md:max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${activeTab} by name, email, phone...`}
                className="w-full pl-9 pr-3 py-2.5 bg-[#f8f8f8] rounded-xl font-nunito border border-transparent focus:outline-none focus:border-primary/40 focus:bg-white text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0a1f13] text-white font-poppins font-semibold text-sm rounded-xl hover:bg-black transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-[#f8f8f8] px-3 py-2.5 rounded-xl border border-[#e8e8e8] text-sm text-[#333]">
              <Filter size={14} className="text-[#696969]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-poppins font-semibold focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="bg-white border border-[#e8e8e8] rounded-2xl p-8 shadow-sm">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-[#e8e8e8] rounded-2xl p-16 text-center shadow-sm">
            <Users size={44} className="text-[#ddd] mx-auto mb-3" />
            <p className="font-poppins font-semibold text-base text-[#1c1c1c]">No users found</p>
            <p className="font-nunito text-[#696969] text-sm mt-1">Try refining your search query or filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                    <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">User Details</th>
                    <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Role</th>
                    {activeTab === "kitchen" && (
                      <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Kitchen Details</th>
                    )}
                    {activeTab === "rider" && (
                      <>
                        <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Vehicle</th>
                        <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Cash Dues</th>
                      </>
                    )}
                    <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">System Status</th>
                    <th className="px-5 py-4 text-left text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Joined Date</th>
                    <th className="px-5 py-4 text-right text-[11px] font-poppins font-semibold text-[#696969] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#fafafa]/60 transition-colors">
                      
                      {/* User Info */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-poppins font-bold text-sm text-[#1c1c1c]">{user.name}</span>
                          <span className="font-nunito text-xs text-[#696969] mt-0.5">{user.email}</span>
                          <span className="font-nunito text-xs text-[#696969]">{user.phone || "No Phone"}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-poppins font-semibold border bg-gray-50 border-gray-200 capitalize">
                          {activeTab === "customer" && <Users size={12} className="text-blue-500" />}
                          {activeTab === "kitchen" && <ChefHat size={12} className="text-orange-500" />}
                          {activeTab === "rider" && <Truck size={12} className="text-emerald-500" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Kitchen Details Column */}
                      {activeTab === "kitchen" && (
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-poppins font-semibold text-xs text-[#363636]">{user.kitchen_name || "—"}</span>
                            <span className="font-nunito text-[11px] text-[#696969] mt-0.5">City: {user.city || "—"}</span>
                            <span className="font-nunito text-[11px] text-[#696969] mt-0.5 capitalize">Status: {user.kitchen_status || "—"}</span>
                          </div>
                        </td>
                      )}

                      {/* Rider Specific Columns */}
                      {activeTab === "rider" && (
                        <>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="font-poppins font-semibold text-xs text-[#363636] capitalize">{user.vehicle_type || "—"}</span>
                              <span className="font-nunito text-[11px] text-[#696969] mt-0.5">{user.is_online ? "🟢 Online" : "⚫ Offline"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-nunito text-sm font-semibold text-[#1c1c1c]">
                            ₹{Number(user.cash_collected || 0).toFixed(2)}
                          </td>
                        </>
                      )}

                      {/* System Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 font-nunito text-xs text-[#696969]">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.status !== "active" ? (
                            <button
                              type="button"
                              onClick={() => setStatusTarget({ user, nextStatus: "active" })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-poppins font-semibold rounded-lg hover:bg-emerald-100 cursor-pointer"
                            >
                              <Play size={12} />
                              Unsuspend
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setStatusTarget({ user, nextStatus: "suspended" })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-poppins font-semibold rounded-lg hover:bg-amber-100 cursor-pointer"
                              >
                                <Pause size={12} />
                                Suspend
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusTarget({ user, nextStatus: "blocked" })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-poppins font-semibold rounded-lg hover:bg-rose-100 cursor-pointer"
                              >
                                <Ban size={12} />
                                Block
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-[#e8e8e8] bg-[#fafafa]">
                <div className="flex items-center gap-2 text-sm font-nunito text-[#696969]">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border border-[#e8e8e8] px-2.5 py-1.5 bg-white text-xs font-poppins rounded-lg"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 border border-[#e8e8e8] bg-white rounded-lg disabled:opacity-40 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-nunito text-xs font-semibold text-[#696969] px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-1.5 border border-[#e8e8e8] bg-white rounded-lg disabled:opacity-40 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 w-full max-w-md rounded-2xl shadow-xl border border-[#e8e8e8] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Delete user account?</h3>
            <p className="font-nunito text-[#696969] text-sm mt-2 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-semibold text-[#1c1c1c]">{deleteTarget.name}</span> (
              {deleteTarget.email || "no email"})? 
              <br />
              <strong className="text-red-600">This action is irreversible.</strong> All associated profiles (kitchens, riders), orders, reviews, and logs will be permanently deleted due to cascading constraints.
            </p>
            <div className="flex gap-2.5 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#e8e8e8] font-poppins rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionId === deleteTarget.id}
                className="px-5 py-2 bg-red-600 text-white font-poppins font-semibold text-sm rounded-xl hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {actionId === deleteTarget.id ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modification Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 w-full max-w-md rounded-2xl shadow-xl border border-[#e8e8e8] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c] capitalize">
              {statusTarget.nextStatus} User Account?
            </h3>
            <p className="font-nunito text-[#696969] text-sm mt-2 leading-relaxed">
              Confirm changing <span className="font-semibold text-[#1c1c1c]">{statusTarget.user.name}</span>'s system status to <span className="font-semibold capitalize text-[#1c1c1c]">{statusTarget.nextStatus}</span>?
              <br />
              {statusTarget.nextStatus !== "active" && (
                <span className="text-amber-600">The user will be immediately logged out and forbidden from logging in or placing/accepting orders.</span>
              )}
            </p>
            <div className="flex gap-2.5 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 border border-[#e8e8e8] font-poppins rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={actionId === statusTarget.user.id}
                className="px-5 py-2 bg-[#0a1f13] text-white font-poppins font-semibold text-sm rounded-xl hover:bg-black disabled:opacity-50 cursor-pointer transition-colors"
              >
                {actionId === statusTarget.user.id ? "Updating..." : `Confirm ${statusTarget.nextStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
