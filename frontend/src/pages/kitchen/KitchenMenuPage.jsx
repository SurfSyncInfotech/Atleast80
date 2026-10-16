import { useEffect, useState, useRef, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"

import {
  Plus, UtensilsCrossed, Lock, Leaf, IndianRupee,
  Upload, X, Video, Play, Tag, Check, ShoppingBag,
} from "lucide-react"

import KitchenLayout from "../../components/layout/KitchenLayout"
import KitchenMenuTable from "../../components/kitchen/KitchenMenuTable"
import FestivalSpecialsSection from "../../components/kitchen/FestivalSpecialsSection"
import Button from "../../components/ui/Button"
import TablePagination from "../../components/ui/TablePagination"
import { useAuth } from "../../context/AuthContext"
import { api, uploadMenuFiles } from "../../lib/api"
import { resolveMediaUrl, resolveMenuItemMedia } from "../../lib/media"
import { paginateSlice } from "../../lib/pagination"
import { cn } from "../../lib/utils"
import { PRESET_GROCERY_ITEMS, SUGGESTED_FOOD_ITEMS } from "../../data/groceryPresetGallery"
import { GROCERY_MASTER_CATALOG, GROCERY_LANGUAGES } from "../../data/groceryMasterCatalog"

const emptyForm = {
  name: "",
  localName: "",
  description: "",
  price: "",
  category: "food",
  itemType: "veg",
  packagingType: "packaged",
  unitValue: "1",
  unit: "kg",
  gstRate: 5,
}



const MAX_IMAGES = 8

const MAX_VIDEOS = 3



export default function KitchenMenuPage() {

  const { kitchen, refreshKitchen } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [items, setItems] = useState([])

  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selectedGroceryLang, setSelectedGroceryLang] = useState("en")
  const [selectedGroceryId, setSelectedGroceryId] = useState("")
  const [isCustomGrocery, setIsCustomGrocery] = useState(false)
  const [existingImages, setExistingImages] = useState([])
  const [existingVideos, setExistingVideos] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [pendingVideos, setPendingVideos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")



  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [deletingId, setDeletingId] = useState(null)
  const [commentModal, setCommentModal] = useState(null)


  const imageInputRef = useRef(null)

  const videoInputRef = useRef(null)



  const isApproved = kitchen?.status === "approved"

  const [groceryPresets, setGroceryPresets] = useState(PRESET_GROCERY_ITEMS)

  const loadPresets = async () => {
    try {
      const data = await api("/api/menu/grocery-presets")
      if (data?.presets && data.presets.length > 0) {
        setGroceryPresets(data.presets)
      }
    } catch {}
  }

  const loadMenu = async () => {
    loadPresets()
    if (!isApproved) return
    setLoading(true)
    try {
      const data = await api("/api/menu/me", {}, "kitchen")
      setItems((data.items || []).map(resolveMenuItemMedia))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPresets()
    refreshKitchen().catch(() => {})
  }, [refreshKitchen])



  useEffect(() => {
    if (!isApproved) {
      setLoading(false)
      return
    }

    loadMenu()
    const interval = setInterval(() => {
      if (!showForm && !editingId) {
        api("/api/menu/me", {}, "kitchen")
          .then((data) => {
            if (data?.items) {
              setItems(data.items.map(resolveMenuItemMedia))
            }
          })
          .catch(() => {})
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isApproved, kitchen?.status, showForm, editingId])

  useEffect(() => {
    const editItemId = location.state?.editItemId
    if (!editItemId || !items.length) return

    const item = items.find((i) => String(i.id) === String(editItemId))
    if (item) {
      openEdit(item)
      navigate("/kitchen/menu", { replace: true, state: {} })
    }
  }, [items, location.state?.editItemId])



  const resetMedia = () => {

    pendingImages.forEach((p) => URL.revokeObjectURL(p.preview))

    pendingVideos.forEach((p) => URL.revokeObjectURL(p.preview))

    setExistingImages([])

    setExistingVideos([])

    setPendingImages([])

    setPendingVideos([])

  }



  const closeForm = () => {

    resetMedia()

    setShowForm(false)

    setEditingId(null)

    setForm(emptyForm)

    setError("")

  }



  const openAdd = () => {
    pendingImages.forEach((p) => URL.revokeObjectURL(p.preview))
    pendingVideos.forEach((p) => URL.revokeObjectURL(p.preview))
    setForm(emptyForm)
    setSelectedGroceryLang("en")
    setSelectedGroceryId("")
    setIsCustomGrocery(false)
    setExistingImages([])
    setExistingVideos([])
    setPendingImages([])
    setPendingVideos([])
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  const openEdit = (item) => {
    const isGrocery = item.category === "grocery"
    let matchedCatalogId = ""
    let isCustom = false
    let extractedUnitValue = item.unit_value || item.unitValue || "1"
    let extractedUnit = item.unit || "kg"
    let cleanName = item.name || ""

    if (isGrocery) {
      const unitMatch = cleanName.match(/\(([^\)]+)\)$/)
      if (unitMatch) {
        const parts = unitMatch[1].trim().split(/\s+/)
        if (parts.length >= 2) {
          extractedUnitValue = parts[0]
          extractedUnit = parts[1].toLowerCase()
        }
        cleanName = cleanName.replace(/\s*\([^\)]+\)$/, "").trim()
      }

      const match = GROCERY_MASTER_CATALOG.find((g) => {
        return Object.values(g.names).some((name) => {
          const c1 = cleanName.toLowerCase()
          const c2 = (name || "").toLowerCase()
          return c1 === c2 || c1.includes(c2) || c2.includes(c1)
        })
      })
      if (match) {
        matchedCatalogId = match.id
        isCustom = false
      } else {
        matchedCatalogId = "custom"
        isCustom = true
      }
    }

    setSelectedGroceryLang("en")
    setSelectedGroceryId(matchedCatalogId)
    setIsCustomGrocery(isCustom)

    const defaultGst = isGrocery ? 5 : 5
    const itemGst = item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : defaultGst)

    setForm({
      name: cleanName,
      localName: item.local_name || item.localName || "",
      description: item.description || "",
      price: String(item.price),
      category: item.category,
      itemType: item.item_type || "veg",
      packagingType: item.packaging_type || item.packagingType || "packaged",
      unitValue: String(extractedUnitValue),
      unit: extractedUnit,
      gstRate: itemGst,
    })

    setExistingImages(
      (item.images?.length ? item.images : item.image ? [item.image] : []).map(resolveMediaUrl).filter(Boolean)
    )

    setExistingVideos((item.videos || []).map(resolveMediaUrl).filter(Boolean))
    setPendingImages([])
    setPendingVideos([])
    setEditingId(item.id)
    setShowForm(true)
    setError("")
  }



  const addPendingFiles = (files, type) => {

    const list = Array.from(files)

    if (type === "image") {

      const room = MAX_IMAGES - existingImages.length - pendingImages.length

      const accepted = list.filter((f) => f.type.startsWith("image/")).slice(0, room)

      setPendingImages((prev) => [

        ...prev,

        ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })),

      ])

    } else {

      const room = MAX_VIDEOS - existingVideos.length - pendingVideos.length

      const accepted = list.filter((f) => f.type.startsWith("video/")).slice(0, room)

      setPendingVideos((prev) => [

        ...prev,

        ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) })),

      ])

    }

  }



  const removeExistingImage = (index) => {

    setExistingImages((prev) => prev.filter((_, i) => i !== index))

  }



  const removeExistingVideo = (index) => {

    setExistingVideos((prev) => prev.filter((_, i) => i !== index))

  }



  const removePendingImage = (index) => {

    setPendingImages((prev) => {

      URL.revokeObjectURL(prev[index].preview)

      return prev.filter((_, i) => i !== index)

    })

  }



  const removePendingVideo = (index) => {

    setPendingVideos((prev) => {

      URL.revokeObjectURL(prev[index].preview)

      return prev.filter((_, i) => i !== index)

    })

  }



  const handleSave = async (e) => {

    e.preventDefault()

    if (!form.name.trim() || !form.price) {

      setError("Name and price are required")

      return

    }



    setSaving(true)

    setError("")



    try {

      let uploadedImages = []

      let uploadedVideos = []



      const filesToUpload = [

        ...pendingImages.map((p) => p.file),

        ...pendingVideos.map((p) => p.file),

      ]



      if (filesToUpload.length > 0) {

        const uploaded = await uploadMenuFiles(filesToUpload)

        uploadedImages = uploaded.images || []

        uploadedVideos = uploaded.videos || []

      }



      const images = [...existingImages, ...uploadedImages]
      const videos = [...existingVideos, ...uploadedVideos]

      let finalName = form.name.trim()
      if (form.category === "grocery" && form.unitValue && form.unit) {
        finalName = `${finalName} (${form.unitValue} ${form.unit})`
      }
      const calculatedGstRate = form.category === "grocery"
        ? (Number(form.gstRate) ?? 5)
        : 5

      const payload = {
        ...form,
        gstRate: calculatedGstRate,
        name: finalName,
        images,
        videos,
        image: images[0] || null,
      }



      if (editingId) {

        await api(`/api/menu/${editingId}`, {

          method: "PUT",

          body: JSON.stringify(payload),

        }, "kitchen")

      } else {

        await api("/api/menu", {

          method: "POST",

          body: JSON.stringify(payload),

        }, "kitchen")

      }



      closeForm()

      await loadMenu()

    } catch (err) {

      setError(err.message)

    } finally {

      setSaving(false)

    }

  }



  const handleDelete = async (item) => {

    if (!confirm(`Remove "${item.name}" from your menu?`)) return

    setDeletingId(item.id)

    try {

      await api(`/api/menu/${item.id}`, { method: "DELETE" }, "kitchen")

      await loadMenu()

    } catch (err) {

      alert(err.message)

    } finally {

      setDeletingId(null)

    }

  }



  const handleViewComment = (item) => {

    const comment = item.reviewComment || item.review_comment

    if (comment) setCommentModal({ name: item.name, comment })

  }



  const filteredItems = categoryFilter === "all"

    ? items

    : items.filter((i) => i.category === categoryFilter)

  const paginatedItems = useMemo(
    () => paginateSlice(filteredItems, page, pageSize),
    [filteredItems, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [categoryFilter])

  useEffect(() => {
    if (page > paginatedItems.totalPages) setPage(paginatedItems.totalPages)
  }, [page, paginatedItems.totalPages])



  const toggleAvailability = async (item) => {

    try {

      await api(`/api/menu/${item.id}`, {

        method: "PUT",

        body: JSON.stringify({ isAvailable: !item.is_available }),

      }, "kitchen")

      await loadMenu()

    } catch (err) {

      alert(err.message)

    }

  }



  if (!isApproved) {

    return (

      <KitchenLayout>

        <div className="max-w-lg mx-auto mt-16 text-center">

          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">

            <Lock size={28} className="text-amber-600" />

          </div>

          <h2 className="font-poppins font-bold text-xl text-dark">Menu locked</h2>

          <p className="font-nunito text-gray text-sm mt-2 leading-relaxed">

            You can add menu items after admin approves your kitchen.

            {kitchen?.status === "pending" && " Your application is currently under review."}

            {kitchen?.status === "rejected" && " Please contact support if you need to reapply."}

          </p>

        </div>

      </KitchenLayout>

    )

  }



  return (
    <KitchenLayout>
      <FestivalSpecialsSection kitchen={kitchen} onUpdated={refreshKitchen} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">

        <div>

          <h1 className="font-poppins font-bold text-xl text-dark">Menu Management</h1>

          <p className="font-nunito text-gray text-sm mt-0.5">

            {items.length} item{items.length !== 1 ? "s" : ""} on your menu

          </p>

        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-auto">



          <Button size="sm" onClick={openAdd} className="!rounded-lg">

            <Plus size={16} /> Add Item

          </Button>

        </div>

      </div>



      <div className="flex flex-wrap gap-2 mb-5">

        {["all", "food", "grocery"].map((cat) => (

          <button

            key={cat}

            type="button"

            onClick={() => setCategoryFilter(cat)}

            className={cn(

              "px-3 sm:px-4 py-1.5 rounded-lg border text-xs font-poppins font-medium capitalize cursor-pointer transition-colors",

              categoryFilter === cat

                ? "bg-primary text-white border-primary"

                : "bg-white border-gray-200 text-gray hover:border-primary/40"

            )}

          >

            {cat === "all" ? `All (${items.length})` : `${cat} (${items.filter((i) => i.category === cat).length})`}

          </button>

        ))}

      </div>



      {loading ? (

        <div className="flex justify-center py-20">

          <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />

        </div>

      ) : items.length === 0 ? (

        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">

          <UtensilsCrossed size={40} className="text-gray-light mx-auto mb-4" />

          <p className="font-poppins font-semibold text-dark">No menu items yet</p>

          <p className="font-nunito text-gray text-sm mt-1">Add your first dish or grocery item</p>

          <Button size="sm" onClick={openAdd} className="mt-5 !rounded-lg">

            <Plus size={16} /> Add First Item

          </Button>

        </div>

      ) : filteredItems.length === 0 ? (

        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">

          <p className="font-nunito text-sm text-gray">No items in this category.</p>

        </div>

      ) : (

        <div className="bg-white border border-[#e8e8e8] shadow-sm overflow-hidden">

          <KitchenMenuTable

            items={paginatedItems.items}

            deletingId={deletingId}

            onComment={handleViewComment}

            onEdit={openEdit}

            onDelete={handleDelete}

            onToggleAvailability={toggleAvailability}

          />

          <TablePagination
            page={paginatedItems.page}
            pageSize={pageSize}
            total={paginatedItems.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />

        </div>

      )}



      {commentModal && (

        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">

            <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">Admin feedback</h3>

            <p className="font-poppins font-semibold text-sm text-[#363636] mt-2">{commentModal.name}</p>

            <p className="font-nunito text-sm text-red-700 mt-3 leading-relaxed bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">

              {commentModal.comment}

            </p>

            <button

              type="button"

              onClick={() => setCommentModal(null)}

              className="w-full mt-4 py-2.5 rounded-lg border border-[#e8e8e8] font-poppins text-sm font-medium cursor-pointer hover:bg-[#fafafa]"

            >

              Close

            </button>

          </div>

        </div>

      )}



      {showForm && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">

          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between">

              <h3 className="font-poppins font-bold text-lg text-dark">

                {editingId ? "Edit Menu Item" : "Add Menu Item"}

              </h3>

              <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">

              <Field label="Category" required>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => {
                    const nextCat = e.target.value
                    if (nextCat === "grocery") {
                      setSelectedGroceryId("")
                      setIsCustomGrocery(false)
                      setForm({ ...form, category: nextCat, name: "", localName: "", gstRate: 5 })
                    } else {
                      setForm({ ...form, category: nextCat, gstRate: 5 })
                    }
                  }}
                >
                  <option value="food">Food</option>
                  <option value="grocery">Grocery / Ration</option>
                </select>
              </Field>

              {/* Grocery Category: Multi-Language & Item Dropdown */}
              {form.category === "grocery" ? (
                <>
                  {/* Step 1: Language Selector */}
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
                    <label className="text-xs font-poppins font-bold text-emerald-950 mb-1.5 flex items-center justify-between">
                      <span>🌐 Select Item Language</span>
                      <span className="text-[10px] font-nunito text-emerald-700 font-normal">Choose language to browse catalog</span>
                    </label>
                    <select
                      className={inputClass}
                      value={selectedGroceryLang}
                      onChange={(e) => {
                        const newLang = e.target.value
                        setSelectedGroceryLang(newLang)
                        if (selectedGroceryId && selectedGroceryId !== "custom") {
                          const item = GROCERY_MASTER_CATALOG.find((g) => g.id === selectedGroceryId)
                          if (item) {
                            const chosenName = item.names[newLang] || item.names.en
                            setForm((prev) => ({
                              ...prev,
                              name: chosenName,
                              localName: newLang !== "en" ? item.names.en : (item.names.hi || ""),
                              gstRate: item.gstRate,
                            }))
                          }
                        }
                      }}
                    >
                      {GROCERY_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Grocery Master Item Dropdown */}
                  <div>
                    <label className="block font-poppins text-xs font-bold text-dark mb-1.5">
                      Select Grocery Item *
                    </label>
                    <select
                      className={inputClass}
                      value={selectedGroceryId}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectedGroceryId(val)
                        if (val === "custom") {
                          setIsCustomGrocery(true)
                          setForm((prev) => ({ ...prev, name: "", localName: "", gstRate: 5 }))
                        } else if (val) {
                          setIsCustomGrocery(false)
                          const item = GROCERY_MASTER_CATALOG.find((g) => g.id === val)
                          if (item) {
                            const chosenName = item.names[selectedGroceryLang] || item.names.en
                            setForm((prev) => ({
                              ...prev,
                              name: chosenName,
                              localName: selectedGroceryLang !== "en" ? item.names.en : (item.names.hi || ""),
                              gstRate: item.gstRate,
                            }))
                          }
                        } else {
                          setIsCustomGrocery(false)
                          setForm((prev) => ({ ...prev, name: "", gstRate: 5 }))
                        }
                      }}
                      required={!isCustomGrocery}
                    >
                      <option value="">-- Choose from {GROCERY_MASTER_CATALOG.length} Standard Grocery Items --</option>
                      {GROCERY_MASTER_CATALOG.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.names[selectedGroceryLang] || item.names.en} (GST: {item.gstRate}%)
                        </option>
                      ))}
                      <option value="custom">➕ Other / Custom Item (यदि सूची में नहीं है)</option>
                    </select>
                  </div>

                  {/* Step 3: Custom Item Input if 'Other / Custom' chosen */}
                  {isCustomGrocery ? (
                    <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3 animate-in fade-in">
                      <div>
                        <label className="block font-poppins text-xs font-bold text-dark mb-1">
                          Custom Grocery Item Name *
                        </label>
                        <input
                          className={inputClass}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Special Homemade Spices / Raw Honey"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-poppins text-xs font-bold text-dark mb-1">
                          GST Rate (%) *
                        </label>
                        <select
                          className={inputClass}
                          value={form.gstRate}
                          onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
                        >
                          <option value={0}>0% (Exempted / Zero GST)</option>
                          <option value={5}>5% (Standard Grocery GST)</option>
                          <option value={12}>12% (Pickles / Processed)</option>
                          <option value={18}>18% (Standard 18%)</option>
                        </select>
                      </div>
                      <p className="text-[11px] font-nunito text-amber-800 font-semibold">
                        ℹ️ Custom items will be submitted for Admin approval before going live.
                      </p>
                    </div>
                  ) : selectedGroceryId ? (
                    /* Auto-filled GST Display Badge */
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                      <div>
                        <p className="font-poppins text-xs font-bold text-emerald-950">GST Rate (Auto-filled)</p>
                        <p className="font-nunito text-[11px] text-emerald-800">
                          {form.gstRate === 0
                            ? "Zero GST / Tax Exempted item"
                            : `${form.gstRate}% standard GST automatically applied`}
                        </p>
                      </div>
                      <span className="bg-emerald-600 text-white font-poppins text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                        {form.gstRate}% GST
                      </span>
                    </div>
                  ) : null}

                  {/* Quantity & Unit Row */}
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70">
                    <label className="block text-xs font-poppins font-bold text-emerald-950 mb-2">
                      Quantity / Weight & Unit *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-nunito text-emerald-800 font-semibold mb-1">
                          Amount / Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          className={inputClass}
                          value={form.unitValue}
                          onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
                          placeholder="e.g. 1 or 500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-nunito text-emerald-800 font-semibold mb-1">
                          Unit
                        </label>
                        <select
                          className={inputClass}
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        >
                          <option value="kg">kg (Kilogram)</option>
                          <option value="gm">gm (Gram)</option>
                          <option value="litre">litre (L)</option>
                          <option value="ml">ml (Millilitre)</option>
                          <option value="pack">pack (Packet)</option>
                          <option value="piece">piece (Pcs)</option>
                          <option value="dozen">dozen</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preset Grocery Photo Gallery */}
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-poppins font-bold text-emerald-950 flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-emerald-700" />
                        Grocery Photo Gallery ({groceryPresets.length})
                      </span>
                      <span className="text-[10px] font-nunito text-emerald-700 font-semibold">
                        Click photo to attach
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5">
                      {groceryPresets.map((preset) => {
                        const isAdded = existingImages.includes(preset.image)
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              if (isAdded) {
                                setExistingImages((prev) => prev.filter((img) => img !== preset.image))
                              } else {
                                if (existingImages.length + pendingImages.length < MAX_IMAGES) {
                                  setExistingImages((prev) => [...prev, preset.image])
                                }
                              }
                            }}
                            className={cn(
                              "flex-shrink-0 w-20 p-1.5 rounded-lg border bg-white cursor-pointer transition-all hover:shadow-xs relative text-center",
                              isAdded ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-gray-200 hover:border-emerald-300"
                            )}
                          >
                            <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-100 mb-1 relative">
                              <img src={preset.image} alt={preset.name} className="w-full h-full object-cover" />
                              {isAdded && (
                                <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-nunito font-semibold text-dark truncate leading-tight">
                              {preset.name.split("/")[0]}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* Food Category: Item Name with Suggestions */
                <>
                  <Field label="Item Name" required>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          className={inputClass}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Special Dal Makhani Thali"
                          list="suggested-food-names"
                          required
                        />
                        <datalist id="suggested-food-names">
                          {SUGGESTED_FOOD_ITEMS.map((item, idx) => (
                            <option key={idx} value={item} />
                          ))}
                        </datalist>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-poppins font-medium text-gray-500">
                          Or pick from list:
                        </span>
                        <select
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-nunito text-dark cursor-pointer flex-1"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setForm((prev) => ({ ...prev, name: e.target.value }))
                            }
                          }}
                        >
                          <option value="">-- Choose suggested food item --</option>
                          {SUGGESTED_FOOD_ITEMS.map((name, idx) => (
                            <option key={idx} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </Field>

                  <Field label="Local / Regional Name (Optional)">
                    <input
                      className={inputClass}
                      value={form.localName}
                      onChange={(e) => setForm({ ...form, localName: e.target.value })}
                      placeholder="e.g. दाल मखनी थाली"
                    />
                  </Field>
                </>
              )}

              <Field label="Description">
                <textarea
                  className={`${inputClass} min-h-[70px] resize-none`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description for customers"
                />
              </Field>

              <Field label="Price (₹)" required>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                  <input
                    type="number"
                    min="1"
                    className={`${inputClass} pl-8`}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="149"
                    required
                  />
                </div>
              </Field>

              <Field label="Type">
                <div className="flex gap-3">
                  {["veg", "non_veg"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, itemType: t })}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg border text-xs font-poppins font-medium cursor-pointer transition-colors",
                        form.itemType === t
                          ? t === "veg" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray"
                      )}
                    >
                      <Leaf size={13} className="inline mr-1" />
                      {t === "veg" ? "Veg" : "Non-Veg"}
                    </button>
                  ))}
                </div>
              </Field>



              <Field label={`Photos (${existingImages.length + pendingImages.length}/${MAX_IMAGES})`}>

                <input

                  ref={imageInputRef}

                  type="file"

                  accept="image/jpeg,image/png,image/webp,image/gif"

                  multiple

                  className="hidden"

                  onChange={(e) => {

                    addPendingFiles(e.target.files, "image")

                    e.target.value = ""

                  }}

                />

                <button

                  type="button"

                  onClick={() => imageInputRef.current?.click()}

                  disabled={existingImages.length + pendingImages.length >= MAX_IMAGES}

                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary text-sm font-poppins font-medium hover:bg-primary/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"

                >

                  <Upload size={16} /> Upload photos

                </button>

                {(existingImages.length > 0 || pendingImages.length > 0) && (

                  <div className="grid grid-cols-3 gap-2 mt-3">

                    {existingImages.map((url, i) => (

                      <div key={`ex-img-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">

                        <img src={url} alt="" className="w-full h-full object-cover" />

                        <button

                          type="button"

                          onClick={() => removeExistingImage(i)}

                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white cursor-pointer"

                        >

                          <X size={12} />

                        </button>

                      </div>

                    ))}

                    {pendingImages.map((p, i) => (

                      <div key={`new-img-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">

                        <img src={p.preview} alt="" className="w-full h-full object-cover" />

                        <button

                          type="button"

                          onClick={() => removePendingImage(i)}

                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white cursor-pointer"

                        >

                          <X size={12} />

                        </button>

                      </div>

                    ))}

                  </div>

                )}

              </Field>



              <Field label={`Videos (${existingVideos.length + pendingVideos.length}/${MAX_VIDEOS})`}>

                <input

                  ref={videoInputRef}

                  type="file"

                  accept="video/mp4,video/webm,video/quicktime"

                  multiple

                  className="hidden"

                  onChange={(e) => {

                    addPendingFiles(e.target.files, "video")

                    e.target.value = ""

                  }}

                />

                <button

                  type="button"

                  onClick={() => videoInputRef.current?.click()}

                  disabled={existingVideos.length + pendingVideos.length >= MAX_VIDEOS}

                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray text-sm font-poppins font-medium hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"

                >

                  <Video size={16} /> Upload videos

                </button>

                {(existingVideos.length > 0 || pendingVideos.length > 0) && (

                  <div className="space-y-2 mt-3">

                    {existingVideos.map((url, i) => (

                      <div key={`ex-vid-${i}`} className="relative rounded-lg overflow-hidden bg-gray-900">

                        <video src={url} className="w-full max-h-32 object-contain" controls />

                        <button

                          type="button"

                          onClick={() => removeExistingVideo(i)}

                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white cursor-pointer"

                        >

                          <X size={14} />

                        </button>

                      </div>

                    ))}

                    {pendingVideos.map((p, i) => (

                      <div key={`new-vid-${i}`} className="relative rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center min-h-[80px]">

                        <Play size={24} className="text-white/60 absolute" />

                        <p className="text-white/80 text-xs font-nunito px-3 truncate w-full text-center relative z-10">

                          {p.file.name}

                        </p>

                        <button

                          type="button"

                          onClick={() => removePendingVideo(i)}

                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white cursor-pointer z-10"

                        >

                          <X size={14} />

                        </button>

                      </div>

                    ))}

                  </div>

                )}

                <p className="font-nunito text-[11px] text-gray mt-1.5">MP4, WebM or MOV</p>

              </Field>



              {error && (

                <p className="text-error text-sm font-nunito bg-error/10 px-4 py-2 rounded-lg">{error}</p>

              )}

              <div className="flex gap-3 pt-2">

                <Button type="button" variant="outline" className="flex-1 !rounded-lg" onClick={closeForm}>

                  Cancel

                </Button>

                <Button type="submit" className="flex-1 !rounded-lg" disabled={saving}>

                  {saving ? "Saving..." : editingId ? "Update Item" : "Add Item"}

                </Button>

              </div>

            </form>

          </div>

        </div>

      )}



    </KitchenLayout>

  )

}



const inputClass =

  "w-full px-4 py-3 bg-[#f4f4f5] rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-nunito text-sm"







function Field({ label, required, children }) {

  return (

    <div>

      <label className="font-poppins text-sm font-medium text-dark-light block mb-1.5">

        {label}{required && <span className="text-accent ml-0.5">*</span>}

      </label>

      {children}

    </div>

  )

}


