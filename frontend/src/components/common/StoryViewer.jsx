import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react"
import { resolveMediaUrl } from "../../lib/media"
import KitchenAvatar from "./KitchenAvatar"
import { cn } from "../../lib/utils"

const IMAGE_DURATION = 5000

export default function StoryViewer({ groups, initialGroupIndex = 0, onClose }) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef(null)
  const timerRef = useRef(null)

  const group = groups[groupIndex]
  const story = group?.stories[storyIndex]
  const mediaUrl = story ? resolveMediaUrl(story.mediaUrl) : null

  const goNext = useCallback(() => {
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1)
      setProgress(0)
      return
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1)
      setStoryIndex(0)
      setProgress(0)
      return
    }
    onClose()
  }, [group, storyIndex, groupIndex, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      setProgress(0)
      return
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1]
      setGroupIndex((i) => i - 1)
      setStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [storyIndex, groupIndex, groups])

  useEffect(() => {
    if (!story || story.mediaType === "video") return undefined

    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / IMAGE_DURATION) * 100, 100)
      setProgress(pct)
      if (elapsed >= IMAGE_DURATION) goNext()
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [story, groupIndex, storyIndex, goNext])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose, goNext, goPrev])

  if (!group || !story) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3 safe-top">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <KitchenAvatar
              kitchen={{ name: group.kitchenName, image: group.kitchenImage }}
              image={group.kitchenImage}
              size="sm"
            />
            <div className="min-w-0">
              <p className="font-poppins font-semibold text-white text-sm truncate">{group.kitchenName}</p>
              <p className="font-nunito text-white/60 text-[10px]">
                {new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {story.mediaType === "video" && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-2 text-white/80 hover:text-white cursor-pointer"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center">
          {story.mediaType === "video" ? (
            <video
              ref={videoRef}
              key={mediaUrl}
              src={mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              playsInline
              muted={muted}
              onEnded={goNext}
              onTimeUpdate={(e) => {
                const v = e.currentTarget
                if (v.duration) setProgress((v.currentTime / v.duration) * 100)
              }}
            />
          ) : (
            <img
              key={mediaUrl}
              src={mediaUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          onClick={goPrev}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          onClick={goNext}
          aria-label="Next"
        />

        {/* Desktop arrows */}
        <button
          type="button"
          onClick={goPrev}
          className={cn(
            "hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white cursor-pointer",
            groupIndex === 0 && storyIndex === 0 && "opacity-30 pointer-events-none"
          )}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white cursor-pointer"
        >
          <ChevronRight size={24} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
