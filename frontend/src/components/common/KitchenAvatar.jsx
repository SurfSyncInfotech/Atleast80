import { useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const SIZES = {
  sm: { box: "w-10 h-10", text: "text-sm", icon: 14 },
  md: { box: "w-14 h-14", text: "text-xl", icon: 16 },
  lg: { box: "w-20 h-20", text: "text-2xl", icon: 18 },
  xl: { box: "w-24 h-24", text: "text-3xl", icon: 22 },
}

export default function KitchenAvatar({
  kitchen,
  name,
  image,
  size = "md",
  className,
  rounded = "2xl",
  editable = false,
  uploading = false,
  onUpload,
}) {
  const inputRef = useRef(null)
  const s = SIZES[size] || SIZES.md
  const displayName = name || kitchen?.name
  const logoUrl = resolveMediaUrl(image ?? kitchen?.image)
  const initial = displayName?.[0]?.toUpperCase() || "K"
  const roundClass = rounded === "full" ? "rounded-full" : "rounded-2xl"

  const avatar = logoUrl ? (
    <img
      src={logoUrl}
      alt={displayName || "Kitchen"}
      className={cn(s.box, roundClass, "object-cover ring-2 ring-white/20 shadow-md")}
    />
  ) : (
    <div
      className={cn(
        s.box,
        roundClass,
        "bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-poppins font-bold shadow-md ring-2 ring-white/20",
        s.text
      )}
    >
      {initial}
    </div>
  )

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file && onUpload) onUpload(file)
    e.target.value = ""
  }

  if (editable) {
    return (
      <div className={cn("relative inline-flex", className)}>
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={cn("relative group cursor-pointer disabled:cursor-wait", roundClass)}
          aria-label="Upload kitchen logo"
        >
          {avatar}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity",
              roundClass,
              uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {uploading ? (
              <Loader2 size={s.icon} className="text-white animate-spin" />
            ) : (
              <Camera size={s.icon} className="text-white" />
            )}
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    )
  }

  return <div className={cn("inline-flex flex-shrink-0", className)}>{avatar}</div>
}
