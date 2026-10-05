import { useEffect, useState, useCallback } from "react"
import {
  ShieldCheck, Video, Eye, EyeOff, AlertTriangle, RefreshCw, MapPin, Phone, Mail,
  CheckCircle, XCircle, Clock, Image as ImageIcon, Play, Check, AlertCircle,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const FILTERS = [
  { key: "pending", label: "Pending Approval" },
  { key: "all", label: "All Approved" },
  { key: "missing", label: "Missing Video" },
  { key: "rejected", label: "Rejected" },
  { key: "hidden", label: "Hidden from Customers" },
]

const VISIBILITY_OPTIONS = [
  { value: "auto", label: "Auto", desc: "Follow hygiene rules" },
  { value: "visible", label: "Force visible", desc: "Always show to customers" },
  { value: "hidden", label: "Force hidden", desc: "Always hide from customers" },
]

const QUICK_REJECTION_REASONS = [
  "Aapne video galat bheja hai. Please kitchen area ki clean video share kijiye.",
  "Blank / Black screen video uploaded. Please record & send clean kitchen area video.",
  "Cooking area clearly visible nahi hai. Clean video share kijiye.",
  "Video reference kitchen setup se match nahi ho raha.",
]

function formatDate(value) {
  if (!value) return "Never"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export default function AdminHygienePage() {
  const [kitchens, setKitchens] = useState([])
  const [summary, setSummary] = useState({ total: 0, pendingHygiene: 0, missingHygiene: 0, hiddenFromCustomers: 0 })
  const [filter, setFilter] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const [rejectModalKitchen, setRejectModalKitchen] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [previewPhoto, setPreviewPhoto] = useState(null)

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const data = await api(`/api/admin/kitchens/hygiene-status?filter=${filter}`, {}, "admin")
      setKitchens(data.kitchens || [])
      setSummary(data.summary || { total: 0, pendingHygiene: 0, missingHygiene: 0, hiddenFromCustomers: 0 })
    } catch (err) {
      console.error(err)
      if (showSpinner) setKitchens([])
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadData(true) }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!rejectModalKitchen && !previewPhoto && !actionId) loadData(false)
    }, 3000)
    return () => clearInterval(interval)
  }, [loadData, rejectModalKitchen, previewPhoto, actionId])

  const updateVisibility = async (kitchenId, visibilityStatus) => {
    setActionId(kitchenId)
    try {
      const data = await api(
        `/api/admin/kitchens/${kitchenId}/visibility`,
        { method: "PATCH", body: JSON.stringify({ visibilityStatus }) },
        "admin"
      )
      setKitchens((prev) => prev.map((k) => (k.id === kitchenId ? { ...k, ...data.kitchen } : k)))
    } catch (err) {
      alert(err.message || "Failed to update visibility")
    } finally {
      setActionId(null)
    }
  }

  const handleApproveHygiene = async (kitchenId) => {
    if (!confirm("Approve this daily hygiene video for the kitchen?")) return
    setActionId(kitchenId)
    try {
      await api(`/api/admin/kitchens/${kitchenId}/hygiene/approve`, { method: "PATCH" }, "admin")
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to approve hygiene video")
    } finally {
      setActionId(null)
    }
  }

  const handleRejectHygieneSubmit = async (e) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      alert("Please specify a reason for rejection")
      return
    }
    const kitchenId = rejectModalKitchen.id
    setActionId(kitchenId)
    try {
      await api(
        `/api/admin/kitchens/${kitchenId}/hygiene/reject`,
        { method: "PATCH", body: JSON.stringify({ reason: rejectionReason.trim() }) },
        "admin"
      )
      setRejectModalKitchen(null)
      setRejectionReason("")
      await loadData()
    } catch (err) {
      alert(err.message || "Failed to reject hygiene video")
    } finally {
      setActionId(null)
    }
  }

  const statCards = [
    { label: "Approved Kitchens", value: summary.total, color: "text-primary" },
    { label: "Pending Video Approval", value: summary.pendingHygiene || 0, color: "text-amber-600 font-extrabold" },
    { label: "Missing Hygiene Video", value: summary.missingHygiene, color: "text-[#D97706]" },
    { label: "Hidden from Customers", value: summary.hiddenFromCustomers, color: "text-red-500" },
  ]

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Hygiene Video Verification</h1>
            <p className="font-nunito text-sm text-gray mt-0.5">
              Review daily recorded videos against reference kitchen setup photos & approve/reject hygiene
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-[#e8e8e8] p-4 shadow-sm">
            <p className={cn("font-poppins font-bold text-2xl", card.color)}>{card.value}</p>
            <p className="font-nunito text-xs sm:text-sm text-gray mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-full text-xs sm:text-sm font-poppins font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5",
              filter === f.key
                ? "bg-primary text-white"
                : "bg-white text-gray border border-gray-200 hover:border-primary/30"
            )}
          >
            {f.key === "pending" && <Clock size={14} className="text-amber-300" />}
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
            {filter === "pending"
              ? "No daily hygiene videos currently waiting for approval."
              : "No kitchens found."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {kitchens.map((kitchen) => (
            <div
              key={kitchen.id}
              className={cn(
                "bg-white rounded-2xl border p-5 shadow-sm space-y-4",
                kitchen.isPendingHygiene
                  ? "border-amber-400/80 bg-amber-50/10 ring-1 ring-amber-400/30"
                  : "border-[#e8e8e8]"
              )}
            >
              {/* Kitchen Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <img
                    src={resolveMediaUrl(kitchen.image)}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-poppins font-bold text-base text-dark">{kitchen.name}</h3>

                      {/* Status Badges */}
                      {kitchen.isPendingHygiene ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-poppins font-bold uppercase px-2.5 py-1 rounded-md bg-amber-500 text-white shadow-xs animate-pulse">
                          <Clock size={13} /> Pending Admin Approval
                        </span>
                      ) : kitchen.hygieneCompliant ? (
                        <span className="inline-flex items-center gap-1 text-xs font-poppins font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle size={13} /> Hygiene OK (Approved)
                        </span>
                      ) : kitchen.isRejectedHygiene ? (
                        <span className="inline-flex items-center gap-1 text-xs font-poppins font-bold uppercase px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300">
                          <XCircle size={13} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-poppins font-bold uppercase px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          <AlertTriangle size={13} /> No Video
                        </span>
                      )}

                      {kitchen.publiclyVisible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Eye size={10} /> Visible to Customers
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          <EyeOff size={10} /> Hidden from Customers
                        </span>
                      )}
                    </div>

                    <p className="font-nunito text-xs text-gray-600 mt-1">
                      Owner: <strong className="text-dark">{kitchen.ownerName}</strong>
                    </p>

                    <div className="flex flex-wrap gap-4 mt-2 text-xs font-nunito text-gray">
                      {kitchen.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" /> {kitchen.city}
                        </span>
                      )}
                      {kitchen.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" /> {kitchen.phone}
                        </span>
                      )}
                      {kitchen.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" /> {kitchen.email}
                        </span>
                      )}
                      <span className="text-gray-500 font-medium">
                        Last uploaded: <strong className="text-dark">{formatDate(kitchen.hygieneLatest)}</strong>
                      </span>
                    </div>

                    {kitchen.isRejectedHygiene && kitchen.rejectionReason && (
                      <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-nunito flex items-center gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 text-red-600" />
                        <span><strong>Rejection Reason:</strong> {kitchen.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve / Reject Actions */}
                <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                  <button
                    type="button"
                    disabled={actionId === kitchen.id || !kitchen.dailyVideoUrl}
                    onClick={() => handleApproveHygiene(kitchen.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-poppins font-bold text-xs hover:bg-emerald-700 cursor-pointer disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <CheckCircle size={15} /> Approve Hygiene
                  </button>

                  <button
                    type="button"
                    disabled={actionId === kitchen.id || !kitchen.dailyVideoUrl}
                    onClick={() => {
                      setRejectModalKitchen(kitchen)
                      setRejectionReason("Video aapne galat bheja hai. Please kitchen area ki clean video share kijiye.")
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-poppins font-bold text-xs hover:bg-red-100 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>

              {/* Media Comparison Panel: Reference Photos vs Daily Video */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                {/* Reference Kitchen Photos */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={16} className="text-primary" />
                    <h4 className="font-poppins font-bold text-xs text-dark uppercase tracking-wider">
                      Reference Kitchen Photos (Cooking Area & Setup)
                    </h4>
                  </div>

                  {((kitchen.formattedReferencePhotos && kitchen.formattedReferencePhotos.length > 0) || (kitchen.referencePhotos && kitchen.referencePhotos.length > 0)) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(kitchen.formattedReferencePhotos || kitchen.referencePhotos.map((url, i) => ({ url, label: `Photo ${i + 1}`, type: "generic" }))).map((photoItem, i) => {
                        const url = typeof photoItem === "string" ? photoItem : photoItem.url
                        const label = typeof photoItem === "string" ? `Photo ${i + 1}` : photoItem.label
                        const isCookingArea = typeof photoItem === "object" && photoItem.type === "cooking_area"
                        return (
                          <div
                            key={i}
                            onClick={() => setPreviewPhoto({ url, label })}
                            className={cn(
                              "group relative aspect-video bg-white rounded-lg border overflow-hidden shadow-xs cursor-pointer transition-all hover:scale-[1.02]",
                              isCookingArea ? "border-emerald-500 ring-2 ring-emerald-400/40" : "border-gray-200 hover:border-primary"
                            )}
                            title="Click to expand & compare"
                          >
                            <img
                              src={url}
                              alt={label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span
                              className={cn(
                                "absolute bottom-1 left-1 text-white text-[9px] px-1.5 py-0.5 rounded font-poppins font-bold uppercase shadow-sm flex items-center gap-1",
                                isCookingArea ? "bg-emerald-700" : "bg-black/75"
                              )}
                            >
                              {label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-white rounded-lg border border-dashed border-gray-200 text-center">
                      <p className="font-nunito text-xs text-gray font-semibold">No cooking area photos uploaded</p>
                      <p className="font-nunito text-[10px] text-gray/70 mt-1">This kitchen has not uploaded any cooking area setup photos yet.</p>
                    </div>
                  )}
                </div>

                {/* Uploaded Daily Hygiene Video */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Video size={16} className="text-primary" />
                      <h4 className="font-poppins font-bold text-xs text-dark uppercase tracking-wider">
                        Uploaded Daily Hygiene Video
                      </h4>
                    </div>
                    {kitchen.dailyVideoUrl && (
                      <span className="text-[10px] font-nunito font-semibold text-gray">
                        Watch video & compare with setup photos
                      </span>
                    )}
                  </div>

                  {kitchen.dailyVideoUrl ? (
                    <div className="rounded-xl overflow-hidden bg-black border border-gray-200 shadow-xs relative aspect-video flex items-center justify-center">
                      <video
                        src={kitchen.dailyVideoUrl}
                        controls
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="p-8 bg-white rounded-xl border border-dashed border-amber-300 text-center flex flex-col items-center justify-center min-h-[140px]">
                      <AlertTriangle size={24} className="text-amber-500 mb-1.5" />
                      <p className="font-poppins font-bold text-xs text-amber-900">No daily video uploaded</p>
                      <p className="font-nunito text-[11px] text-gray mt-0.5">Kitchen has not recorded today's video proof</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-nunito">
                <span className="text-gray-500 font-medium">Customer Visibility Rule:</span>
                <div className="flex gap-2">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={actionId === kitchen.id}
                      onClick={() => updateVisibility(kitchen.id, opt.value)}
                      title={opt.desc}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-poppins font-semibold border transition-colors cursor-pointer disabled:opacity-50",
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

      {/* Reject Hygiene Modal */}
      {rejectModalKitchen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-poppins font-bold text-base text-dark">
                Reject Daily Hygiene Video
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalKitchen(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="font-nunito text-xs text-gray leading-relaxed">
              Rejecting daily hygiene video for <strong>{rejectModalKitchen.name}</strong>. The kitchen will be notified to re-record a clear video of their cooking area.
            </p>

            <form onSubmit={handleRejectHygieneSubmit} className="space-y-3">
              <div>
                <label className="font-poppins text-xs font-bold text-dark block mb-1">
                  Select Quick Reason:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_REJECTION_REASONS.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRejectionReason(r)}
                      className="text-[11px] font-nunito font-semibold bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md text-dark text-left"
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <label className="font-poppins text-xs font-bold text-dark block mb-1">
                  Rejection Reason Details:
                </label>
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-nunito text-xs text-dark min-h-[80px] focus:outline-none focus:border-primary"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Describe why the daily video was rejected (e.g. Blank/black screen video, cooking setup not visible)..."
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalKitchen(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-poppins font-medium cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionId === rejectModalKitchen.id}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-poppins font-bold cursor-pointer hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-black/90 rounded-2xl overflow-hidden p-3 border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-2">
              <span className="font-poppins font-bold text-white text-sm">{previewPhoto.label}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <img src={previewPhoto.url} alt={previewPhoto.label} className="max-w-full max-h-[78vh] object-contain rounded-xl mx-auto shadow-lg" />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
