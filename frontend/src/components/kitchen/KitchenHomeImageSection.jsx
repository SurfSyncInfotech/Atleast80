import { useRef, useState } from "react"
import { ImageIcon, Upload, CheckCircle } from "lucide-react"
import Button from "../ui/Button"
import { uploadKitchenCover } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

export default function KitchenHomeImageSection({ kitchen, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const coverUrl = resolveMediaUrl(kitchen?.cover_image || kitchen?.cover)
  const hasCover = Boolean(coverUrl)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploading(true)
    setError("")
    try {
      await uploadKitchenCover(file)
      await onUploaded?.()
    } catch (err) {
      setError(err.message || "Failed to upload home image")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border shadow-sm bg-white border-gray-100 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
          <ImageIcon size={22} className="text-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-poppins font-semibold text-dark">Upload home card image</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-poppins font-bold uppercase tracking-wide px-2.5 py-0.5">
              Required for application
            </span>
          </div>
          <p className="font-nunito text-sm text-gray mt-1 leading-relaxed">
            This image appears on the Atleast80 home page when customers browse kitchens.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleUpload}
      />

      {hasCover ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-gray-100 aspect-[16/10] max-w-md bg-gray-50">
            <img src={coverUrl} alt="Home card preview" className="w-full h-full object-cover" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg bg-primary text-white text-xs font-poppins font-semibold px-2.5 py-1">
              <CheckCircle size={14} />
              Uploaded
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Replace image"}
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border-2 border-dashed border-gray-200 bg-cream/50 p-8 text-center max-w-md",
            uploading && "opacity-60 pointer-events-none"
          )}
        >
          <p className="font-nunito text-sm text-gray">No home image uploaded yet.</p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload home image"}
          </Button>
        </div>
      )}
    </div>
  )
}
