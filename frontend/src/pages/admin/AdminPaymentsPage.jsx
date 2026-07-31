import { useState, useEffect } from "react"
import {
  Wallet,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Settings,
  AlertCircle,
  Building2,
  Bike,
  Check,
  X,
  FileSpreadsheet,
  IndianRupee,
  ShieldCheck,
  ChevronRight
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Transactions State
  const [transactions, setTransactions] = useState([])
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [txnSearch, setTxnSearch] = useState("")
  const [txnMethod, setTxnMethod] = useState("all")
  const [txnPage, setTxnPage] = useState(1)
  const [txnTotalPages, setTxnTotalPages] = useState(1)

  // Remittances State
  const [remittances, setRemittances] = useState([])
  const [loadingRemittances, setLoadingRemittances] = useState(false)
  const [verifyingId, setVerifyingId] = useState(null)

  // Settlements State
  const [settlementsData, setSettlementsData] = useState({ kitchenPayouts: [], riderPayouts: [], settlementsHistory: [] })
  const [loadingSettlements, setLoadingSettlements] = useState(false)
  const [payModal, setPayModal] = useState({ open: false, item: null, type: null })
  const [utrNumber, setUtrNumber] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [submittingPay, setSubmittingPay] = useState(false)

  // Settings State
  const [kitchenFreq, setKitchenFreq] = useState("weekly")
  const [riderFreq, setRiderFreq] = useState("weekly")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState("")

  const loadSummary = async () => {
    setLoadingSummary(true)
    try {
      const data = await api("/api/admin/payments/summary")
      setSummary(data.summary)
      setKitchenFreq(data.summary.kitchenPayoutFrequency || "weekly")
      setRiderFreq(data.summary.riderPayoutFrequency || "weekly")
    } catch (err) {
      console.error("Failed to load summary:", err)
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadTransactions = async () => {
    setLoadingTxns(true)
    try {
      const data = await api(`/api/admin/payments/transactions?page=${txnPage}&search=${encodeURIComponent(txnSearch)}&method=${txnMethod}`)
      setTransactions(data.transactions || [])
      setTxnTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      console.error("Failed to load transactions:", err)
    } finally {
      setLoadingTxns(false)
    }
  }

  const loadRemittances = async () => {
    setLoadingRemittances(true)
    try {
      const data = await api("/api/admin/payments/remittances")
      setRemittances(data.remittances || [])
    } catch (err) {
      console.error("Failed to load remittances:", err)
    } finally {
      setLoadingRemittances(false)
    }
  }

  const loadSettlements = async () => {
    setLoadingSettlements(true)
    try {
      const data = await api("/api/admin/payments/settlements")
      setSettlementsData(data)
    } catch (err) {
      console.error("Failed to load settlements:", err)
    } finally {
      setLoadingSettlements(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    if (activeTab === "overview") loadTransactions()
    if (activeTab === "remittances") loadRemittances()
    if (activeTab === "settlements") loadSettlements()
  }, [activeTab, txnPage, txnMethod])

  const handleVerifyRemittance = async (id, status) => {
    let rejectionReason = ""
    if (status === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this deposit request:")
      if (!rejectionReason) return
    }

    setVerifyingId(id)
    try {
      await api(`/api/admin/payments/remittances/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ status, rejectionReason }),
      })
      await loadRemittances()
      await loadSummary()
    } catch (err) {
      alert(err.message || "Failed to update remittance")
    } finally {
      setVerifyingId(null)
    }
  }

  const handleClearRiderCash = async (riderId) => {
    if (!window.confirm("Are you sure you want to clear this rider's Cash Holding balance?")) return
    try {
      await api(`/api/admin/payments/riders/${riderId}/clear-cash`, { method: "POST" })
      alert("Rider cash holding cleared successfully!")
      loadRemittances()
      loadSettlements()
    } catch (err) {
      alert(err.message || "Failed to clear rider cash holding")
    }
  }

  const handleRecordPayout = async (e) => {
    e.preventDefault()
    if (!utrNumber.trim()) {
      alert("Please enter Transaction UTR / Reference Number")
      return
    }

    setSubmittingPay(true)
    try {
      const item = payModal.item
      const isKitchen = payModal.type === "kitchen"
      await api("/api/admin/payments/settlements/pay", {
        method: "POST",
        body: JSON.stringify({
          entityType: payModal.type,
          entityId: isKitchen ? item.kitchenId : item.riderId,
          periodType: isKitchen ? kitchenFreq : riderFreq,
          grossAmount: isKitchen ? item.grossSales : item.totalDeliveryFees,
          commissionDeductions: isKitchen ? item.commissionDeduction : 0,
          netPayout: item.netPayout,
          utrNumber: utrNumber.trim(),
          notes: payNotes.trim() || undefined,
        }),
      })

      setPayModal({ open: false, item: null, type: null })
      setUtrNumber("")
      setPayNotes("")
      await loadSettlements()
      await loadSummary()
    } catch (err) {
      alert(err.message || "Failed to record payout")
    } finally {
      setSubmittingPay(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsSuccess("")
    try {
      await api("/api/admin/payments/settings", {
        method: "PUT",
        body: JSON.stringify({
          kitchenPayoutFrequency: kitchenFreq,
          riderPayoutFrequency: riderFreq,
        }),
      })
      setSettingsSuccess("Settlement frequencies updated successfully!")
      await loadSummary()
    } catch (err) {
      alert(err.message || "Failed to save settings")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-poppins font-bold text-2xl text-dark flex items-center gap-2.5">
              <Wallet className="text-primary" size={28} />
              Payment & Settlement Console
            </h1>
            <p className="font-nunito text-gray text-sm mt-0.5">
              Manage order transactions, rider EOD cash deposits, and periodic kitchen/rider payouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadSummary()
              if (activeTab === "overview") loadTransactions()
              if (activeTab === "remittances") loadRemittances()
              if (activeTab === "settlements") loadSettlements()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 font-poppins font-semibold text-xs text-dark hover:bg-gray-50 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loadingSummary ? "animate-spin text-primary" : ""} />
            Refresh Data
          </button>
        </div>

        {/* Overview Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Gross Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <IndianRupee size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-dark">
              ₹{summary?.totalRevenue?.toLocaleString("en-IN") || 0}
            </p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 font-nunito text-xs text-gray">
              <span>Online: <strong className="text-emerald-700">₹{summary?.onlineTotal || 0}</strong></span>
              <span>•</span>
              <span>COD: <strong className="text-amber-700">₹{summary?.codTotal || 0}</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Rider Cash Holding</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Banknote size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-blue-900">
              ₹{summary?.riderCashHolding?.toLocaleString("en-IN") || 0}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 font-nunito text-xs">
              <span className="text-gray">Pending Remittances:</span>
              <span className={cn("font-bold px-2 py-0.5 rounded-full text-[11px]", summary?.pendingRemittancesCount > 0 ? "bg-red-100 text-red-700 animate-pulse" : "bg-gray-100 text-gray-700")}>
                {summary?.pendingRemittancesCount || 0} Rider Deposits
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Paid Payouts</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-purple-900">
              ₹{summary?.paidPayoutsTotal?.toLocaleString("en-IN") || 0}
            </p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 font-nunito text-xs text-gray">
              <span>Settled via UTR transfer</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Settlement Settings</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Calendar size={20} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-poppins font-bold text-sm text-dark">
                Kitchens: <span className="text-primary capitalize">{summary?.kitchenPayoutFrequency || "weekly"}</span>
              </p>
              <p className="font-poppins font-bold text-sm text-dark">
                Riders: <span className="text-blue-600 capitalize">{summary?.riderPayoutFrequency || "weekly"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className="mt-3 text-xs font-poppins font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              Change Frequencies <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-sm flex flex-wrap gap-1">
          {[
            { id: "overview", label: "Transactions & Audit Log", icon: CreditCard },
            { id: "remittances", label: "Rider EOD Cash Remittances", icon: Banknote, badge: summary?.pendingRemittancesCount },
            { id: "settlements", label: "Kitchen & Rider Settlements", icon: Wallet },
            { id: "settings", label: "Settlement Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-poppins font-semibold text-xs transition-all cursor-pointer",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray hover:bg-gray-50 hover:text-dark"
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", active ? "bg-white text-primary" : "bg-red-500 text-white")}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: TRANSACTIONS & AUDIT LOG */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <h2 className="font-poppins font-bold text-lg text-dark">Order Transactions Audit Log</h2>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                  <input
                    type="text"
                    value={txnSearch}
                    onChange={(e) => setTxnSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadTransactions()}
                    placeholder="Search order no, kitchen, customer..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 font-nunito text-xs focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <select
                  value={txnMethod}
                  onChange={(e) => {
                    setTxnMethod(e.target.value)
                    setTxnPage(1)
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 font-nunito text-xs bg-white text-dark focus:outline-none"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="online">Online (UPI / Gateway)</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>
            </div>

            {loadingTxns ? (
              <div className="text-center py-16">
                <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                <p className="font-nunito text-xs text-gray">Loading transaction audit log...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 bg-gray-50/50 rounded-xl">
                <CreditCard size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="font-nunito text-gray text-sm">No transaction records found matching filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                      <th className="py-3 px-4">Order Details</th>
                      <th className="py-3 px-4">Kitchen</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Rider</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Grand Total</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-poppins font-bold text-dark">{t.orderNumber}</p>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize inline-block mt-0.5", t.status === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800")}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-dark">{t.kitchenName}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-dark">{t.customerName}</p>
                          <p className="text-gray text-[11px]">{t.customerPhone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-dark">{t.riderName}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn("font-poppins font-bold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wide", t.paymentMethod === "online" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200")}>
                            {t.paymentMethod === "online" ? "UPI Online" : "COD Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-poppins font-bold text-sm text-primary">₹{t.grandTotal}</td>
                        <td className="py-3.5 px-4 text-gray">{t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: RIDER EOD CASH REMITTANCES */}
        {/* ========================================================= */}
        {activeTab === "remittances" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="font-poppins font-bold text-lg text-dark">Rider EOD Cash Remittances</h2>
                <p className="font-nunito text-xs text-gray">Riders deposit collected COD cash to Admin UPI QR and submit UTR reference here.</p>
              </div>
            </div>

            {loadingRemittances ? (
              <div className="text-center py-16">
                <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                <p className="font-nunito text-xs text-gray">Loading remittances...</p>
              </div>
            ) : remittances.length === 0 ? (
              <div className="text-center py-16 bg-gray-50/50 rounded-xl">
                <Banknote size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="font-nunito text-gray text-sm">No rider cash deposits recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                      <th className="py-3 px-4">Rider Details</th>
                      <th className="py-3 px-4">Deposit Amount</th>
                      <th className="py-3 px-4">Current Cash Holding</th>
                      <th className="py-3 px-4">UTR Reference</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Submitted Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                    {remittances.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-poppins font-bold text-dark">{r.riderName}</p>
                          <p className="text-gray text-[11px]">{r.riderPhone}</p>
                        </td>
                        <td className="py-3.5 px-4 font-poppins font-bold text-emerald-700 text-sm">₹{r.amount}</td>
                        <td className="py-3.5 px-4 font-poppins font-bold text-amber-700">₹{r.currentHolding}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-dark">{r.utrNumber || "N/A"}</td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "font-poppins font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide",
                            r.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                            r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800 animate-pulse"
                          )}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}</td>
                        <td className="py-3.5 px-4 text-right">
                          {r.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerifyRemittance(r.id, "approved")}
                                disabled={verifyingId === r.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-poppins font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-sm"
                              >
                                Approve & Clear Cash
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerifyRemittance(r.id, "rejected")}
                                disabled={verifyingId === r.id}
                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-poppins font-bold text-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray text-xs font-semibold">Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KITCHEN & RIDER SETTLEMENTS */}
        {/* ========================================================= */}
        {activeTab === "settlements" && (
          <div className="space-y-6">
            {/* Kitchen Settlements Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="font-poppins font-bold text-lg text-dark flex items-center gap-2">
                    <Building2 size={20} className="text-primary" /> Kitchen Payout Settlements ({kitchenFreq.toUpperCase()})
                  </h2>
                  <p className="font-nunito text-xs text-gray">Net payout after 10% platform commission and Rider delivery fee deduction.</p>
                </div>
              </div>

              {loadingSettlements ? (
                <div className="text-center py-12">
                  <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                        <th className="py-3 px-4">Kitchen</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Owner Contact</th>
                        <th className="py-3 px-4">Gross Sales</th>
                        <th className="py-3 px-4">Comm. (10%)</th>
                        <th className="py-3 px-4">Rider Fee</th>
                        <th className="py-3 px-4">Net Payable Payout</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                      {settlementsData.kitchenPayouts.map((k) => (
                        <tr key={k.kitchenId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-poppins font-bold text-dark">{k.kitchenName}</td>
                          <td className="py-3.5 px-4 text-gray">{k.city}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-dark">{k.ownerName}</p>
                            <p className="text-gray text-[11px]">{k.ownerPhone}</p>
                          </td>
                          <td className="py-3.5 px-4 font-poppins font-bold text-dark">₹{k.grossSales}</td>
                          <td className="py-3.5 px-4 font-poppins font-semibold text-red-600">-₹{k.commissionDeduction}</td>
                          <td className="py-3.5 px-4 font-poppins font-semibold text-red-600">-₹{k.riderFeeDeduction || 0}</td>
                          <td className="py-3.5 px-4 font-poppins font-bold text-emerald-700 text-sm">₹{k.netPayout}</td>
                          <td className="py-3.5 px-4 text-right">
                            {k.netPayout > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayModal({ open: true, item: k, type: "kitchen" })
                                  setUtrNumber("")
                                  setPayNotes("")
                                }}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white font-poppins font-bold text-xs hover:bg-primary-dark cursor-pointer shadow-sm"
                              >
                                Mark as Paid
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-500 font-poppins font-semibold text-xs">
                                <CheckCircle size={13} className="text-emerald-600" /> Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rider Settlements Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="font-poppins font-bold text-lg text-dark flex items-center gap-2">
                    <Bike size={20} className="text-blue-600" /> Rider Delivery Fee Settlements ({riderFreq.toUpperCase()})
                  </h2>
                  <p className="font-nunito text-xs text-gray">Accumulated delivery fee earnings to be transferred to riders.</p>
                </div>
              </div>

              {loadingSettlements ? (
                <div className="text-center py-12">
                  <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                        <th className="py-3 px-4">Rider</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Completed Deliveries</th>
                        <th className="py-3 px-4">Delivery Fees Earned</th>
                        <th className="py-3 px-4">Unsettled Cash Holding</th>
                        <th className="py-3 px-4">Net Payout</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                      {settlementsData.riderPayouts.map((r) => (
                        <tr key={r.riderId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-poppins font-bold text-dark">{r.riderName}</td>
                          <td className="py-3.5 px-4 text-gray">{r.riderPhone}</td>
                          <td className="py-3.5 px-4 font-semibold text-dark">{r.completedDeliveries}</td>
                          <td className="py-3.5 px-4 font-poppins font-bold text-dark">₹{r.totalDeliveryFees}</td>
                          <td className="py-3.5 px-4 font-poppins font-semibold text-amber-700">
                            ₹{r.cashHolding}
                            {r.cashHolding > 0 && (
                              <button
                                type="button"
                                onClick={() => handleClearRiderCash(r.riderId)}
                                className="ml-2 text-[10px] font-poppins font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer"
                                title="Clear cash holding received by Admin"
                              >
                                Clear Cash
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-poppins font-bold text-blue-700 text-sm">₹{r.netPayout}</td>
                          <td className="py-3.5 px-4 text-right">
                            {r.netPayout > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayModal({ open: true, item: r, type: "rider" })
                                  setUtrNumber("")
                                  setPayNotes("")
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-poppins font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-sm"
                              >
                                Mark as Paid
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-500 font-poppins font-semibold text-xs">
                                <CheckCircle size={13} className="text-emerald-600" /> Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paid Settlements History Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-poppins font-bold text-base text-dark">Settlements History Ledger</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Paid</th>
                      <th className="py-3 px-4">UTR Reference</th>
                      <th className="py-3 px-4">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                    {settlementsData.settlementsHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray text-xs">No historical payout records yet.</td>
                      </tr>
                    ) : (
                      settlementsData.settlementsHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-poppins font-bold text-dark">{h.entityName}</td>
                          <td className="py-3 px-4">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", h.entityType === "kitchen" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>
                              {h.entityType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-dark font-semibold">₹{h.grossAmount}</td>
                          <td className="py-3 px-4 text-red-600">-₹{h.commissionDeductions}</td>
                          <td className="py-3 px-4 font-poppins font-bold text-emerald-700">₹{h.netPayout}</td>
                          <td className="py-3 px-4 font-mono font-bold text-dark">{h.utrNumber}</td>
                          <td className="py-3 px-4 text-gray">{h.paidAt ? new Date(h.paidAt).toLocaleString("en-IN") : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SETTLEMENT SETTINGS */}
        {/* ========================================================= */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl space-y-6">
            <div>
              <h2 className="font-poppins font-bold text-lg text-dark flex items-center gap-2">
                <Settings size={22} className="text-primary" /> Flexible Settlement Frequency Configuration
              </h2>
              <p className="font-nunito text-xs text-gray mt-1">
                Configure payout cycles for Kitchen Partners and Delivery Riders independently (Daily, Weekly, or Monthly).
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 font-nunito text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle size={16} />
                {settingsSuccess}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Kitchen Payout Frequency */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                <label className="font-poppins font-bold text-sm text-dark block flex items-center gap-2">
                  <Building2 size={16} className="text-primary" /> Kitchen Payout Cycle
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "daily", label: "Daily", desc: "Every night" },
                    { value: "weekly", label: "Weekly", desc: "Every Monday" },
                    { value: "monthly", label: "Monthly", desc: "1st of month" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setKitchenFreq(opt.value)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all cursor-pointer",
                        kitchenFreq === opt.value
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white text-dark border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <p className="font-poppins font-bold text-xs">{opt.label}</p>
                      <p className={cn("font-nunito text-[10px] mt-0.5", kitchenFreq === opt.value ? "text-white/80" : "text-gray")}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rider Payout Frequency */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                <label className="font-poppins font-bold text-sm text-dark block flex items-center gap-2">
                  <Bike size={16} className="text-blue-600" /> Rider Payout Cycle
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "daily", label: "Daily", desc: "Every night" },
                    { value: "weekly", label: "Weekly", desc: "Every Tuesday" },
                    { value: "monthly", label: "Monthly", desc: "1st of month" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiderFreq(opt.value)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all cursor-pointer",
                        riderFreq === opt.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-dark border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <p className="font-poppins font-bold text-xs">{opt.label}</p>
                      <p className={cn("font-nunito text-[10px] mt-0.5", riderFreq === opt.value ? "text-white/80" : "text-gray")}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 rounded-xl bg-primary text-white font-poppins font-bold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {savingSettings ? "Saving Settings..." : "Save Settlement Frequencies"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Pay Settlement Modal */}
      {payModal.open && payModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-poppins font-bold text-dark text-base">Record Payout Settlement</h3>
                <p className="font-nunito text-xs text-gray">
                  Paying {payModal.type === "kitchen" ? payModal.item.kitchenName : payModal.item.riderName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModal({ open: false, item: null, type: null })}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayout} className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <span className="font-nunito text-xs text-emerald-900 font-semibold">Net Payout Amount:</span>
                <span className="font-poppins font-bold text-2xl text-emerald-700">₹{payModal.item.netPayout}</span>
              </div>

              <div>
                <label className="font-nunito text-xs font-semibold text-dark block mb-1">Transaction UTR / Reference No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 329182749102"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono font-bold text-dark text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>

              <div>
                <label className="font-nunito text-xs font-semibold text-dark block mb-1">Notes / Remarks (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Weekly settlement via NEFT"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-nunito text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModal({ open: false, item: null, type: null })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-poppins font-semibold text-sm text-gray hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
                >
                  {submittingPay ? "Recording..." : "Confirm & Save Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
