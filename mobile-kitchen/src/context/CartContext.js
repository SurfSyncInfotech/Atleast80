import { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from "react"
import { Platform, View, Text, TouchableOpacity, Modal } from "react-native"
import { router } from "expo-router"
import { ShoppingBag } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "./AuthContext"

const CartContext = createContext(null)

const STORAGE_KEY = "atleast80_cart"

function cartReducer(state, action) {
  switch (action.type) {
    case "SET_CART":
      return action.payload
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
  const { user } = useAuth()
  const [cart, dispatch] = useReducer(cartReducer, [])
  const [toastMessage, setToastMessage] = useState("")
  const toastTimerRef = useRef(null)
  const [conflictItem, setConflictItem] = useState(null)

  const triggerToast = useCallback((msg) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToastMessage(msg)
    toastTimerRef.current = setTimeout(() => {
      setToastMessage((current) => (current === msg ? "" : current))
      toastTimerRef.current = null
    }, 2500)
  }, [])

  // Load cart on startup
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (stored) {
          dispatch({ type: "SET_CART", payload: JSON.parse(stored) })
        }
      } catch (err) {
        console.error("Failed to load cart", err)
      }
    }
    load()
  }, [])

  // Save cart on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart)).catch((err) =>
      console.error("Failed to save cart", err)
    )
  }, [cart])

  const requireCustomer = useCallback(() => {
    if (user?.role === "customer") return true
    router.push("/(auth)/login")
    return false
  }, [user])

  const addItem = useCallback(
    (item) => {
      if (!requireCustomer()) {
        return false
      }

      const kitchenId = item.kitchenId
      if (kitchenId && cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== kitchenId) {
        setConflictItem(item)
        return false
      }

      dispatch({ type: "ADD_ITEM", payload: item })
      triggerToast(`${item.name} added to cart!`)
      return true
    },
    [cart, requireCustomer, triggerToast]
  )

  const confirmClearAndAdd = useCallback(() => {
    if (!conflictItem) return
    dispatch({ type: "CLEAR" })
    dispatch({ type: "ADD_ITEM", payload: conflictItem })
    triggerToast(`${conflictItem.name} added to cart!`)
    setConflictItem(null)
  }, [conflictItem, triggerToast])

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
      {toastMessage ? (
        <TouchableOpacity
          onPress={() => router.push("/(customer)/checkout")}
          activeOpacity={0.9}
          style={{
            position: Platform.OS === "web" ? "fixed" : "absolute",
            bottom: Platform.OS === "web" ? 30 : 90,
            left: 20,
            right: 20,
            backgroundColor: "rgba(11, 107, 58, 0.95)",
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 10,
            zIndex: 999999,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
            {toastMessage}
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 10 }}>VIEW CART</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Kitchen-conflict confirmation — replaces the native browser confirm() popup */}
      <Modal
        visible={conflictItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConflictItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 340,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#FFF1E6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <ShoppingBag size={26} color="#FF6B00" />
            </View>

            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", textAlign: "center", marginBottom: 8 }}>
              Start a New Order?
            </Text>
            <Text style={{ fontSize: 13, color: "#4A4A4A", fontFamily: "Nunito", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
              Your cart has items from another kitchen. Adding "{conflictItem?.name}" will clear your current cart.
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setConflictItem(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#F5F5F5",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                }}
              >
                <Text style={{ color: "#4A4A4A", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmClearAndAdd}
                style={{
                  flex: 1,
                  backgroundColor: "#0B6B3A",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>Clear & Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CartContext.Provider>
  )
}

const defaultCartContext = {
  cart: [],
  addItem: () => false,
  confirmClearAndAdd: () => {},
  removeItem: () => {},
  deleteItem: () => {},
  clearCart: () => {},
  itemCount: 0,
  total: 0,
  getItemQty: () => 0,
  requireCustomer: () => false,
  toastMessage: "",
  setToastMessage: () => {},
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    console.warn("useCart was called outside of CartProvider, returning fallback context.")
    return defaultCartContext
  }
  return context
}
