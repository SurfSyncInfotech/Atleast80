import { useEffect, useState, useCallback } from "react"
import { Truck, Search, Eye, CheckCircle, XCircle, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight, X, Phone, Mail, FileText, ExternalLink } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const PAGE_SIZES = [10, 20, 50]

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-poppins font-semibold px-2.5 py-0.5 rounded-full uppercase",
        status === "active"
          ? "bg-emerald-100 text-emerald-700"
          : status === "pending"
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-700"
      )}
    >
      {status === "active" ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
      {status}
    </span>
  )
}

export default function AdminRidersPage() {
  const [riders, setRiders] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [selectedRider, setSelectedRider] = useState(null)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)

      const data = await api(`/api/admin/riders?${params}`, {}, "admin")
      setRiders(data.riders || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 })
    } catch (err) {
      console.error(err)
      setRiders([])
      setError(err.message || "Failed to load riders list")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, pageSize])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleApprove = async (id) => {
    setActionId(id)
    try {
      await api(`/api/admin/riders/${id}/approve`, { method: "PATCH" }, "admin")
      if (selectedRider?.id === id) {
        setSelectedRider((prev) => ({ ...prev, status: "active" }))
      }
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to approve rider")
    } finally {
      setActionId(null)
    }
  }

  const handleSuspend = async (id) => {
    setActionId(id)
    try {
      await api(`/api/admin/riders/${id}/suspend`, { method: "PATCH" }, "admin")
      if (selectedRider?.id === id) {
        setSelectedRider((prev) => ({ ...prev, status: "suspended" }))
      }
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to suspend rider")
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
              <Truck size={24} className="text-primary" />
              Delivery Partners (Riders)
            </h1>
            <p className="font-nunito text-[#696969] text-sm mt-1">
              Verify, activate, or suspend delivery rider accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-nunito text-[#696969]">
            <span>{pagination.total} riders total</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg border border-[#e8e8e8] p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, phone, email..."
                className="w-full pl-9 pr-4 py-2 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 focus:bg-white"
              />
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 cursor-pointer"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-lg border border-[#e8e8e8] overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : riders.length === 0 ? (
            <div className="py-16 text-center">
              <Truck size={36} className="text-[#ddd] mx-auto mb-3" />
              <p className="font-poppins font-medium text-[#1c1c1c]">No riders found</p>
              <p className="font-nunito text-sm text-[#999] mt-1">Try changing your search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f0f0f0] bg-[#fdfdfd] text-[#696969] text-xs font-poppins font-bold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Today's Orders</th>
                    <th className="p-4">Today's Cash</th>
                    <th className="p-4">Today's Handover</th>
                    <th className="p-4">Dues (Cash)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] font-nunito text-sm text-[#1c1c1c]">
                  {riders.map((r) => (
                    <tr key={r.id} className="hover:bg-[#fafafa]">
                      <td className="p-4 font-poppins font-semibold">
                        <div>
                          <div className="font-bold">{r.name}</div>
                          <div className="text-[10px] text-[#999] capitalize">{r.vehicle_type} ({r.vehicle_number || "—"})</div>
                        </div>
                      </td>
                      <td className="p-4">{r.phone || "—"}</td>
                      <td className="p-4">
                        <div className="font-poppins font-bold">{r.today_orders_count || 0}</div>
                        <div className="text-[10px] text-emerald-600">₹{r.today_earnings || 0} earn</div>
                      </td>
                      <td className="p-4 font-bold text-amber-700">₹{r.today_cash_collected || 0}</td>
                      <td className="p-4 font-bold text-emerald-700">₹{r.today_cash_handover || 0}</td>
                      <td className="p-4 font-bold text-red-600">₹{r.cash_collected || 0}</td>
                      <td className="p-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRider(r)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray cursor-pointer"
                            title="View KYC & Info"
                          >
                            <Eye size={16} />
                          </button>
                          {r.status !== "active" ? (
                          <button
                            disabled={actionId === r.id}
                            onClick={() => handleApprove(r.id)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 cursor-pointer"
                            title="Approve Rider"
                          >
                            <CheckCircle size={16} />
                          </button>
                        ) : (
                          <button
                            disabled={actionId === r.id}
                            onClick={() => handleSuspend(r.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                            title="Suspend Rider"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-[#f0f0f0] flex items-center justify-between">
              <span className="font-nunito text-xs text-[#999]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded hover:bg-gray-100 text-gray disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded hover:bg-gray-100 text-gray disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail view Side Drawer */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => setSelectedRider(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#e8e8e8] flex items-center justify-between">
              <div>
                <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Rider KYC & Application</h3>
                <p className="font-nunito text-xs text-[#999] mt-0.5">ID: {selectedRider.id}</p>
              </div>
              <button onClick={() => setSelectedRider(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-poppins font-bold text-lg">
                  {selectedRider.name[0]}
                </div>
                <div>
                  <h4 className="font-poppins font-semibold text-base text-[#1c1c1c]">{selectedRider.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedRider.status} />
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-3">
                <h5 className="font-poppins font-bold text-xs text-[#999] uppercase tracking-wider">Contact Info</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-[#fdfdfd] border border-[#f0f0f0] rounded-lg p-3">
                    <Phone size={14} className="text-gray" />
                    <span className="font-nunito text-sm text-[#1c1c1c] truncate">{selectedRider.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#fdfdfd] border border-[#f0f0f0] rounded-lg p-3">
                    <Mail size={14} className="text-gray" />
                    <span className="font-nunito text-sm text-[#1c1c1c] truncate">{selectedRider.email || "No Email"}</span>
                  </div>
                </div>
              </div>

              {/* Daily & Lifetime Performance Stats */}
              <div className="space-y-4">
                <h5 className="font-poppins font-bold text-xs text-[#999] uppercase tracking-wider">Earnings & Cash Activity</h5>
                
                {/* Daily Metrics */}
                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-poppins font-bold text-[#0369a1] uppercase tracking-wider">Today's Activity</div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#0369a1]">Completed Orders:</span>
                    <span className="font-poppins font-bold text-[#0369a1]">{selectedRider.today_orders_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#0369a1]">Earnings (Fee):</span>
                    <span className="font-poppins font-bold text-[#0369a1]">₹{selectedRider.today_earnings || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#0369a1]">COD Cash Collected:</span>
                    <span className="font-poppins font-bold text-[#0369a1]">₹{selectedRider.today_cash_collected || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#0369a1]">EOD Cash Handed Over:</span>
                    <span className="font-poppins font-bold text-emerald-700">₹{selectedRider.today_cash_handover || 0}</span>
                  </div>
                </div>

                {/* Lifetime Metrics */}
                <div className="bg-gray-50 border border-[#e8e8e8] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-poppins font-bold text-[#666] uppercase tracking-wider">Lifetime Stats</div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Total Deliveries:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c]">{selectedRider.total_orders_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Total Earnings:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c]">₹{selectedRider.total_earnings || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Pending Cash Balance:</span>
                    <span className="font-poppins font-bold text-amber-700">₹{selectedRider.cash_collected || 0}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle & KYC */}
              <div className="space-y-4">
                <h5 className="font-poppins font-bold text-xs text-[#999] uppercase tracking-wider">Vehicle & ID Information</h5>
                <div className="bg-[#fdfdfd] border border-[#f0f0f0] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Vehicle Type:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c] capitalize">{selectedRider.vehicle_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Vehicle Number:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c] uppercase">{selectedRider.vehicle_number || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Driving License No:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c] uppercase">{selectedRider.driving_license_number || "—"}</span>
                  </div>
                  <div className="h-[1px] bg-[#f0f0f0] my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">Aadhaar Number:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c]">{selectedRider.aadhaar_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-nunito text-[#696969]">PAN Number:</span>
                    <span className="font-poppins font-bold text-[#1c1c1c] uppercase">{selectedRider.pan_number}</span>
                  </div>
                </div>
              </div>

              {/* Document File Links */}
              <div className="space-y-3">
                <h5 className="font-poppins font-bold text-xs text-[#999] uppercase tracking-wider">Uploaded Documents</h5>
                <div className="grid grid-cols-1 gap-2.5">
                  <a
                    href={selectedRider.aadhaar_card}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 bg-white border border-[#e8e8e8] rounded-xl hover:border-primary transition-colors text-dark font-nunito text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      Aadhaar Card (Front)
                    </span>
                    <ExternalLink size={14} className="text-gray" />
                  </a>

                  <a
                    href={selectedRider.aadhaar_card_back}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 bg-white border border-[#e8e8e8] rounded-xl hover:border-primary transition-colors text-dark font-nunito text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      Aadhaar Card (Back)
                    </span>
                    <ExternalLink size={14} className="text-gray" />
                  </a>

                  <a
                    href={selectedRider.pan_card}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 bg-white border border-[#e8e8e8] rounded-xl hover:border-primary transition-colors text-dark font-nunito text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      PAN Card Document
                    </span>
                    <ExternalLink size={14} className="text-gray" />
                  </a>

                  {selectedRider.vehicle_type !== "bicycle" && selectedRider.driving_license && (
                    <a
                      href={selectedRider.driving_license}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 bg-white border border-[#e8e8e8] rounded-xl hover:border-primary transition-colors text-dark font-nunito text-sm font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        Driving License Document
                      </span>
                      <ExternalLink size={14} className="text-gray" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-5 border-t border-[#e8e8e8] bg-gray-50 flex items-center justify-end gap-2.5">
              {selectedRider.status !== "active" ? (
                <button
                  disabled={actionId === selectedRider.id}
                  onClick={() => handleApprove(selectedRider.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-poppins font-bold text-xs text-white uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                >
                  Approve Application
                </button>
              ) : (
                <button
                  disabled={actionId === selectedRider.id}
                  onClick={() => handleSuspend(selectedRider.id)}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 font-poppins font-bold text-xs text-white uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                >
                  Suspend Partner
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
