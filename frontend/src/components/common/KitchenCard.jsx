import { Star, Clock, MapPin } from "lucide-react"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const COVER_FALLBACK =
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop"

export default function KitchenCard({ kitchen, className, onClick }) {
  const logoSrc = resolveMediaUrl(kitchen.logo || kitchen.image)
  const coverSrc = resolveMediaUrl(kitchen.cover || kitchen.cover_image) || logoSrc
  const hasCover = Boolean(coverSrc)

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group",
        className
      )}
    >
      <div className="relative h-28 sm:h-32 overflow-hidden bg-gradient-to-br from-primary/90 to-primary-dark">
        {hasCover ? (
          <img
            src={coverSrc}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <img
            src={COVER_FALLBACK}
            alt=""
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {kitchen.offer && (
          <div className="absolute top-2.5 left-2.5 bg-accent text-white px-2 py-0.5 rounded-md text-[10px] font-poppins font-bold shadow-sm">
            {kitchen.offer}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <h3 className="font-poppins font-bold text-dark text-[15px] truncate leading-tight">
          {kitchen.name}
        </h3>
        <p className="text-gray text-xs mt-0.5 truncate font-nunito">{kitchen.speciality}</p>

        {kitchen.city && (
          <p className="flex items-center gap-1 text-gray/70 text-[11px] mt-1.5 font-nunito">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">{kitchen.city}</span>
          </p>
        )}

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1">
            <Star size={13} className="fill-secondary text-secondary" />
            <span className="text-xs font-semibold text-dark font-poppins">{kitchen.rating}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-gray">
            <Clock size={13} />
            <span className="text-xs font-nunito">{kitchen.deliveryTime}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
