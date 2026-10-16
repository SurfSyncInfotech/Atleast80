import { Store, UtensilsCrossed, AlertTriangle, CheckCircle2, ChevronRight, Star } from "lucide-react"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

export default function DishCard({ dish, userCity, onClick, className }) {
  const hasCityFilter = Boolean(userCity && String(userCity).trim())
  const isCityMatch = dish.isCityMatch ?? (
    hasCityFilter
      ? Boolean(
          dish.city &&
            (dish.city.toLowerCase().trim() === userCity.toLowerCase().trim() ||
              dish.city.toLowerCase().includes(userCity.toLowerCase().trim()) ||
              userCity.toLowerCase().includes(dish.city.toLowerCase().trim()))
        )
      : true
  )

  const priceText =
    dish.price != null && !isNaN(dish.price) && Number(dish.price) > 0
      ? `₹${Number(dish.price).toFixed(0)}`
      : null

  const imageUrl = resolveMediaUrl(dish.image || dish.images?.[0] || dish.kitchenImage || dish.kitchen_image)

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-5 border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group",
        isCityMatch ? "border-emerald-100/90 hover:border-primary/40" : "border-red-100 hover:border-red-300 bg-red-50/20",
        className
      )}
    >
      <div>
        {/* City Availability Notice Banner */}
        {hasCityFilter && !isCityMatch ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs font-nunito font-bold mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500 shrink-0" />
            <span className="truncate">
              Not available in your city{dish.city ? ` (Available in ${dish.city})` : ""}
            </span>
          </div>
        ) : hasCityFilter && isCityMatch ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-[11px] font-nunito font-bold mb-3 flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>Available in your city ({dish.city || userCity})</span>
          </div>
        ) : null}

        {/* Top Header: Dish Details & Food Image */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-poppins font-bold text-dark text-base sm:text-lg group-hover:text-primary transition-colors">
                {dish.dishName || dish.name}
              </h3>
              {dish.isSignatureDish && (
                <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Star size={10} className="fill-amber-600 text-amber-600" />
                  Signature Dish
                </span>
              )}
            </div>

            {/* Price */}
            {priceText && (
              <div className="text-primary font-poppins font-bold text-base mb-1">
                {priceText}
              </div>
            )}

            {/* Kitchen Name */}
            <div className="flex items-center gap-1.5 text-xs text-primary font-poppins font-semibold">
              <Store size={14} className="text-primary shrink-0" />
              <span className="truncate">{dish.kitchenName || dish.kitchen_name}</span>
              {dish.city && (
                <span className="text-gray text-[11px] font-nunito font-normal">
                  • {dish.city}
                </span>
              )}
            </div>

            {/* Short Description */}
            {(dish.shortDescription || dish.description) && (
              <p className="font-nunito text-gray text-xs sm:text-sm mt-2 leading-relaxed line-clamp-2">
                {dish.shortDescription || dish.description}
              </p>
            )}
          </div>

          {/* Dish Image */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 relative flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={dish.dishName || dish.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = "none"
                  if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"
                }}
              />
            ) : null}
            <div
              className="w-full h-full flex items-center justify-center text-primary/35 bg-emerald-50/50"
              style={{ display: imageUrl ? "none" : "flex" }}
            >
              <UtensilsCrossed size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-3 mt-4 border-t border-gray-100 text-xs font-nunito">
        <div className="flex items-center gap-1.5 text-gray">
          <UtensilsCrossed size={14} className="text-gray" />
          <span>Click to view &amp; order</span>
        </div>
        <div className="flex items-center gap-1 text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>View in Kitchen</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  )
}
