import { useEffect, useState, useCallback } from "react"
import {
  ShieldCheck, Video, Eye, EyeOff, AlertTriangle, RefreshCw, MapPin, Phone, Mail,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const FILTERS = [
  { key: "all", label: "All approved" },
  { key: "missing", label: "Missing hygiene video" },
  { key: "hidden", label: "Hidden from customers" },
]

const VISIBILITY_OPTIONS = [
  { value: "auto", label: "Auto", desc: "Follow hygiene rules" },
  { value: "visible", label: "Force visible", desc: "Always show to customers" },
  { value: "hidden", label: "Force hidden", desc: "Always hide from customers" },
]

function formatDate(value) {
  if (!value) return "Never"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export default function AdminHygienePage() {
  const [kitchens, setKitchens] = useState([])
  const [summary, setSummary] = useState({ total: 0, missingHygiene: 0, hiddenFromCustomers: 0 })
  const [filter, setFilter] = useState("missing")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/api/admin/kitchens/hygiene-status?filter=${filter}`, {}, "admin")
      setKitchens(data.kitchens || [])
      setSummary(data.summary || { total: 0, missingHygiene: 0, hiddenFromCustomers: 0 })
    } catch (err) {
      console.error(err)
      setKitchens([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadData() }, [loadData])

  const updateVisibility = async (kitchenId, visibilityStatus) => {
    setActionId(kitchenId)
    try {
      const data = await api(
        `/api/admin/kitchens/${kitchenId}/visibility`,
        { method: "PATCH", body: JSON.stringify({ visibilityStatus }) },
        "admin"
      )
      setKitchens((prev) => prev.map((k) => (k.id === kitchenId ? data.kitchen : k)))
    } catch (err) {
      alert(err.message || "Failed to update visibility")
    } finally {
      setActionId(null)
    }
  }

  const statCards = [
    { label: "Approved kitchens", value: summary.total, color: "text-primary" },
    { label: "Missing hygiene video", value: summary.missingHygiene, color: "text-amber-600" },
    { label: "Hidden from customers", value: summary.hiddenFromCustomers, color: "text-red-500" },
  ]

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Hygiene & visibility</h1>
            <p className="font-nunito text-sm text-gray mt-0.5">
              Monitor daily hygiene uploads and control kitchen visibility
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-poppins font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-[#e8e8e8] p-4 shadow-sm">
            <p className={cn("font-poppins font-bold text-2xl", card.color)}>{card.value}</p>
            <p className="font-nunito text-sm text-gray mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-poppins font-semibold whitespace-nowrap cursor-pointer transition-colors",
              filter === f.key
                ? "bg-primary text-white"
                : "bg-white text-gray border border-gray-200 hover:border-primary/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : kitchens.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
          <Video size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-poppins font-semibold text-dark">No kitchens match this filter</p>
          <p className="font-nunito text-sm text-gray mt-1">
            {filter === "missing"
              ? "All approved kitchens have uploaded a valid hygiene video."
              : "No kitchens to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {kitchens.map((kitchen) => (
            <div
              key={kitchen.id}
              className="bg-white rounded-xl border border-[#e8e8e8] p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <img
                    src={resolveMediaUrl(kitchen.image)}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-poppins font-semibold text-dark truncate">{kitchen.name}</h3>
                      {kitchen.publiclyVisible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <Eye size={10} /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          <EyeOff size={10} /> Hidden
                        </span>
                      )}
                      {kitchen.hygieneCompliant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          <Video size={10} /> Hygiene OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <AlertTriangle size={10} /> No video
                        </span>
                      )}
                    </div>
                    <p className="font-nunito text-sm text-gray mt-0.5">{kitchen.ownerName}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs font-nunito text-gray">
                      {kitchen.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {kitchen.city}
                        </span>
                      )}
                      {kitchen.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {kitchen.phone}
                        </span>
                      )}
                      {kitchen.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={12} /> {kitchen.email}
                        </span>
                      )}
                    </div>
                    <p className="font-nunito text-xs text-gray mt-2">
                      Last hygiene upload: <strong className="text-dark">{formatDate(kitchen.hygieneLatest)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={actionId === kitchen.id}
                      onClick={() => updateVisibility(kitchen.id, opt.value)}
                      title={opt.desc}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-poppins font-semibold border transition-colors cursor-pointer disabled:opacity-50",
                        kitchen.visibilityStatus === opt.value
                          ? opt.value === "hidden"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : opt.value === "visible"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white border-gray-200 text-gray hover:border-primary/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
