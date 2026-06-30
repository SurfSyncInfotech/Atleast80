import { useEffect, useState, useCallback } from "react"
import { Users, Search, Trash2, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const PAGE_SIZES = [10, 20, 50]

function VerifiedBadge({ verified }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full",
        verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
      )}
    >
      {verified ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
      {verified ? "Verified" : "Unverified"}
    </span>
  )
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
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

      const data = await api(`/api/admin/customers?${params}`, {}, "admin")
      setCustomers(data.customers || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 })
    } catch (err) {
      console.error(err)
      setCustomers([])
      setError(err.message || "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionId(deleteTarget.id)
    try {
      await api(`/api/admin/customers/${deleteTarget.id}`, { method: "DELETE" }, "admin")
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to delete customer")
    } finally {
      setActionId(null)
    }
  }

  const verifiedCount = customers.filter((c) => c.phoneVerified).length

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-poppins font-bold text-2xl text-[#1c1c1c] flex items-center gap-2">
              <Users size={24} className="text-primary" />
              Customers
            </h1>
            <p className="font-nunito text-[#696969] text-sm mt-1">
              All onboarded customers. Verified = completed first sign-in OTP.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-nunito text-[#696969]">
            <span>{pagination.total} total</span>
            {!loading && customers.length > 0 && (
              <span className="text-emerald-700">{verifiedCount} verified on this page</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
            {error}
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-4 flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#e8e8e8] font-nunito text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer"
          >
            Search
          </button>
        </form>

        {loading ? (
          <div className="bg-white border border-[#e8e8e8] p-8">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white border border-[#e8e8e8] p-12 text-center">
            <Users size={40} className="text-[#ddd] mx-auto mb-3" />
            <p className="font-nunito text-[#696969]">
              {error ? "Could not load customers." : "No customers registered yet."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e8e8e8] overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                  {["Name", "Email", "Phone", "Phone status", "Joined", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-poppins font-semibold text-[#696969] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]/80">
                    <td className="px-4 py-3 font-poppins font-semibold text-sm text-[#1c1c1c]">
                      {customer.name}
                    </td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636]">{customer.email}</td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <VerifiedBadge verified={customer.phoneVerified} />
                    </td>
                    <td className="px-4 py-3 font-nunito text-xs text-[#696969] whitespace-nowrap">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(customer)}
                        disabled={actionId === customer.id}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 text-[11px] font-poppins font-semibold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm font-nunito text-[#696969]">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-[#e8e8e8] px-2 py-1 bg-white text-sm"
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
                className="p-2 border border-[#e8e8e8] bg-white disabled:opacity-40 cursor-pointer hover:bg-[#fafafa]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-nunito text-sm text-[#696969] px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 border border-[#e8e8e8] bg-white disabled:opacity-40 cursor-pointer hover:bg-[#fafafa]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-md shadow-2xl border border-[#e8e8e8]">
            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Delete customer</h3>
            <p className="font-nunito text-[#696969] text-sm mt-2">
              Permanently delete <span className="font-semibold text-[#1c1c1c]">{deleteTarget.name}</span> (
              {deleteTarget.email})? Their orders and enquiries will also be removed.
            </p>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#e8e8e8] font-poppins text-sm cursor-pointer hover:bg-[#fafafa]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionId === deleteTarget.id}
                className="px-4 py-2 bg-red-600 text-white font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {actionId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
