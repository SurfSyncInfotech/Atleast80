import { Plus, Minus, ShoppingBag } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"

export default function MenuListItem({ item, className, onOpen }) {
  const navigate = useNavigate()
  const { addItem, removeItem, getItemQty } = useCart()
  const qty = getItemQty(item.id)
  const isVeg = item.itemType === "veg" || item.item_type === "veg"
  const isAvailable = item.is_available !== false && item.is_available !== 0 && item.isAvailable !== false && item.isAvailable !== 0
  const cover = resolveMediaUrl(item.image) || PLACEHOLDER

  const openDetail = () => onOpen?.(item)

  const handleBuyNow = (e) => {
    e?.stopPropagation?.()
    if (!isAvailable) return
    if (qty === 0) {
      const added = addItem(item)
      if (added !== false) {
        navigate("/checkout")
      }
    } else {
      navigate("/checkout")
    }
  }

  return (
    <div className={cn("flex gap-4 sm:gap-5 py-5 border-b border-gray-100/80 last:border-0 group hover:bg-gray-50/40 -mx-1 px-1 rounded-xl transition-colors", !isAvailable && "opacity-65", className)}>
      <div
        className="flex-1 min-w-0 pt-0.5 cursor-pointer"
        onClick={openDetail}
        onKeyDown={(e) => e.key === "Enter" && openDetail()}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className={cn(
              "w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center flex-shrink-0",
              isVeg ? "border-emerald-600" : "border-red-600"
            )}
          >
            <span className={cn("w-[7px] h-[7px] rounded-full", isVeg ? "bg-emerald-600" : "bg-red-600")} />
          </span>
          {Boolean(item.isCombo || item.is_combo) && (
            <span className="text-[9px] font-poppins font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
              Combo
            </span>
          )}
          {item.category === "grocery" && (
            <span className="text-[9px] font-poppins font-bold uppercase tracking-widest text-primary/70">
              Ration
            </span>
          )}
          {!isAvailable && (
            <span className="text-[9px] font-poppins font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              Currently Unavailable
            </span>
          )}
        </div>
        <h4 className={cn("font-poppins font-semibold text-[15px] leading-snug transition-colors", isAvailable ? "text-dark group-hover:text-primary" : "text-gray-500")}>
          {item.name}
        </h4>
        {item.description && (
          <p className="font-nunito text-gray text-xs mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {item.discountPercent && item.offerPrice ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-poppins font-bold text-primary text-[15px]">
                ₹{Number(item.offerPrice)}
              </span>
              <span className="font-poppins text-gray-400 line-through text-xs">
                ₹{Number(item.originalPrice || item.price)}
              </span>
              <span className="text-[10px] font-poppins font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                {item.discountPercent}% OFF
              </span>
            </div>
          ) : (
            <p className="font-poppins font-bold text-dark text-[15px]">
              ₹{Number(item.price)}
            </p>
          )}
        </div>
        {item.festivalOfferTitle ? (
          <p className="inline-flex mt-1.5 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/20">
            🎉 {item.discountPercent}% OFF · {item.festivalOfferTitle}
          </p>
        ) : item.offer ? (
          <p className="inline-flex mt-1.5 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            {item.offer}
          </p>
        ) : null}
      </div>

      <div className="relative w-[105px] sm:w-[120px] flex flex-col items-center flex-shrink-0">
        <button
          type="button"
          onClick={openDetail}
          className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-2xl overflow-hidden cursor-pointer ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40 relative"
          aria-label={`View ${item.name} details`}
        >
          <img
            src={cover}
            alt={item.name}
            className={cn("w-full h-full object-cover bg-gray-100 group-hover:scale-105 transition-transform duration-300", !isAvailable && "grayscale")}
          />
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
              <span className="text-[9px] font-poppins font-bold text-white uppercase text-center bg-red-600/90 px-1.5 py-0.5 rounded">
                Out of stock
              </span>
            </div>
          )}
        </button>

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {!isAvailable ? (
            <div className="bg-gray-100 text-gray-500 font-poppins font-bold text-[10px] px-3 py-1 rounded-xl shadow-sm border border-gray-200 cursor-not-allowed">
              Unavailable
            </div>
          ) : qty > 0 ? (
            <div className="flex items-center gap-1 bg-white border border-primary/20 shadow-md rounded-xl px-1.5 py-1">
              <button onClick={() => removeItem(item.id)} className="text-primary cursor-pointer p-0.5" aria-label="Decrease">
                <Minus size={13} />
              </button>
              <span className="font-poppins font-bold text-primary text-xs min-w-[12px] text-center">{qty}</span>
              <button onClick={() => addItem(item)} className="text-primary cursor-pointer p-0.5" aria-label="Increase">
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => addItem(item)}
                className="bg-white text-primary font-poppins font-bold text-[11px] px-2.5 py-1 rounded-xl shadow-md border border-primary/30 hover:bg-primary hover:text-white transition-all cursor-pointer"
              >
                ADD
              </button>

              <button
                onClick={handleBuyNow}
                className="bg-primary text-white font-poppins font-bold text-[11px] px-2.5 py-1 rounded-xl shadow-md hover:bg-primary-dark transition-all cursor-pointer flex items-center gap-0.5"
              >
                <ShoppingBag size={11} />
                BUY
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
