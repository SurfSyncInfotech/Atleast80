import { useEffect, useState, useRef } from "react"

import {

  Plus, Trash2, Pencil, UtensilsCrossed, Lock, Leaf, ImageIcon, IndianRupee,

  Upload, X, Video, Play, Tag,

} from "lucide-react"

import KitchenLayout from "../../components/layout/KitchenLayout"

import Button from "../../components/ui/Button"

import { useAuth } from "../../context/AuthContext"

import { api, uploadMenuFiles } from "../../lib/api"

import { resolveMediaUrl, resolveMenuItemMedia } from "../../lib/media"

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

  const [showOfferModal, setShowOfferModal] = useState(false)

  const [globalOffer, setGlobalOffer] = useState("")

  const [itemOffers, setItemOffers] = useState({})

  const [offerItemId, setOfferItemId] = useState("")

  const [offerItemText, setOfferItemText] = useState("")

  const [savingOffers, setSavingOffers] = useState(false)

  const imageInputRef = useRef(null)

  const videoInputRef = useRef(null)



  const isApproved = kitchen?.status === "approved"



  const loadMenu = async () => {

    if (!isApproved) return

    setLoading(true)

    try {

      const data = await api("/api/menu/me")

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



  const openOfferModal = () => {

    setGlobalOffer(kitchen?.offer || "")

    const map = {}

    items.forEach((item) => {

      map[item.id] = item.offer || ""

    })

    setItemOffers(map)

    setOfferItemId("")

    setOfferItemText("")

    setShowOfferModal(true)

    setError("")

  }



  const saveOffers = async () => {

    setSavingOffers(true)

    setError("")

    try {

      await api("/api/kitchens/me/offer", {

        method: "PATCH",

        body: JSON.stringify({ offer: globalOffer.trim() || null }),

      })

      for (const item of items) {

        const nextOffer = (itemOffers[item.id] || "").trim() || null

        const prevOffer = item.offer || null

        if (nextOffer !== prevOffer) {

          await api(`/api/menu/${item.id}`, {

            method: "PUT",

            body: JSON.stringify({ offer: nextOffer }),

          })

        }

      }

      await refreshKitchen()

      await loadMenu()

      setShowOfferModal(false)

    } catch (err) {

      setError(err.message)

    } finally {

      setSavingOffers(false)

    }

  }



  const handleOfferItemSelect = (itemId) => {

    setOfferItemId(itemId)

    setOfferItemText(itemId ? stripRupeeForInput(itemOffers[itemId]) : "")

  }



  const addItemOffer = () => {

    if (!offerItemId) {

      setError("Select a menu item")

      return

    }

    if (!offerItemText.trim()) {

      setError("Enter offer details")

      return

    }

    setItemOffers((prev) => ({ ...prev, [offerItemId]: formatOfferWithRupee(offerItemText) }))

    setOfferItemId("")

    setOfferItemText("")

    setError("")

  }



  const removeItemOffer = (itemId) => {

    setItemOffers((prev) => ({ ...prev, [itemId]: "" }))

    if (offerItemId === String(itemId)) {

      setOfferItemId("")

      setOfferItemText("")

    }

  }



  const configuredItemOffers = items.filter((item) => (itemOffers[item.id] || "").trim())



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

        })

      } else {

        await api("/api/menu", {

          method: "POST",

          body: JSON.stringify(payload),

        })

      }



      closeForm()

      await loadMenu()

    } catch (err) {

      setError(err.message)

    } finally {

      setSaving(false)

    }

  }



  const handleDelete = async (id) => {

    if (!confirm("Remove this item from your menu?")) return

    try {

      await api(`/api/menu/${id}`, { method: "DELETE" })

      await loadMenu()

    } catch (err) {

      alert(err.message)

    }

  }



  const toggleAvailability = async (item) => {

    try {

      await api(`/api/menu/${item.id}`, {

        method: "PUT",

        body: JSON.stringify({ isAvailable: !item.is_available }),

      })

      await loadMenu()

    } catch (err) {

      alert(err.message)

    }

  }



  const getItemCover = (item) => {
    const raw = item.images?.length ? item.images[0] : item.image || null
    return resolveMediaUrl(raw)
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

          <Button size="sm" variant="outline" onClick={openOfferModal} className="!rounded-lg">

            <Tag size={16} /> Add Offer

          </Button>

          <Button size="sm" onClick={openAdd} className="!rounded-lg">

            <Plus size={16} /> Add Item

          </Button>

        </div>

      </div>



      <div className="flex flex-wrap gap-2 mb-5">

        {["all", "food", "grocery"].map((cat) => (

          <span

            key={cat}

            className="px-3 sm:px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-poppins font-medium text-gray capitalize"

          >

            {cat === "all" ? `All (${items.length})` : `${cat} (${items.filter((i) => i.category === cat).length})`}

          </span>

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

      ) : (

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">

          {items.map((item) => {

            const cover = getItemCover(item)

            const imageCount = item.images?.length || (item.image ? 1 : 0)

            const videoCount = item.videos?.length || 0



            return (

              <div

                key={item.id}

                className={cn(

                  "bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm",

                  !item.is_available && "opacity-60"

                )}

              >

                <div className="h-36 bg-gray-100 relative">

                  {cover ? (

                    <img src={cover} alt={item.name} className="w-full h-full object-cover" />

                  ) : (

                    <div className="w-full h-full flex items-center justify-center">

                      <ImageIcon size={32} className="text-gray-light" />

                    </div>

                  )}

                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">

                    <span className="text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-white/90 text-dark capitalize">

                      {item.category}

                    </span>

                    <span className={cn(

                      "text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full",

                      item.item_type === "veg" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"

                    )}>

                      {item.item_type === "veg" ? "Veg" : "Non-Veg"}

                    </span>

                    {imageCount > 1 && (

                      <span className="text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">

                        +{imageCount - 1} photos

                      </span>

                    )}

                    {videoCount > 0 && (

                      <span className="text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white flex items-center gap-0.5">

                        <Video size={10} /> {videoCount}

                      </span>

                    )}

                  </div>

                  {!item.is_available && (

                    <span className="absolute top-2 right-2 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-white">

                      Unavailable

                    </span>

                  )}

                </div>

                <div className="p-4">

                  <div className="flex items-start justify-between gap-2">

                    <h3 className="font-poppins font-semibold text-sm text-dark">{item.name}</h3>

                    <span className="font-poppins font-bold text-primary text-sm flex-shrink-0">

                      ₹{Number(item.price)}

                    </span>

                  </div>

                  {item.offer && (

                    <p className="inline-flex mt-1.5 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">

                      {item.offer}

                    </p>

                  )}

                  {item.description && (

                    <p className="font-nunito text-xs text-gray mt-1 line-clamp-2">{item.description}</p>

                  )}

                  <div className="flex gap-2 mt-4">

                    <button

                      onClick={() => openEdit(item)}

                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-200 text-xs font-poppins font-medium text-dark hover:bg-gray-50 cursor-pointer"

                    >

                      <Pencil size={13} /> Edit

                    </button>

                    <button

                      onClick={() => toggleAvailability(item)}

                      className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-poppins font-medium text-dark hover:bg-gray-50 cursor-pointer"

                    >

                      {item.is_available ? "Disable" : "Enable"}

                    </button>

                    <button

                      onClick={() => handleDelete(item.id)}

                      className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"

                    >

                      <Trash2 size={14} />

                    </button>

                  </div>

                </div>

              </div>

            )

          })}

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

      {showOfferModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">

          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl flex flex-col">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

              <div>

                <h2 className="font-poppins font-bold text-dark text-lg">Manage Offers</h2>

                <p className="font-nunito text-xs text-gray mt-0.5">Kitchen-wide and per-item deals</p>

              </div>

              <button

                type="button"

                onClick={() => setShowOfferModal(false)}

                className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"

                aria-label="Close"

              >

                <X size={18} />

              </button>

            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

              <div>

                <label className="font-poppins text-sm font-semibold text-dark block mb-2">

                  Kitchen-wide offer

                </label>

                <input

                  className={inputClass}

                  value={globalOffer}

                  onChange={(e) => setGlobalOffer(e.target.value)}

                  placeholder="e.g. 20% off first order, Free delivery"

                />

                <p className="font-nunito text-[11px] text-gray mt-1.5">

                  Shown on your kitchen card and offers tab

                </p>

              </div>

              <div>

                <label className="font-poppins text-sm font-semibold text-dark block mb-2">

                  Per-item offers

                </label>

                {items.length === 0 ? (

                  <p className="font-nunito text-sm text-gray">Add menu items first to set item offers.</p>

                ) : (

                  <div className="space-y-3">

                    <div className="flex flex-col sm:flex-row gap-2">

                      <select

                        className={cn(inputClass, "sm:flex-1")}

                        value={offerItemId}

                        onChange={(e) => handleOfferItemSelect(e.target.value)}

                      >

                        <option value="">Select menu item</option>

                        {items.map((item) => (

                          <option key={item.id} value={item.id}>

                            {item.name} (₹{Number(item.price)})

                          </option>

                        ))}

                      </select>

                      <RupeeOfferInput

                        className="sm:flex-1"

                        value={offerItemText}

                        onChange={setOfferItemText}

                        placeholder="50 off"

                        disabled={!offerItemId}

                      />

                    </div>

                    <Button

                      type="button"

                      size="sm"

                      variant="outline"

                      className="!rounded-lg w-full sm:w-auto"

                      onClick={addItemOffer}

                      disabled={!offerItemId}

                    >

                      Add item offer

                    </Button>

                    {configuredItemOffers.length > 0 && (

                      <div className="space-y-2 pt-1">

                        {configuredItemOffers.map((item) => (

                          <div

                            key={item.id}

                            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-[#f8f8f8] px-3 py-2"

                          >

                            <span className="font-nunito text-xs text-dark flex-1 truncate">{item.name}</span>

                            <span className="font-poppins text-[11px] font-semibold text-accent flex-shrink-0">

                              {itemOffers[item.id]}

                            </span>

                            <button

                              type="button"

                              onClick={() => removeItemOffer(item.id)}

                              className="p-1 rounded-md hover:bg-gray-200 cursor-pointer text-gray"

                              aria-label="Remove offer"

                            >

                              <X size={14} />

                            </button>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                )}

              </div>

              {error && (

                <p className="text-error text-sm font-nunito bg-error/10 border border-error/20 px-3 py-2 rounded-lg">

                  {error}

                </p>

              )}

            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">

              <Button variant="outline" className="flex-1 !rounded-lg" onClick={() => setShowOfferModal(false)}>

                Cancel

              </Button>

              <Button className="flex-1 !rounded-lg" onClick={saveOffers} disabled={savingOffers}>

                {savingOffers ? "Saving..." : "Save Offers"}

              </Button>

            </div>

          </div>

        </div>

      )}

    </KitchenLayout>

  )

}



const inputClass =

  "w-full px-4 py-3 bg-[#f4f4f5] rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-nunito text-sm"



function stripRupeeForInput(value) {

  return (value || "").replace(/^₹\s*/, "").trim()

}



function formatOfferWithRupee(value) {

  const stripped = stripRupeeForInput(value)

  if (!stripped) return ""

  return `₹${stripped}`

}



function RupeeOfferInput({ value, onChange, placeholder, disabled, className }) {

  return (

    <div className={cn("relative", className)}>

      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-nunito text-sm text-dark font-semibold pointer-events-none">

        ₹

      </span>

      <input

        className={cn(inputClass, "pl-9")}

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        disabled={disabled}

      />

    </div>

  )

}



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


