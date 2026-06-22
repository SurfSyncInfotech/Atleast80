import { Plus, Minus } from "lucide-react"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"

export default function GroceryCard({ item, className }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const qty = getItemQty(item.id)

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-3 flex gap-3 items-center shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <img
        src={item.image}
        alt={item.name}
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <h4 className="font-poppins font-semibold text-dark text-sm truncate">
          {item.name}
        </h4>
        <p className="text-gray text-xs mt-0.5">{item.weight}</p>
        <span className="font-poppins font-bold text-dark text-sm mt-1 block">
          ₹{item.price}
        </span>
      </div>

      <div className="flex-shrink-0">
        {qty > 0 ? (
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-2 py-1">
            <button
              onClick={() => removeItem(item.id)}
              className="text-primary hover:bg-primary/20 rounded p-0.5 cursor-pointer active:scale-90 transition-transform"
            >
              <Minus size={16} />
            </button>
            <span className="font-poppins font-semibold text-primary text-sm w-5 text-center">
              {qty}
            </span>
            <button
              onClick={() => addItem(item)}
              className="text-primary hover:bg-primary/20 rounded p-0.5 cursor-pointer active:scale-90 transition-transform"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => addItem(item)}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer active:scale-95"
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}
