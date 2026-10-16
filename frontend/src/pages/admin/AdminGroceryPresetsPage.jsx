import { useEffect, useState, useRef } from "react"
import {
  ShoppingBag, Plus, Trash2, Edit2, Upload, Eye, EyeOff, X, Search, Image as ImageIcon
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function AdminGroceryPresetsPage() {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Form State - Name & Image
  const [name, setName] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const fileInputRef = useRef(null)

  const fetchPresets = async () => {
    setLoading(true)
    try {
      const res = await api("/api/admin/grocery-presets", {}, "admin")
      setPresets(res.presets || [])
    } catch (err) {
      console.error("Failed to load presets", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPresets()
  }, [])

  const openAddModal = () => {
    setEditingPreset(null)
    setName("")
    setSelectedFile(null)
    setPreviewUrl("")
    setError("")
    setModalOpen(true)
  }

  const openEditModal = (p) => {
    setEditingPreset(p)
    setName(p.name || "")
    setSelectedFile(null)
    setPreviewUrl(p.image || "")
    setError("")
    setModalOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter the item name")
      return
    }

    if (!editingPreset && !selectedFile && !previewUrl) {
      setError("Please select an image to upload")
      return
    }

    setSaving(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      if (selectedFile) {
        formData.append("image", selectedFile)
      } else if (previewUrl) {
        formData.append("image", previewUrl)
      }

      if (editingPreset) {
        await api(`/api/admin/grocery-presets/${editingPreset.id}`, {
          method: "PUT",
          body: formData,
        }, "admin")
      } else {
        await api("/api/admin/grocery-presets", {
          method: "POST",
          body: formData,
        }, "admin")
      }

      setModalOpen(false)
      fetchPresets()
    } catch (err) {
      setError(err.message || "Failed to save preset")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (preset) => {
    try {
      const newStatus = preset.is_active ? 0 : 1
      await api(`/api/admin/grocery-presets/${preset.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: newStatus }),
      }, "admin")
      setPresets((prev) =>
        prev.map((p) => (p.id === preset.id ? { ...p, is_active: newStatus } : p))
      )
    } catch (err) {
      alert("Failed to toggle status: " + err.message)
    }
  }

  const handleDelete = async (preset) => {
    if (!window.confirm(`Are you sure you want to delete "${preset.name || "this item"}"?`)) {
      return
    }
    try {
      await api(`/api/admin/grocery-presets/${preset.id}`, {
        method: "DELETE",
      }, "admin")
      setPresets((prev) => prev.filter((p) => p.id !== preset.id))
    } catch (err) {
      alert("Failed to delete preset: " + err.message)
    }
  }

  const filteredPresets = presets.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={24} className="text-primary" />
              <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">
                Grocery Images Gallery
              </h1>
            </div>
            <p className="font-nunito text-sm text-[#999] mt-1">
              Upload and manage grocery images shown to sellers when adding ration items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-poppins text-gray-500 font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-xs">
              Total: {presets.length} images
            </span>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-poppins font-semibold text-sm rounded-xl hover:bg-primary-dark transition shadow-sm cursor-pointer"
            >
              <Plus size={18} />
              Add Image
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs mb-6">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search items by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm font-nunito focus:outline-none text-dark"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Grid of presets */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 animate-pulse h-52" />
            ))}
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="bg-white border border-[#e8e8e8] p-12 text-center rounded-2xl">
            <ShoppingBag size={40} className="text-[#ccc] mx-auto mb-3" />
            <p className="font-poppins font-semibold text-[#1c1c1c]">No grocery items found</p>
            <p className="font-nunito text-xs text-[#999] mt-1">
              {search ? "No items matching your search." : "Click 'Add Image' to upload one."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between group shadow-xs",
                  preset.is_active ? "border-gray-200 hover:shadow-md" : "border-red-200 opacity-60 bg-gray-50"
                )}
              >
                {/* Image */}
                <div className="relative aspect-square w-full bg-gray-100 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={preset.image}
                    alt={preset.name || "Preset"}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = "/festival_offer_default.jpg"
                    }}
                  />
                  {!preset.is_active && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Disabled
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="px-3 py-2 border-t border-gray-100 bg-white">
                  <h3
                    className="font-poppins font-bold text-xs text-dark line-clamp-1"
                    title={preset.name}
                  >
                    {preset.name || "Grocery Item"}
                  </h3>
                </div>

                {/* Actions */}
                <div className="p-2.5 flex items-center justify-between border-t border-gray-100 bg-gray-50/70">
                  <button
                    onClick={() => handleToggleStatus(preset)}
                    className={cn(
                      "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer",
                      preset.is_active
                        ? "text-emerald-700 hover:bg-emerald-100/60"
                        : "text-amber-700 hover:bg-amber-100/60"
                    )}
                    title={preset.is_active ? "Disable item" : "Enable item"}
                  >
                    {preset.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(preset)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Edit item / replace image"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-primary" />
                  <h2 className="font-poppins font-bold text-base text-dark">
                    {editingPreset ? "Edit Grocery Image" : "Add Grocery Image"}
                  </h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-nunito">
                    {error}
                  </div>
                )}

                {/* Name Input */}
                <div>
                  <label className="text-xs font-poppins font-bold text-dark block mb-1.5">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basmati Rice, Atta, Mustard Oil..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-nunito focus:outline-none focus:border-primary text-dark"
                  />
                  <p className="text-[11px] text-gray-400 font-nunito mt-1">
                    Describe what this image represents.
                  </p>
                </div>

                {/* Image Upload Area */}
                <div>
                  <label className="text-xs font-poppins font-bold text-dark block mb-1.5">
                    Item Image *
                  </label>
                  <div className="flex flex-col items-center">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition flex flex-col items-center justify-center p-3 relative overflow-hidden group"
                    >
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-poppins font-medium">
                            Click to Change Image
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                            <Upload size={20} />
                          </div>
                          <span className="text-xs font-poppins font-bold text-dark block">
                            Choose Image
                          </span>
                          <span className="text-[11px] text-gray-400 font-nunito mt-1 block">
                            PNG, JPG, WebP
                          </span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <p className="text-[11px] text-gray-400 font-nunito text-center mt-2">
                      Upload clear product image with transparent or white background.
                    </p>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm font-poppins font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-primary text-white font-poppins font-semibold text-sm rounded-xl hover:bg-primary-dark transition cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingPreset ? "Update Item" : "Upload Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
