import { createContext, useContext, useReducer, useEffect, useCallback, useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Trash2, X } from "lucide-react"
import { useAuth } from "./AuthContext"

const CartContext = createContext(null)

const STORAGE_KEY = "atleast80_cart"

function loadCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const payload = { ...action.payload }
      const hasOffer = Boolean(
        (payload.offerPrice && Number(payload.offerPrice) < Number(payload.price)) ||
        (payload.discountPercent && Number(payload.discountPercent) > 0) ||
        payload.hadOffer ||
        payload.isOfferActive
      )
      payload.hadOffer = hasOffer
      payload.isOfferClosed = false

      const existing = state.find((item) => item.id === payload.id)
      if (existing) {
        return state.map((item) =>
          item.id === payload.id
            ? { ...item, ...payload, qty: item.qty + 1 }
            : item
        )
      }
      return [...state, { ...payload, qty: 1 }]
    }
    case "REMOVE_ITEM": {
      const existing = state.find((item) => item.id === action.payload)
      if (existing && existing.qty > 1) {
        return state.map((item) =>
          item.id === action.payload
            ? { ...item, qty: item.qty - 1 }
            : item
        )
      }
      return state.filter((item) => item.id !== action.payload)
    }
    case "DELETE_ITEM":
      return state.filter((item) => item.id !== action.payload)
    case "REMOVE_CLOSED_OFFERS":
      return state.filter((item) => !item.isOfferClosed)
    case "CLEAR_KITCHEN":
      return state.filter((item) => String(item.kitchenId || item.kitchen_id) !== String(action.payload))
    case "SYNC_AVAILABILITY": {
      const payload = action.payload || {}
      const map = payload.availability || payload
      const updatedItems = payload.updatedItems || {}
      const kitchenOffers = payload.kitchenOffers || {}

      return state.map((item) => {
        let updated = { ...item }
        const val = map[item.id] !== undefined ? map[item.id] : map[String(item.id)]
        if (val !== undefined) {
          const avail = Boolean(val)
          updated.isAvailable = avail
          updated.is_available = avail ? 1 : 0
        }

        const upItem = updatedItems[item.id] || updatedItems[String(item.id)]
        const kId = item.kitchenId || item.kitchen_id
        const kOffer = kitchenOffers[kId] !== undefined ? kitchenOffers[kId] : kitchenOffers[String(kId)]
        const wasAddedWithOffer = Boolean(
          item.hadOffer ||
          (item.offerPrice && Number(item.offerPrice) < Number(item.price)) ||
          (item.discountPercent && Number(item.discountPercent) > 0)
        )

        if (upItem) {
          if (upItem.price !== undefined) updated.price = upItem.price
          updated.offerPrice = upItem.offerPrice
          updated.discountPercent = upItem.discountPercent || 0
          updated.isOfferActive = Boolean(upItem.isOfferActive)
          updated.offerTitle = upItem.offerTitle || null

          if (wasAddedWithOffer) {
            updated.hadOffer = true
            if (!upItem.isOfferActive) {
              updated.isOfferClosed = true
            } else {
              updated.isOfferClosed = false
            }
          }
        } else if (kOffer !== undefined) {
          if (kOffer === null || kOffer === false || (kOffer && kOffer.active === false)) {
            updated.offerPrice = null
            updated.discountPercent = 0
            updated.isOfferActive = false
            updated.offerTitle = null
            if (wasAddedWithOffer) {
              updated.hadOffer = true
              updated.isOfferClosed = true
            }
          } else if (kOffer && kOffer.active) {
            updated.isOfferClosed = false
          }
        }
        return updated
      })
    }
    case "CLEAR":
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { customerUser } = useAuth()
  const [cart, dispatch] = useReducer(cartReducer, [], loadCart)
  const [modalDismissedFor, setModalDismissedFor] = useState("")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const requireCustomer = useCallback(() => {
    if (customerUser) return true
    navigate("/login", { state: { from: window.location.pathname } })
    return false
  }, [customerUser, navigate])

  const addItem = useCallback((item) => {
    if (!requireCustomer()) return false
    dispatch({ type: "ADD_ITEM", payload: item })
    return true
  }, [requireCustomer])

  const removeItem = (id) => dispatch({ type: "REMOVE_ITEM", payload: id })
  const deleteItem = (id) => dispatch({ type: "DELETE_ITEM", payload: id })
  const removeClosedOfferItems = useCallback(() => {
    dispatch({ type: "REMOVE_CLOSED_OFFERS" })
  }, [])
  const clearCart = () => dispatch({ type: "CLEAR" })
  const clearKitchenCart = (kitchenId) => dispatch({ type: "CLEAR_KITCHEN", payload: kitchenId })
  const syncAvailability = useCallback((availabilityMap) => {
    dispatch({ type: "SYNC_AVAILABILITY", payload: availabilityMap })
  }, [])

  const closedOfferItems = useMemo(() => {
    return cart.filter((item) => item.isOfferClosed)
  }, [cart])

  const closedIdsKey = closedOfferItems.map((i) => i.id).sort().join(",")

  const isOfferModalOpen = closedOfferItems.length > 0 && modalDismissedFor !== closedIdsKey

  const handleConfirmRemoveClosedOffers = () => {
    removeClosedOfferItems()
    setModalDismissedFor(closedIdsKey)
    if (location.pathname.startsWith("/checkout")) {
      navigate("/cart", { replace: true })
    }
  }

  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  const getItemQty = (id) => {
    const item = cart.find((i) => i.id === id)
    return item ? item.qty : 0
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        deleteItem,
        removeClosedOfferItems,
        clearCart,
        clearKitchenCart,
        syncAvailability,
        closedOfferItems,
        itemCount,
        total,
        getItemQty,
        requireCustomer,
      }}
    >
      {children}

      {/* Real-Time Offer Closed Modal Popup */}
      <AnimatePresence>
        {isOfferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 overflow-hidden relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <h3 className="font-poppins font-bold text-gray-900 text-lg leading-tight">
                    Festival Offer Closed
                  </h3>
                  <p className="text-xs text-red-600 font-semibold mt-0.5">
                    ऑफ़र बंद हो चुका है
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-red-50/70 rounded-xl p-3.5 border border-red-100/80 text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1.5">
                  The seller has turned off or ended the festival offer for the following item(s):
                </p>
                <div className="max-h-36 overflow-y-auto divide-y divide-red-100 mt-2 pr-1">
                  {closedOfferItems.map((item) => (
                    <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                        • {item.name}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        {item.kitchen || "Kitchen"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-700 font-medium mt-2 pt-2 border-t border-red-200">
                  You cannot place this order at the discounted offer price.
                </p>
              </div>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleConfirmRemoveClosedOffers}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-poppins font-bold text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 size={16} />
                  OK, Remove from Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
