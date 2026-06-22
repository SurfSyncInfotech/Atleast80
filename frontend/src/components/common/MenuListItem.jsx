import { Plus, Minus } from "lucide-react"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"

export default function MenuListItem({ item, className, onOpen }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const qty = getItemQty(item.id)
  const isVeg = item.itemType === "veg" || item.item_type === "veg"
  const cover = resolveMediaUrl(item.image) || PLACEHOLDER

  const openDetail = () => onOpen?.(item)

  return (
    <div className={cn("flex gap-4 sm:gap-5 py-5 border-b border-gray-100/80 last:border-0 group hover:bg-gray-50/40 -mx-1 px-1 rounded-xl transition-colors", className)}>
      <div
        className="flex-1 min-w-0 pt-0.5 cursor-pointer"
        onClick={openDetail}
        onKeyDown={(e) => e.key === "Enter" && openDetail()}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={cn(
              "w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center flex-shrink-0",
              isVeg ? "border-emerald-600" : "border-red-600"
            )}
          >
            <span className={cn("w-[7px] h-[7px] rounded-full", isVeg ? "bg-emerald-600" : "bg-red-600")} />
          </span>
          {item.category === "grocery" && (
            <span className="text-[9px] font-poppins font-bold uppercase tracking-widest text-primary/70">
              Ration
            </span>
          )}
        </div>
        <h4 className="font-poppins font-semibold text-dark text-[15px] leading-snug group-hover:text-primary transition-colors">
          {item.name}
        </h4>
        {item.description && (
          <p className="font-nunito text-gray text-xs mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <p className="font-poppins font-bold text-dark text-[15px] mt-2.5">
          ₹{Number(item.price)}
        </p>
        {item.offer && (
          <p className="inline-flex mt-1.5 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            {item.offer}
          </p>
        )}
      </div>

      <div className="relative w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] flex-shrink-0">
        <button
          type="button"
          onClick={openDetail}
          className="w-full h-full rounded-2xl overflow-hidden cursor-pointer ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={`View ${item.name} details`}
        >
          <img
            src={cover}
            alt={item.name}
            className="w-full h-full object-cover bg-gray-100 group-hover:scale-105 transition-transform duration-300"
          />
        </button>
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
          {qty > 0 ? (
            <div className="flex items-center gap-2.5 bg-white border border-primary/20 shadow-lg rounded-xl px-2 py-1">
              <button onClick={() => removeItem(item.id)} className="text-primary cursor-pointer p-0.5" aria-label="Decrease">
                <Minus size={15} />
              </button>
              <span className="font-poppins font-bold text-primary text-sm min-w-[14px] text-center">{qty}</span>
              <button onClick={() => addItem(item)} className="text-primary cursor-pointer p-0.5" aria-label="Increase">
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(item)}
              className="bg-white text-primary font-poppins font-bold text-xs px-4 py-1.5 rounded-xl shadow-lg border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
