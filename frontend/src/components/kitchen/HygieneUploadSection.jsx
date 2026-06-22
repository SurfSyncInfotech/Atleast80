import { useEffect, useRef, useState } from "react"
import { Upload, Trash2, Image, Video, ShieldCheck, Send } from "lucide-react"
import Button from "../ui/Button"
import { api, uploadFiles } from "../../lib/api"
import { cn } from "../../lib/utils"

function PendingPreview({ item, onRemove }) {
  const isVideo = item.file.type.startsWith("video/")

  return (
    <div className="relative group rounded-xl overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5 aspect-square">
      {isVideo ? (
        <video src={item.previewUrl} className="w-full h-full object-cover" muted />
      ) : (
        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
      )}
      <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center">
        {isVideo ? <Video size={14} className="text-white" /> : <Image size={14} className="text-white" />}
      </div>
      <span className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-nunito font-medium text-white bg-primary/90 rounded-md py-0.5 px-1">
        Not submitted
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function HygieneUploadSection({ compact = false, onChange }) {
  const inputRef = useRef(null)
  const pendingRef = useRef([])
  const [items, setItems] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  pendingRef.current = pendingFiles

  const load = async () => {
    setLoading(true)
    try {
      const data = await api("/api/stories/verification/me")
      setItems(data.stories || [])
      onChange?.(data.stories?.length || 0)
    } catch {
      setItems([])
      onChange?.(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setError("")
    setSuccess("")

    const next = files.map((file) => ({
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

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      await uploadFiles(
        "/api/stories/verification",
        pendingFiles.map((p) => p.file)
      )
      pendingFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setPendingFiles([])
      setSuccess(`${pendingFiles.length} file(s) submitted for admin review.`)
      await load()
    } catch (err) {
      setError(err.message || "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api(`/api/stories/verification/${id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err.message || "Failed to remove file")
    }
  }

  const hasPending = pendingFiles.length > 0
  const hasSubmitted = items.length > 0

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
              {compact ? "Hygiene verification" : "Upload hygiene proof to get approved"}
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-poppins font-bold uppercase tracking-wide px-2.5 py-0.5">
              Required for approval
            </span>
          </div>
          <p className="font-nunito text-sm text-gray mt-1 leading-relaxed">
            Add clear photos and short videos of your kitchen, cooking area, and food preparation.
            Click <strong>Submit</strong> when ready — our admin team will review them and assign your hygiene score.
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
        accept="image/*,video/*"
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
          disabled={submitting}
        >
          <Upload size={16} />
          Add photos & videos
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !hasPending}
        >
          <Send size={16} />
          {submitting ? "Submitting..." : "Submit for review"}
        </Button>
      </div>

      {loading ? (
        <p className="font-nunito text-sm text-gray">Loading uploads...</p>
      ) : !hasPending && !hasSubmitted ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-cream/50 p-6 text-center">
          <p className="font-nunito text-sm text-gray">No hygiene media added yet.</p>
          <p className="font-nunito text-xs text-gray mt-1">
            Add at least one photo or video, then click Submit for admin review.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {hasPending && (
            <div>
              <p className="font-poppins text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                Ready to submit ({pendingFiles.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pendingFiles.map((item) => (
                  <PendingPreview key={item.id} item={item} onRemove={removePending} />
                ))}
              </div>
            </div>
          )}

          {hasSubmitted && (
            <div>
              <p className="font-poppins text-xs font-semibold text-gray mb-2 uppercase tracking-wide">
                Submitted ({items.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                    {item.mediaType === "video" ? (
                      <video src={item.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center">
                      {item.mediaType === "video" ? (
                        <Video size={14} className="text-white" />
                      ) : (
                        <Image size={14} className="text-white" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasSubmitted && (
        <p className="font-nunito text-xs text-primary mt-4 bg-primary/5 rounded-lg px-3 py-2">
          {items.length} file(s) submitted. Admin will verify hygiene and assign your score after review.
        </p>
      )}
    </div>
  )
}
