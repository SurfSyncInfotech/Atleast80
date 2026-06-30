import { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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
      const existing = state.find((item) => item.id === action.payload.id)
      if (existing) {
        return state.map((item) =>
          item.id === action.payload.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      }
      return [...state, { ...action.payload, qty: 1 }]
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
    case "CLEAR":
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const navigate = useNavigate()
  const { customerUser } = useAuth()
  const [cart, dispatch] = useReducer(cartReducer, [], loadCart)

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

    const kitchenId = item.kitchenId
    if (kitchenId && cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== kitchenId) {
      const ok = window.confirm(
        "Your cart has items from another kitchen. Clear cart and add this item?"
      )
      if (!ok) return false
      dispatch({ type: "CLEAR" })
    }

    dispatch({ type: "ADD_ITEM", payload: item })
    return true
  }, [cart, requireCustomer])

  const removeItem = (id) => dispatch({ type: "REMOVE_ITEM", payload: id })
  const deleteItem = (id) => dispatch({ type: "DELETE_ITEM", payload: id })
  const clearCart = () => dispatch({ type: "CLEAR" })

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
        clearCart,
        itemCount,
        total,
        getItemQty,
        requireCustomer,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
