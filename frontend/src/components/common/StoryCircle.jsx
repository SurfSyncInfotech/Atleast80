import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const SIZES = {
  md: {
    ring: "w-16 h-16 md:w-[72px] md:h-[72px]",
    text: "text-xl md:text-2xl",
    label: "w-16 md:w-[72px]",
  },
  sm: {
    ring: "w-11 h-11 sm:w-12 sm:h-12",
    text: "text-sm sm:text-base",
    label: "w-11 sm:w-12",
  },
}

export default function StoryCircle({ story, className, onClick, showLabel = true, size = "md" }) {
  const logoUrl = resolveMediaUrl(story.image)
  const initial = story.name?.[0]?.toUpperCase() || "K"
  const s = SIZES[size] || SIZES.md

  return (
    <button
      type="button"
      onClick={onClick}
      title={showLabel ? undefined : story.name}
      className={cn(
        "flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0",
        className
      )}
    >
      <div className={cn(s.ring, "rounded-full p-[3px] bg-gradient-to-br from-secondary via-accent to-primary")}>
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-primary/10">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={story.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-poppins font-bold group-hover:scale-110 transition-transform duration-300",
                s.text
              )}
            >
              {initial}
            </div>
          )}
        </div>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-nunito text-dark-light truncate text-center", s.label)}>
          {story.name}
        </span>
      )}
    </button>
  )
}
