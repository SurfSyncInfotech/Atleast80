import { useState, useEffect, useRef } from "react"
import { Sparkles, Calendar, Tag, Clock, Edit2, Plus, Check, X, Loader2, AlertCircle, Zap, Image as ImageIcon, Upload, Info } from "lucide-react"
import { api, uploadKitchenFestivalOfferImage } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

function formatDateTimeForInput(dateStr) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const pad = (n) => String(n).padStart(2, "0")
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ""
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Not set"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Invalid date"
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

export default function FestivalSpecialsSection({ kitchen, onUpdated }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef1 = useRef(null)
  const fileInputRef2 = useRef(null)

  const [form, setForm] = useState({
    enabled: false,
    title: "",
    category: "both",
    discountPercent: 10,
    startDate: "",
    endDate: "",
    description: "",
    image: "",
    image2: "",
  })

  // Sync state from kitchen prop
  useEffect(() => {
    if (kitchen) {
      setForm({
        enabled: Boolean(kitchen.festival_offer_enabled),
        title: kitchen.festival_offer_title || "",
        category: kitchen.festival_offer_category || "both",
        discountPercent: Number(kitchen.festival_offer_discount_percent || 10),
        startDate: formatDateTimeForInput(kitchen.festival_offer_start_date),
        endDate: formatDateTimeForInput(kitchen.festival_offer_end_date),
        description: kitchen.festival_offer_description || "",
        image: kitchen.festival_offer_image || "/festival_offer_default.jpg",
        image2: kitchen.festival_offer_image_2 || "",
      })
    }
  }, [kitchen])

  const isEnabled = Boolean(kitchen?.festival_offer_enabled)
  const discount = Number(kitchen?.festival_offer_discount_percent || 0)
  const category = kitchen?.festival_offer_category || "both"
  const title = kitchen?.festival_offer_title || "Festival Special"

  // Check live status
  const now = new Date()
  const start = kitchen?.festival_offer_start_date ? new Date(kitchen.festival_offer_start_date) : null
  const end = kitchen?.festival_offer_end_date ? new Date(kitchen.festival_offer_end_date) : null

  let statusLabel = "Disabled"
  let statusBadgeClass = "bg-gray-100 text-gray-600 border-gray-200"

  if (isEnabled && discount > 0) {
    if (start && !isNaN(start.getTime()) && now < start) {
      statusLabel = "Scheduled"
      statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200"
    } else if (end && !isNaN(end.getTime()) && now > end) {
      statusLabel = "Expired"
      statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200"
    } else {
      statusLabel = "Active Live"
      statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
  }

  const categoryLabel = {
    food: "Food Items Only",
    grocery: "Grocery Only",
    both: "Both (Food & Grocery)",
  }[category] || "All Categories"

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    setError("")
    setSuccess("")
    try {
      const nextEnabled = !isEnabled
      await api(
        "/api/kitchens/me/festival-offer",
        {
          method: "PUT",
          body: JSON.stringify({
            enabled: nextEnabled,
            title: form.title || "Festival Special",
            category: form.category || "both",
            discountPercent: form.discountPercent || 10,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            description: form.description || null,
            image: form.image || null,
            image2: form.image2 || null,
          }),
        },
        "kitchen"
      )
      setSuccess(nextEnabled ? "Festival offer enabled!" : "Festival offer disabled!")
      if (onUpdated) onUpdated()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err.message || "Failed to update status")
    } finally {
      setToggling(false)
    }
  }

  const handleImageFileChange = async (e, slot = 1) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(slot)
    setError("")
    try {
      const res = await uploadKitchenFestivalOfferImage(file, slot)
      if (res?.imageUrl) {
        if (slot === 2) {
          setForm((prev) => ({ ...prev, image2: res.imageUrl }))
        } else {
          setForm((prev) => ({ ...prev, image: res.imageUrl }))
        }
      }
    } catch (err) {
      setError(err.message || `Failed to upload image ${slot}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (!form.title.trim()) {
        throw new Error("Please enter a festival offer title (e.g. Diwali Dhamaka)")
      }
      if (form.discountPercent <= 0 || form.discountPercent > 100) {
        throw new Error("Discount percentage must be between 1% and 100%")
      }

      await api(
        "/api/kitchens/me/festival-offer",
        {
          method: "PUT",
          body: JSON.stringify({
            enabled: form.enabled,
            title: form.title.trim(),
            category: form.category,
            discountPercent: Number(form.discountPercent),
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            description: form.description.trim() || null,
            image: form.image || null,
            image2: form.image2 || null,
          }),
        },
        "kitchen"
      )

      setSuccess("Festival offer saved successfully!")
      setModalOpen(false)
      if (onUpdated) onUpdated()
      setTimeout(() => setSuccess(""), 4000)
    } catch (err) {
      setError(err.message || "Failed to save festival offer")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 rounded-2xl border border-amber-200/80 p-5 mb-6 shadow-sm relative overflow-hidden">
      {/* Festive Background Accent */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-poppins font-bold text-dark text-base">Festival Specials & Offers</h3>
              <span className={cn("text-[11px] font-poppins font-semibold px-2.5 py-0.5 rounded-full border", statusBadgeClass)}>
                {statusLabel === "Active Live" && "🟢 "}
                {statusLabel}
              </span>
            </div>
            <p className="font-nunito text-xs text-gray-600 mt-1">
              Create and run category-wise festival discounts (Food & Grocery) with auto-expiry.
            </p>
          </div>
        </div>

        {/* Action Buttons & Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setGuidelinesModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-poppins font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Info size={13} className="text-amber-600" />
            Seller Guidelines
          </button>

          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-poppins font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
              isEnabled
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
            )}
          >
            {toggling ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isEnabled ? (
              <Check size={13} />
            ) : (
              <Zap size={13} />
            )}
            {isEnabled ? "Offer Enabled" : "Enable Offer"}
          </button>

          <button
            type="button"
            onClick={() => {
              setError("")
              setModalOpen(true)
            }}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-poppins font-bold transition-all shadow-sm shadow-primary/20 flex items-center gap-1.5 cursor-pointer border-0"
          >
            {kitchen?.festival_offer_title ? <Edit2 size={13} /> : <Plus size={14} />}
            {kitchen?.festival_offer_title ? "Edit Festival Menu" : "Create Festival Menu"}
          </button>
        </div>
      </div>

      {/* Offer Summary Banner if set */}
      {kitchen?.festival_offer_title && (
        <div className="mt-4 pt-4 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          <div className="bg-white/80 rounded-xl p-3 border border-amber-100 flex items-center gap-2.5">
            <img
              src={kitchen?.festival_offer_image ? resolveMediaUrl(kitchen.festival_offer_image) : "/festival_offer_default.jpg"}
              alt="Festival Offer"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = "/festival_offer_default.jpg"
              }}
              className="w-10 h-10 rounded-lg object-cover border border-amber-200"
            />
            <div className="min-w-0 flex-1">
              <p className="font-nunito text-[10px] text-gray-500">Offer Image</p>
              <p className="font-poppins font-semibold text-[11px] text-dark truncate">Default / Custom</p>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-amber-100">
            <p className="font-nunito text-[11px] text-gray-500">Offer Title</p>
            <p className="font-poppins font-bold text-xs text-dark truncate mt-0.5">{title}</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-amber-100">
            <p className="font-nunito text-[11px] text-gray-500">Discount & Category</p>
            <p className="font-poppins font-bold text-xs text-primary mt-0.5">
              {discount}% OFF · <span className="font-medium text-dark">{categoryLabel}</span>
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-amber-100">
            <p className="font-nunito text-[11px] text-gray-500">Start Date</p>
            <p className="font-poppins font-medium text-xs text-dark mt-0.5">
              {formatDisplayDate(kitchen.festival_offer_start_date)}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-amber-100">
            <p className="font-nunito text-[11px] text-gray-500">End Date (Auto Hides)</p>
            <p className="font-poppins font-medium text-xs text-dark mt-0.5">
              {formatDisplayDate(kitchen.festival_offer_end_date)}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-nunito flex items-center gap-2">
          <Check size={14} className="text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Guidelines Modal */}
      {guidelinesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0a1f13] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-emerald-400" />
                <h3 className="font-poppins font-bold text-base">Atleast80 Seller Guidelines</h3>
              </div>
              <button
                type="button"
                onClick={() => setGuidelinesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer border-0 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[75vh] flex justify-center bg-gray-50">
              <img
                src="/festival_seller_guidelines.jpg"
                alt="Seller Guidelines"
                className="max-w-full h-auto rounded-xl shadow-md border border-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <h3 className="font-poppins font-bold text-base">Festival Offer Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer border-0 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-nunito flex items-start gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Offer Images Selection / Upload (2 Images) */}
              <div>
                <label className="block font-poppins text-xs font-bold text-dark mb-1.5">
                  Festival Offer Images (Up to 2 Posters / Banners)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Slot 1: Primary Banner */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={form.image ? resolveMediaUrl(form.image) : "/festival_offer_default.jpg"}
                        alt="Offer Image 1"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = "/festival_offer_default.jpg"
                        }}
                        className="w-14 h-14 rounded-xl object-cover border border-amber-200 shadow-xs flex-shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-poppins font-bold text-xs text-dark">
                          Image 1: Main Banner
                        </p>
                        <p className="font-nunito text-[10px] text-gray-500 mt-0.5 truncate">
                          {form.image && form.image !== "/festival_offer_default.jpg" ? "Custom Image Uploaded" : "Default Festive Image"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <input
                            type="file"
                            ref={fileInputRef1}
                            accept="image/*"
                            onChange={(e) => handleImageFileChange(e, 1)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef1.current?.click()}
                            disabled={uploadingImage === 1}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-poppins font-semibold text-gray-700 flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {uploadingImage === 1 ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                            {uploadingImage === 1 ? "Uploading..." : "Upload 1"}
                          </button>
                          {form.image && form.image !== "/festival_offer_default.jpg" && (
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, image: "/festival_offer_default.jpg" }))}
                              className="text-[10px] font-poppins font-semibold text-amber-700 hover:underline cursor-pointer"
                            >
                              Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slot 2: Secondary Poster / Combo Flyer */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      {form.image2 ? (
                        <img
                          src={resolveMediaUrl(form.image2)}
                          alt="Offer Image 2"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = "/festival_offer_default.jpg"
                          }}
                          className="w-14 h-14 rounded-xl object-cover border border-amber-200 shadow-xs flex-shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-100/60 flex-shrink-0">
                          <ImageIcon size={18} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-poppins font-bold text-xs text-dark">
                          Image 2 (Optional)
                        </p>
                        <p className="font-nunito text-[10px] text-gray-500 mt-0.5 truncate">
                          {form.image2 ? "Secondary Flyer Uploaded" : "Add 2nd flyer/combo poster"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <input
                            type="file"
                            ref={fileInputRef2}
                            accept="image/*"
                            onChange={(e) => handleImageFileChange(e, 2)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef2.current?.click()}
                            disabled={uploadingImage === 2}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-poppins font-semibold text-gray-700 flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {uploadingImage === 2 ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                            {uploadingImage === 2 ? "Uploading..." : form.image2 ? "Change 2" : "Upload 2"}
                          </button>
                          {form.image2 && (
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, image2: "" }))}
                              className="text-[10px] font-poppins font-semibold text-red-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer Title */}
              <div>
                <label className="block font-poppins text-xs font-bold text-dark mb-1">
                  Festival / Offer Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Diwali Dhamaka Special, Navratri Feast, Eid Delight"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-poppins focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  required
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="block font-poppins text-xs font-bold text-dark mb-1.5">
                  Apply Offer To Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "food", label: "Food Only" },
                    { id: "grocery", label: "Grocery Only" },
                    { id: "both", label: "Both (All)" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.id })}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-poppins font-semibold transition-all cursor-pointer text-center",
                        form.category === cat.id
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-dark border-gray-200"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <p className="font-nunito text-[11px] text-gray-500 mt-1">
                  Choose which products in your store receive this discount.
                </p>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block font-poppins text-xs font-bold text-dark mb-1">
                  Discount Percentage (% OFF) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: Math.max(1, Math.min(100, Number(e.target.value) || 0)) })}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-poppins font-bold text-dark focus:outline-none focus:border-primary focus:bg-white transition-colors"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-poppins font-bold text-xs text-gray-500">% OFF</span>
                </div>
              </div>

              {/* Start & End Date Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-poppins text-xs font-bold text-dark mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-nunito focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-poppins text-xs font-bold text-dark mb-1">
                    End Date & Time (Auto-Expires)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-nunito focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              {/* Description / Terms */}
              <div>
                <label className="block font-poppins text-xs font-bold text-dark mb-1">
                  Offer Description / Note (Optional)
                </label>
                <textarea
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Valid on all traditional sweets and grocery essentials this festive season."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-nunito focus:outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>

              {/* Enable immediately toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-poppins font-bold text-xs text-dark">Enable Festival Offer Now</p>
                  <p className="font-nunito text-[11px] text-gray-500">Make this offer live during the set dates</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-poppins text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-poppins text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 border-0"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Festival Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
