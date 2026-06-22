import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, ImageIcon, Film, Trash2, Loader2, PlusCircle } from "lucide-react"
import { api, uploadStoryFiles } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

export default function KitchenStoryModal({ open, onClose }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState([])
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  const loadStories = async () => {
    setLoading(true)
    try {
      const data = await api("/api/stories/me")
      setStories(data.stories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setError("")
      setPending([])
      loadStories()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    )
    if (!files.length) return
    setPending((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
      })),
    ])
  }

  const removePending = (index) => {
    setPending((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }

  const handleUpload = async () => {
    if (!pending.length) return
    setUploading(true)
    setError("")
    try {
      await uploadStoryFiles(pending.map((p) => p.file))
      pending.forEach((p) => URL.revokeObjectURL(p.preview))
      setPending([])
      await loadStories()
    } catch (err) {
      setError(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this story?")) return
    try {
      await api(`/api/stories/${id}`, { method: "DELETE" })
      setStories((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-poppins font-bold text-dark text-lg">Kitchen Stories</h2>
              <p className="font-nunito text-gray text-xs mt-0.5">Upload photos &amp; videos like Instagram</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-nunito">{error}</p>
            )}

            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-primary/30 rounded-2xl p-6 text-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <PlusCircle size={24} className="text-primary" />
              </div>
              <p className="font-poppins font-semibold text-sm text-dark">Add story photos or videos</p>
              <p className="font-nunito text-xs text-gray mt-1">JPG, PNG, WebP, MP4, WebM · Multiple files OK</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </div>

            {pending.length > 0 && (
              <div>
                <p className="font-poppins text-xs font-semibold text-gray uppercase tracking-wide mb-2">Ready to upload</p>
                <div className="grid grid-cols-3 gap-2">
                  {pending.map((item, i) => (
                    <div key={i} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                      {item.type === "video" ? (
                        <video src={item.preview} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removePending(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {uploading ? "Uploading..." : `Upload ${pending.length} item${pending.length > 1 ? "s" : ""}`}
                </button>
              </div>
            )}

            <div>
              <p className="font-poppins text-xs font-semibold text-gray uppercase tracking-wide mb-2">
                Your live stories ({stories.length})
              </p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : stories.length === 0 ? (
                <p className="font-nunito text-sm text-gray text-center py-6 bg-gray-50 rounded-xl">
                  No stories yet. Upload your first story above!
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {stories.map((s) => (
                    <div key={s.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 group">
                      {s.mediaType === "video" ? (
                        <video src={resolveMediaUrl(s.mediaUrl)} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={resolveMediaUrl(s.mediaUrl)} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px] font-poppins flex items-center gap-0.5">
                        {s.mediaType === "video" ? <Film size={10} /> : <ImageIcon size={10} />}
                        {s.mediaType}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="absolute bottom-1 right-1 w-7 h-7 bg-red-500/90 rounded-full flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label="Delete story"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
