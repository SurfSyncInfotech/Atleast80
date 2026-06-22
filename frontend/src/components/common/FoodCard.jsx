import { Plus, Minus } from "lucide-react"
import Badge from "./Badge"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"

export default function FoodCard({ item, className }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const qty = getItemQty(item.id)

  return (
    <div
      className={cn(
        "bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {item.badge && (
          <div className="absolute top-2 left-2">
            <Badge type={item.badge.type}>{item.badge.text}</Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="font-poppins font-semibold text-dark text-sm truncate">
          {item.name}
        </h4>
        <p className="text-gray text-xs mt-0.5">{item.kitchen}</p>

        <div className="flex items-center justify-between mt-2.5">
          <span className="font-poppins font-bold text-dark">
            ₹{item.price}
          </span>
          {qty > 0 ? (
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1">
              <button
                onClick={() => removeItem(item.id)}
                className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform"
              >
                <Minus size={14} />
              </button>
              <span className="font-poppins font-bold text-primary text-sm w-4 text-center">
                {qty}
              </span>
              <button
                onClick={() => addItem(item)}
                className="text-primary cursor-pointer hover:bg-primary/10 rounded p-0.5 active:scale-90 transition-transform"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(item)}
              className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary-dark transition-colors cursor-pointer active:scale-90"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
