import { useEffect, useRef, useState } from "react"
import { MapPin } from "lucide-react"
import StateCitySelect from "./StateCitySelect"
import { useLocationPreference, getLocationPreference, useAutoDetectLocation } from "../../lib/locationPreference"
import { cn } from "../../lib/utils"

export default function LocationPicker({ transparent = false, className }) {
  const { state, city, setLocation, label } = useLocationPreference()
  const { detecting } = useAutoDetectLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const display = detecting ? "Detecting..." : label || "Select location"

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={display}
        className={cn(
          "flex items-center gap-1.5 cursor-pointer group transition-all duration-200",
          transparent
            ? "md:px-4 md:py-2.5 md:rounded-full md:bg-white/10 md:backdrop-blur-sm md:border md:border-white/20 md:hover:bg-white/20"
            : "md:px-4 md:py-2.5 md:rounded-full md:bg-white md:border md:border-gray-light md:hover:border-primary md:hover:shadow-sm"
        )}
      >
        <MapPin size={transparent ? 15 : 18} className={transparent ? "text-secondary flex-shrink-0" : "text-primary flex-shrink-0"} />
        <div className="text-left min-w-0">
          <p className={cn("text-xs", transparent ? "text-white/70" : "text-gray")}>Delivering to</p>
          <p
            className={cn(
              "text-sm font-poppins font-semibold truncate max-w-[140px] sm:max-w-[180px]",
              transparent ? "text-white group-hover:text-white" : "text-dark group-hover:text-primary"
            )}
          >
            {display} <span className="text-xs opacity-70">▼</span>
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-[100] w-[min(100vw-2rem,320px)] bg-white rounded-xl shadow-xl border border-gray-100 p-4">
          <p className="font-poppins font-semibold text-sm text-dark mb-1">Choose state & city</p>
          {label && (
            <p className="font-nunito text-xs text-gray mb-3 border-b border-gray-100 pb-2">
              Current: <span className="text-primary font-semibold">{label}</span>
            </p>
          )}
          <StateCitySelect
            state={state}
            city={city}
            variant="light"
            disabled={detecting}
            onStateChange={(value) => setLocation(value, "")}
            onCityChange={(value) => {
              const current = getLocationPreference()
              setLocation(current.state, value)
              if (value) setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
