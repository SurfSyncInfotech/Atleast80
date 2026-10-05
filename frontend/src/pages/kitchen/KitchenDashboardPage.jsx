import { useEffect, useState, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Clock, CheckCircle, XCircle, RefreshCw,
  Star, ShoppingBag, IndianRupee, UtensilsCrossed,
  ChevronRight, Circle,
} from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import KitchenHomeImageSection from "../../components/kitchen/KitchenHomeImageSection"
import HygieneUploadSection from "../../components/kitchen/HygieneUploadSection"
import HygieneRecordSection from "../../components/kitchen/HygieneRecordSection"
import PayoutSettingsSection from "../../components/kitchen/PayoutSettingsSection"
import FestivalSpecialsSection from "../../components/kitchen/FestivalSpecialsSection"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const kitchenTypeLabel = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

const onboardingSteps = [
  { key: "register", label: "Application submitted" },
  { key: "home", label: "Upload home image & setup photos" },
  { key: "review", label: "Admin review" },
  { key: "approved", label: "Go live on Atleast80" },
]

export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { kitchen, refreshKitchen } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [menuCount, setMenuCount] = useState(null)
  const [orderStats, setOrderStats] = useState({ todayOrders: 0, todayRevenue: 0, activeOrders: 0 })
  const [payoutsModalOpen, setPayoutsModalOpen] = useState(false)
  const [payoutsList, setPayoutsList] = useState([])
  const [loadingPayouts, setLoadingPayouts] = useState(false)

  const openPayoutsModal = async () => {
    setPayoutsModalOpen(true)
    setLoadingPayouts(true)
    try {
      const data = await api("/api/kitchens/me/payouts", {}, "kitchen")
      setPayoutsList(data.payouts || [])
    } catch (err) {
      console.error("Failed to load payouts:", err)
    } finally {
      setLoadingPayouts(false)
    }
  }

  useEffect(() => { refreshKitchen().catch(() => {}) }, [refreshKitchen])

  const loadMenuCount = useCallback(() => {
    if (kitchen?.status !== "approved") return Promise.resolve()
    return api("/api/menu/me", {}, "kitchen")
      .then((d) => setMenuCount((d.items || []).length))
      .catch(() => setMenuCount(0))
  }, [kitchen?.status])

  const loadOrderStats = useCallback(() => {
    if (kitchen?.status !== "approved") return Promise.resolve()
    return api("/api/orders/kitchen/stats", {}, "kitchen")
      .then((d) => setOrderStats(d))
      .catch(() => setOrderStats({ todayOrders: 0, todayRevenue: 0, activeOrders: 0 }))
  }, [kitchen?.status])

  useEffect(() => {
    loadMenuCount()
    loadOrderStats()
    if (kitchen?.status !== "approved") return
    const interval = setInterval(() => {
      loadOrderStats()
    }, 4000)
    return () => clearInterval(interval)
  }, [loadMenuCount, loadOrderStats, kitchen?.status])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshKitchen()
      await loadMenuCount()
      await loadOrderStats()
    } finally {
      setRefreshing(false)
    }
  }

  const firstName = kitchen?.owner_name?.split(" ")[0] || "Partner"

  const status = kitchen?.status || "pending"
  const isApproved = status === "approved"
  const isPending = status === "pending"
  const isRejected = status === "rejected"
  const hasHomeImage = Boolean(kitchen?.cover_image || kitchen?.cover)
  const hasCookingPhotos = (kitchen?.kitchenImages?.length || 0) >= 2
  const currentStep = isApproved
    ? 4
    : isRejected
    ? 3
    : isPending && hasHomeImage && hasCookingPhotos
    ? 3
    : isPending
    ? 2
    : 1

  const isNewSignup = location.state?.newSignup

  const [resubmitting, setResubmitting] = useState(false)
  const [resubmitMessage, setResubmitMessage] = useState("")

  const handleResubmit = async () => {
    if (!hasHomeImage || !hasCookingPhotos) {
      alert("Please upload your home card image and at least 2 cooking area setup photos before re-submitting.")
      return
    }
    setResubmitting(true)
    setResubmitMessage("")
    try {
      const res = await api("/api/kitchens/me/resubmit", { method: "POST" }, "kitchen")
      await refreshKitchen()
      setResubmitMessage(res.message || "Application re-submitted for Admin review!")
    } catch (err) {
      alert(err.message || "Failed to re-submit application")
    } finally {
      setResubmitting(false)
    }
  }

  const refreshHomeImage = async () => {
    await refreshKitchen()
  }

  return (
    <KitchenLayout>
      {isNewSignup && isPending && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="font-poppins font-semibold text-primary text-sm">Welcome to Atleast80!</p>
          <p className="font-nunito text-sm text-gray mt-1">
            You&apos;re logged in. Upload your <strong>home card image</strong> below — admin will review your application for approval.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-poppins font-bold text-dark text-xl sm:text-2xl">
          Welcome {firstName}
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-dark text-sm font-poppins font-medium cursor-pointer border border-gray-200 shadow-sm transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {isApproved && (
        <FestivalSpecialsSection kitchen={kitchen} onUpdated={refreshKitchen} />
      )}

      {isApproved && (Number(orderStats.pendingOrders || 0) > 0 || Number(orderStats.activeOrders || 0) > 0) && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <p className="font-poppins font-bold text-base flex items-center gap-2">
                <span>⚡ New Orders Received!</span>
                <span className="bg-white text-red-600 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-sm">
                  {orderStats.pendingOrders || orderStats.activeOrders} Pending
                </span>
              </p>
              <p className="font-nunito text-xs text-white/90 mt-0.5">
                New customer orders are waiting for your acceptance.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/kitchen/orders")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-red-600 font-poppins font-bold text-xs hover:bg-red-50 transition-colors shadow-md cursor-pointer whitespace-nowrap text-center"
          >
            View Orders →
          </button>
        </div>
      )}

      {isApproved && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {[
            { label: "Today's Orders", value: String(orderStats.todayOrders || 0), icon: ShoppingBag, gradient: "from-blue-500 to-indigo-600", iconBg: "bg-white/20" },
            { label: "Today's Revenue", value: `₹${orderStats.todayRevenue || 0}`, icon: IndianRupee, gradient: "from-emerald-500 to-teal-600", iconBg: "bg-white/20" },
            { label: "Total Revenue", value: `₹${orderStats.totalRevenue || 0}`, icon: IndianRupee, gradient: "from-purple-500 to-violet-600", iconBg: "bg-white/20" },
            { label: "Rating", value: kitchen?.ratingVisible && kitchen?.rating ? Number(kitchen.rating).toFixed(1) : kitchen?.rating_count != null ? `${kitchen.rating_count}/10` : "—", icon: Star, gradient: "from-amber-400 to-orange-500", iconBg: "bg-white/25" },
            { label: "Menu Items", value: menuCount ?? "—", icon: UtensilsCrossed, gradient: "from-primary to-primary-dark", iconBg: "bg-white/20" },
          ].map((m) => {
            const Icon = m.icon
            return (
              <div key={m.label} className={cn("rounded-2xl p-4 sm:p-5 shadow-md text-white bg-gradient-to-br", m.gradient)}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", m.iconBg)}>
                  <Icon size={20} />
                </div>
                <p className="font-poppins font-bold text-2xl sm:text-3xl">{m.value}</p>
                <p className="font-nunito text-sm text-white/85 mt-1">{m.label}</p>
              </div>
            )
          })}
        </div>
      )}

      {!isApproved && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-5 mb-6 shadow-sm">
          <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-4">Application Progress</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
            {onboardingSteps.map((step, i) => {
              const done = i + 1 < currentStep
              const active = i + 1 === currentStep
              return (
                <div key={step.key} className="flex items-center flex-1 w-full sm:w-auto">
                  <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-0 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0",
                      done && "bg-primary border-primary text-white",
                      active && !isRejected && "border-primary bg-primary/10 text-primary",
                      active && isRejected && "border-red-500 bg-red-50 text-red-500",
                      !done && !active && "border-[#e0e0e0] text-[#ccc]"
                    )}>
                      {done ? <CheckCircle size={16} /> : active && isRejected ? <XCircle size={16} /> : active ? <Clock size={16} /> : <Circle size={12} />}
                    </div>
                    <p className={cn("font-nunito text-xs sm:text-[10px] sm:mt-2 sm:text-center leading-tight", active ? "text-[#1c1c1c] font-medium" : "text-[#999]")}>
                      {step.label}
                    </p>
                  </div>
                  {i < onboardingSteps.length - 1 && (
                    <div className={cn("hidden sm:block h-0.5 flex-1 -mt-5 mx-2", done ? "bg-primary" : "bg-[#e8e8e8]")} />
                  )}
                </div>
              )
            })}
          </div>
          {isPending && (
            <p className="font-nunito text-xs text-amber-800 bg-amber-50 rounded-xl px-4 py-3 mt-4 border border-amber-100">
              {!hasHomeImage && !hasCookingPhotos
                ? "Upload your home card image and at least 2 cooking area setup photos below for Admin approval."
                : !hasHomeImage
                ? "Upload your home card image below to complete your application."
                : !hasCookingPhotos
                ? "Upload at least 2 cooking area setup photos below for Admin approval."
                : "Home card image and cooking area setup photos uploaded. Admin will review your application soon."}
            </p>
          )}
          {isRejected && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle size={18} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-poppins font-bold text-sm text-red-800">
                    Application Needs Changes
                  </p>
                  <p className="font-nunito text-xs text-red-700 mt-1">
                    <strong>Reason from Admin:</strong> {kitchen?.rejection_reason || "Please update your photos/documents and re-submit."}
                  </p>
                  <p className="font-nunito text-xs text-gray-700 mt-2">
                    👉 Please update your Home card image or Cooking area setup photos below, then click <strong>Re-Submit Application</strong>.
                  </p>
                  {resubmitMessage && (
                    <p className="font-nunito text-xs text-emerald-700 bg-emerald-100 rounded-md px-3 py-1.5 mt-3 font-semibold">
                      ✅ {resubmitMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleResubmit}
                    disabled={resubmitting || !hasHomeImage || !hasCookingPhotos}
                    className="mt-3 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-poppins font-semibold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {resubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Re-submitting...
                      </>
                    ) : (
                      "🚀 Re-Submit Application for Review"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(isPending || isRejected) && (
        <div className="space-y-6 mb-6">
          <KitchenHomeImageSection kitchen={kitchen} onUploaded={refreshHomeImage} />
          <HygieneUploadSection onChange={() => refreshKitchen()} />
          <PayoutSettingsSection />
        </div>
      )}

      {isApproved && (
        <div className="mb-6">
          <PayoutSettingsSection />
        </div>
      )}

      {isApproved && <HygieneRecordSection />}

      {isApproved && (
        <div className="mb-6">
          <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-3">Quick Actions</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: UtensilsCrossed, label: "Manage Menu", desc: "Add food & ration items", action: () => navigate("/kitchen/menu"), primary: true },
              { icon: ShoppingBag, label: "Orders", desc: `${orderStats.activeOrders} active`, action: () => navigate("/kitchen/orders"), primary: false },
              { icon: IndianRupee, label: "Payouts & Settlements", desc: "View payout history", action: openPayoutsModal, primary: false },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  disabled={item.disabled}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    item.disabled ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50" : "cursor-pointer hover:shadow-md",
                    item.primary ? "border-primary/30 bg-primary/5 hover:border-primary/50" : "border-gray-100 bg-white hover:bg-gray-50/80"
                  )}
                >
                  <Icon size={20} className={item.primary ? "text-primary" : "text-emerald-700"} />
                  <p className="font-poppins font-semibold text-sm text-dark mt-2">{item.label}</p>
                  <p className="font-nunito text-xs text-gray mt-0.5">{item.desc}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isApproved && kitchen && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-5 shadow-sm">
          <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-3">Kitchen summary</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm font-nunito text-gray">
            <p><span className="text-dark font-medium">Name:</span> {kitchen.name}</p>
            <p><span className="text-dark font-medium">Type:</span> {kitchenTypeLabel[kitchen.kitchen_type] || kitchen.kitchen_type}</p>
            <p><span className="text-dark font-medium">Speciality:</span> {kitchen.speciality}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/kitchen/profile")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-poppins font-semibold text-primary cursor-pointer hover:underline"
          >
            Edit profile <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Payouts History Modal */}
      {payoutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-poppins font-bold text-dark text-lg flex items-center gap-2">
                  <IndianRupee className="text-emerald-600" size={22} /> Payout & Settlement History
                </h3>
                <p className="font-nunito text-xs text-gray mt-0.5">
                  Record of all bank transfers and payouts credited by Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1 space-y-4">
              {loadingPayouts ? (
                <div className="text-center py-12">
                  <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="font-nunito text-xs text-gray">Loading settlement history...</p>
                </div>
              ) : payoutsList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <IndianRupee size={36} className="text-gray-300 mx-auto mb-2" />
                  <p className="font-nunito text-gray text-sm">No payout settlements recorded yet.</p>
                  <p className="font-nunito text-xs text-gray-400 mt-1">Admin payouts will appear here with Date and UTR Reference number once processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                        <th className="py-3 px-4">Paid Date</th>
                        <th className="py-3 px-4">Gross Sales</th>
                        <th className="py-3 px-4">Comm. (10%)</th>
                        <th className="py-3 px-4">Net Received</th>
                        <th className="py-3 px-4">UTR Reference</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                      {payoutsList.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 text-gray font-medium">
                            {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "—"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-dark">₹{p.grossAmount}</td>
                          <td className="py-3.5 px-4 text-red-600 font-medium">-₹{p.commissionDeduction}</td>
                          <td className="py-3.5 px-4 font-poppins font-bold text-emerald-700 text-sm">₹{p.netPayout}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-dark">{p.utrNumber || "—"}</td>
                          <td className="py-3.5 px-4">
                            <span className="bg-emerald-100 text-emerald-800 font-poppins font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                              Paid ✅
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 text-right">
              <button
                type="button"
                onClick={() => setPayoutsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gray-100 font-poppins font-semibold text-xs text-dark hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </KitchenLayout>
  )
}
