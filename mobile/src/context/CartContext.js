import { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from "react"
import { Alert, Platform, View, Text, TouchableOpacity } from "react-native"
import { router } from "expo-router"
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
      console.log("[CartContext] addItem called for:", item?.name)
      if (!requireCustomer()) {
        console.log("[CartContext] requireCustomer check failed")
        return false
      }

      const kitchenId = item.kitchenId
      if (kitchenId && cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== kitchenId) {
        Alert.alert(
          "Change Kitchen?",
          "Your cart has items from another kitchen. Clear cart and add this item?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear & Add",
              onPress: () => {
                dispatch({ type: "CLEAR" })
                dispatch({ type: "ADD_ITEM", payload: item })
                triggerToast(`${item.name} added to cart!`)
              },
            },
          ]
        )
        return false
      }

      dispatch({ type: "ADD_ITEM", payload: item })
      console.log("[CartContext] dispatch ADD_ITEM success, triggering toast...")
      triggerToast(`${item.name} added to cart!`)
      return true
    },
    [cart, requireCustomer, triggerToast]
  )

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
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
