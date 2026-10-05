import { useRef, useState } from "react"
import { Upload, Trash2, Image as ImageIcon, ShieldCheck, Send } from "lucide-react"
import Button from "../ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api, uploadKitchenImages } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

export default function HygieneUploadSection({ compact = false, onChange }) {
  const inputRef = useRef(null)
  const { kitchen, refreshKitchen } = useAuth()
  const [pendingFiles, setPendingFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const existingImages = kitchen?.kitchenImages || []
  const totalCount = existingImages.length + pendingFiles.length

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setError("")
    setSuccess("")

    const remainingAllowed = 5 - existingImages.length
    if (remainingAllowed <= 0) {
      setError("Maximum 5 cooking area setup photos allowed.")
      return
    }

    const selected = files.slice(0, remainingAllowed)
    const combinedCount = existingImages.length + selected.length

    if (combinedCount < 2) {
      setError("At least 2 cooking area setup photos are required. Please select at least 2 photos.")
    }

    const next = selected.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setPendingFiles((prev) => [...prev, ...next])
    if (inputRef.current) inputRef.current.value = ""
  }

  const removePending = (id) => {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSubmit = async () => {
    if (pendingFiles.length === 0) return
    if (existingImages.length === 0 && pendingFiles.length < 2) {
      setError("At least 2 cooking area setup photos are required for submission.")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      await uploadKitchenImages(pendingFiles.map((p) => p.file))
      pendingFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setPendingFiles([])
      await refreshKitchen()
      setSuccess("Cooking area setup photos uploaded successfully for admin review!")
      onChange?.(kitchen?.kitchenImages?.length || pendingFiles.length)
    } catch (err) {
      setError(err.message || "Upload failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExisting = async (url) => {
    if (!window.confirm("Delete this cooking area setup photo?")) return

    setDeletingUrl(url)
    setError("")
    try {
      await api("/api/kitchens/me/images", {
        method: "DELETE",
        body: JSON.stringify({ imageUrl: url }),
      }, "kitchen")
      await refreshKitchen()
      setSuccess("Photo deleted")
      onChange?.(kitchen?.kitchenImages?.length ? kitchen.kitchenImages.length - 1 : 0)
    } catch (err) {
      setError(err.message || "Failed to delete photo")
    } finally {
      setDeletingUrl(null)
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        compact ? "bg-white border-gray-100 p-5" : "bg-gradient-to-br from-primary/5 via-white to-secondary/10 border-primary/20 p-6"
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-poppins font-semibold text-dark">
              Cooking Area Setup Photos
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-poppins font-bold uppercase tracking-wide px-2.5 py-0.5">
              Min 2 Required for Approval
            </span>
          </div>
          <p className="font-nunito text-sm text-gray mt-1 leading-relaxed">
            Upload at least 2 clear photos of your cooking area and kitchen setup. Admin will review these photos to verify your kitchen.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700 font-nunito">
          {success}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={submitting || existingImages.length >= 5}
        >
          <Upload size={16} />
          Add Photos
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || pendingFiles.length === 0}
        >
          <Send size={16} />
          {submitting ? "Uploading..." : "Submit Photos for Review"}
        </Button>
      </div>

      {existingImages.length === 0 && pendingFiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-cream/50 p-6 text-center">
          <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="font-nunito text-sm font-semibold text-dark">No cooking area setup photos uploaded yet.</p>
          <p className="font-nunito text-xs text-gray mt-1">
            Please upload at least 2 clear photos of your cooking area for Admin review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {existingImages.map((url, idx) => (
            <div key={url} className="relative group rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50 aspect-square">
              <img src={resolveMediaUrl(url)} alt={`Cooking area ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-poppins font-bold text-white bg-emerald-700 rounded px-1.5 py-0.5 shadow-sm">
                Setup {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteExisting(url)}
                disabled={deletingUrl === url}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {pendingFiles.map((item) => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5 aspect-square">
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-poppins font-bold text-white bg-amber-500 rounded px-1.5 py-0.5 shadow-sm">
                Ready
              </span>
              <button
                type="button"
                onClick={() => removePending(item.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="font-nunito text-xs text-gray mt-3">
        {totalCount}/5 photos selected. {totalCount < 2 ? "Minimum 2 photos required." : "Photos ready for Admin review."}
      </p>
    </div>
  )
}
