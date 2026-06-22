import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Clock, CheckCircle, XCircle, RefreshCw,
  Star, ShoppingBag, IndianRupee, UtensilsCrossed,
  ChevronRight, Circle, FileCheck, Shield, Sparkles,
} from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import HygieneUploadSection from "../../components/kitchen/HygieneUploadSection"
import KitchenHomeImageSection from "../../components/kitchen/KitchenHomeImageSection"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const kitchenTypeLabel = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

const onboardingSteps = [
  { key: "register", label: "Application submitted" },
  { key: "hygiene", label: "Upload hygiene proof" },
  { key: "review", label: "Admin review" },
  { key: "approved", label: "Go live on Atleast80" },
]

export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { kitchen, refreshKitchen } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [menuCount, setMenuCount] = useState(null)
  const [hygieneCount, setHygieneCount] = useState(0)

  useEffect(() => { refreshKitchen().catch(() => {}) }, [refreshKitchen])

  useEffect(() => {
    if (kitchen?.status === "approved") {
      api("/api/menu/me").then((d) => setMenuCount(d.items.length)).catch(() => setMenuCount(0))
    }
  }, [kitchen?.status])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshKitchen()
      const d = await api("/api/menu/me").catch(() => null)
      if (d) setMenuCount(d.items.length)
    } finally {
      setRefreshing(false)
    }
  }

  const firstName = kitchen?.owner_name?.split(" ")[0] || "Partner"

  const status = kitchen?.status || "pending"
  const isApproved = status === "approved"
  const isPending = status === "pending"
  const isRejected = status === "rejected"
  const currentStep = isApproved
    ? 4
    : isRejected
    ? 3
    : isPending && hygieneCount > 0
    ? 3
    : isPending
    ? 2
    : 1
  const menuActive = isApproved && (menuCount ?? 0) > 0

  const isNewSignup = location.state?.newSignup
  const hasHomeImage = Boolean(kitchen?.cover_image || kitchen?.cover)

  const refreshHomeImage = async () => {
    await refreshKitchen()
  }

  return (
    <KitchenLayout>
      {isNewSignup && isPending && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="font-poppins font-semibold text-primary text-sm">Welcome to Atleast80!</p>
          <p className="font-nunito text-sm text-gray mt-1">
            Your application is submitted. Upload your <strong>home card image</strong> and submit <strong>hygiene proof</strong> below before admin can approve your kitchen.
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

      {/* Stats — approved */}
      {isApproved && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              label: "Today's Orders",
              value: "0",
              icon: ShoppingBag,
              gradient: "from-blue-500 to-indigo-600",
              iconBg: "bg-white/20",
            },
            {
              label: "Revenue",
              value: "₹0",
              icon: IndianRupee,
              gradient: "from-emerald-500 to-teal-600",
              iconBg: "bg-white/20",
            },
            {
              label: "Rating",
              value: kitchen?.rating ? Number(kitchen.rating).toFixed(1) : "—",
              icon: Star,
              gradient: "from-amber-400 to-orange-500",
              iconBg: "bg-white/25",
            },
            {
              label: "Menu Items",
              value: menuCount ?? "—",
              icon: UtensilsCrossed,
              gradient: "from-primary to-primary-dark",
              iconBg: "bg-white/20",
            },
          ].map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.label}
                className={cn(
                  "rounded-2xl p-4 sm:p-5 shadow-md text-white bg-gradient-to-br",
                  m.gradient
                )}
              >
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

      {/* Onboarding tracker */}
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
                    <p className={cn(
                      "font-nunito text-xs sm:text-[10px] sm:mt-2 sm:text-center leading-tight",
                      active ? "text-[#1c1c1c] font-medium" : "text-[#999]"
                    )}>
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
              {!hasHomeImage
                ? "Upload your home card image below to complete your application."
                : hygieneCount > 0
                ? "Your hygiene media is submitted. Admin will review your kitchen and assign a hygiene score within 24 hours."
                : "Add photos and videos of your kitchen and food below, then click Submit for review. Admin needs these to verify hygiene and approve your kitchen."}
            </p>
          )}
          {isRejected && kitchen?.rejection_reason && (
            <p className="font-nunito text-xs text-red-700 bg-red-50 rounded-xl px-4 py-3 mt-4 border border-red-100">
              <strong>Rejected:</strong> {kitchen.rejection_reason}
            </p>
          )}
        </div>
      )}

      {isPending && (
        <>
          <KitchenHomeImageSection kitchen={kitchen} onUploaded={refreshHomeImage} />
          <div className="mb-6">
            <HygieneUploadSection onChange={setHygieneCount} />
          </div>
        </>
      )}

      {/* Quick actions */}
      {isApproved && (
        <div className="mb-6">
          <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-3">Quick Actions</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: UtensilsCrossed, label: "Manage Menu", desc: "Add food & ration items", action: () => navigate("/kitchen/menu"), primary: true },
              { icon: ShoppingBag, label: "Orders", desc: "Coming soon", disabled: true },
              { icon: IndianRupee, label: "Payouts", desc: "Coming soon", disabled: true },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer",
                    item.primary ? "bg-primary border-primary text-white hover:bg-primary-dark shadow-md" : "bg-white border-[#e8e8e8] hover:shadow-sm hover:border-[#ddd]",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", item.primary ? "bg-white/20" : "bg-[#f4f4f5]")}>
                    <Icon size={20} className={item.primary ? "text-white" : "text-primary"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-poppins font-semibold text-sm", item.primary ? "text-white" : "text-[#1c1c1c]")}>{item.label}</p>
                    <p className={cn("font-nunito text-xs mt-0.5 truncate", item.primary ? "text-white/70" : "text-[#999]")}>{item.desc}</p>
                  </div>
                  {!item.disabled && <ChevronRight size={16} className={item.primary ? "text-white/70" : "text-[#ccc]"} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#e8e8e8] p-5 shadow-sm">
          <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-4">Business Details</h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <Detail label="Kitchen Type" value={kitchenTypeLabel[kitchen?.kitchen_type]} />
            <Detail label="Signature Dish" value={kitchen?.best_item} />
            <Detail label="Operating Hours" value={kitchen?.opening_time} />
            <Detail label="Phone" value={kitchen?.phone} />
            <Detail label="Email" value={kitchen?.email} />
            <Detail
              label="FSSAI License"
              value={
                kitchen?.fssai_license ? (
                  <a
                    href={kitchen.fssai_license}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View uploaded license
                  </a>
                ) : (
                  kitchen?.fssai_number || "—"
                )
              }
            />
            <div className="sm:col-span-2">
              <Detail label="About" value={kitchen?.description} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-5 shadow-sm">
            <h3 className="font-poppins font-semibold text-sm text-[#1c1c1c] mb-4">Partner Status</h3>
            <div className="space-y-3">
              {[
                { icon: FileCheck, label: "Application", ok: true },
                { icon: Shield, label: "Hygiene Verified", ok: isApproved && (kitchen?.hygiene_score || 0) > 0 },
                { icon: Sparkles, label: "Live on Platform", ok: isApproved },
                { icon: UtensilsCrossed, label: "Menu Active", ok: menuActive },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      item.ok ? "bg-emerald-100 text-emerald-600" : "bg-[#f4f4f5] text-[#ccc]"
                    )}>
                      <Icon size={16} />
                    </div>
                    <span className={cn("font-nunito text-sm flex-1", item.ok ? "text-[#1c1c1c]" : "text-[#999]")}>
                      {item.label}
                    </span>
                    {item.ok ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : (
                      <Clock size={16} className="text-[#ddd]" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {isApproved && (
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-5 text-white shadow-md">
              <Star size={20} className="text-secondary mb-2" />
              <p className="font-poppins font-semibold text-sm">You&apos;re live!</p>
              <p className="font-nunito text-xs text-white/70 mt-1 leading-relaxed">
                Customers can discover your kitchen. Add menu items and upload your logo to stand out.
              </p>
              <button
                onClick={() => navigate("/kitchen/menu")}
                className="mt-4 w-full py-2.5 bg-white text-primary rounded-xl font-poppins font-semibold text-xs hover:bg-white/90 cursor-pointer transition-colors"
              >
                {menuCount === 0 ? "Add Menu Items" : "Manage Menu"}
              </button>
            </div>
          )}
        </div>
      </div>
    </KitchenLayout>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="font-nunito text-[11px] text-[#999] uppercase tracking-wide">{label}</p>
      <div className="font-nunito text-sm text-[#1c1c1c] mt-0.5">{value || "—"}</div>
    </div>
  )
}
