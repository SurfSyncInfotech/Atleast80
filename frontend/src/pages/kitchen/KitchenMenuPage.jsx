import { useEffect, useState, useRef, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"

import {

  Plus, UtensilsCrossed, Lock, Leaf, IndianRupee,

  Upload, X, Video, Play, Tag,

} from "lucide-react"

import KitchenLayout from "../../components/layout/KitchenLayout"
import KitchenMenuTable from "../../components/kitchen/KitchenMenuTable"
import Button from "../../components/ui/Button"
import TablePagination from "../../components/ui/TablePagination"

import { useAuth } from "../../context/AuthContext"

import { api, uploadMenuFiles } from "../../lib/api"

import { resolveMediaUrl, resolveMenuItemMedia } from "../../lib/media"

import { paginateSlice } from "../../lib/pagination"

import { cn } from "../../lib/utils"



const emptyForm = {

  name: "",

  description: "",

  price: "",

  category: "food",

  itemType: "veg",

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



  const loadMenu = async () => {

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

    refreshKitchen().catch(() => {})

  }, [refreshKitchen])



  useEffect(() => {

    if (isApproved) loadMenu()

    else setLoading(false)

  }, [isApproved, kitchen?.status])

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

    setExistingImages([])

    setExistingVideos([])

    setPendingImages([])

    setPendingVideos([])

    setEditingId(null)

    setShowForm(true)

    setError("")

  }







  const openEdit = (item) => {

    setForm({

      name: item.name,

      description: item.description || "",

      price: String(item.price),

      category: item.category,

      itemType: item.item_type,

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



      const payload = {

        ...form,

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

              <Field label="Item Name" required>

                <input

                  className={inputClass}

                  value={form.name}

                  onChange={(e) => setForm({ ...form, name: e.target.value })}

                  placeholder="e.g. Dal Makhani Thali"

                  required

                />

              </Field>

              <Field label="Description">

                <textarea

                  className={`${inputClass} min-h-[80px] resize-none`}

                  value={form.description}

                  onChange={(e) => setForm({ ...form, description: e.target.value })}

                  placeholder="Short description for customers"

                />

              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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

                <Field label="Category" required>

                  <select

                    className={inputClass}

                    value={form.category}

                    onChange={(e) => setForm({ ...form, category: e.target.value })}

                  >

                    <option value="food">Food</option>

                    <option value="grocery">Grocery</option>

                  </select>

                </Field>

              </div>

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


