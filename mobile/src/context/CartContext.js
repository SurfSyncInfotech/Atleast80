import { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef, useMemo } from "react"
import { Platform, View, Text, TouchableOpacity } from "react-native"
import { ShoppingBag, AlertTriangle, Trash2 } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "./AuthContext"

const CartContext = createContext(null)

const STORAGE_KEY = "atleast80_cart"

function cartReducer(state, action) {
  switch (action.type) {
    case "SET_CART":
      return action.payload
    case "ADD_ITEM": {
      const payload = { ...action.payload }
      const hasOffer = Boolean(
        (payload.offerPrice && Number(payload.offerPrice) < Number(payload.price)) ||
        (payload.discountPercent && Number(payload.discountPercent) > 0) ||
        payload.hadOffer ||
        payload.isOfferActive ||
        payload.festivalOfferTitle
      )
      payload.hadOffer = hasOffer
      payload.isOfferClosed = false

      const existing = state.find((item) => String(item.id) === String(payload.id))
      if (existing) {
        return state.map((item) =>
          String(item.id) === String(payload.id)
            ? { ...item, ...payload, qty: item.qty + 1 }
            : item
        )
      }
      return [...state, { ...payload, qty: 1 }]
    }
    case "REMOVE_ITEM": {
      const existing = state.find((item) => String(item.id) === String(action.payload))
      if (existing && existing.qty > 1) {
        return state.map((item) =>
          String(item.id) === String(action.payload)
            ? { ...item, qty: item.qty - 1 }
            : item
        )
      }
      return state.filter((item) => String(item.id) !== String(action.payload))
    }
    case "DELETE_ITEM":
      return state.filter((item) => String(item.id) !== String(action.payload))
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
        const val = map[item.id] !== undefined
          ? map[item.id]
          : (map[String(item.id)] !== undefined ? map[String(item.id)] : map[Number(item.id)])
        if (val !== undefined) {
          const avail = Boolean(val)
          updated.isAvailable = avail
          updated.is_available = avail ? 1 : 0
        }

        const upItem = updatedItems[item.id] || updatedItems[String(item.id)] || updatedItems[Number(item.id)]
        const kId = item.kitchenId || item.kitchen_id
        const kOffer = kitchenOffers[kId] !== undefined
          ? kitchenOffers[kId]
          : (kitchenOffers[String(kId)] !== undefined ? kitchenOffers[String(kId)] : (kitchenOffers[Number(kId)] !== undefined ? kitchenOffers[Number(kId)] : undefined))

        const wasAddedWithOffer = Boolean(
          item.hadOffer ||
          (item.offerPrice && Number(item.offerPrice) < Number(item.price)) ||
          (item.discountPercent && Number(item.discountPercent) > 0) ||
          item.festivalOfferTitle
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
              updated.offerPrice = null
              updated.discountPercent = 0
            } else {
              updated.isOfferClosed = false
            }
          }
        } else if (kitchenOffers && (kOffer !== undefined)) {
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
  const { user } = useAuth()
  const [cart, dispatch] = useReducer(cartReducer, [])
  const [modalDismissedFor, setModalDismissedFor] = useState("")

  const triggerToast = useCallback((msg) => {
    // Toast logger
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
    if (!user) return true
    return user.role === "customer"
  }, [user])

  const addItem = useCallback(
    (item) => {
      if (!requireCustomer()) {
        return false
      }
      dispatch({ type: "ADD_ITEM", payload: item })
      return true
    },
    [requireCustomer]
  )

  const removeItem = useCallback(
    (id) => {
      dispatch({ type: "REMOVE_ITEM", payload: id })
    },
    []
  )

  const deleteItem = useCallback((id) => dispatch({ type: "DELETE_ITEM", payload: id }), [])
  const removeClosedOfferItems = useCallback(() => dispatch({ type: "REMOVE_CLOSED_OFFERS" }), [])
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), [])
  const clearKitchenCart = useCallback((kitchenId) => dispatch({ type: "CLEAR_KITCHEN", payload: kitchenId }), [])
  const syncAvailability = useCallback((map) => dispatch({ type: "SYNC_AVAILABILITY", payload: map }), [])

  const closedOfferItems = useMemo(() => {
    return cart.filter((item) => item.isOfferClosed)
  }, [cart])

  const closedIdsKey = closedOfferItems.map((i) => i.id).sort().join(",")
  const isOfferModalOpen = closedOfferItems.length > 0 && modalDismissedFor !== closedIdsKey

  const handleConfirmRemoveClosedOffers = () => {
    removeClosedOfferItems()
    setModalDismissedFor(closedIdsKey)
  }

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])

  const getItemQty = useCallback(
    (id) => {
      const item = cart.find((i) => String(i.id) === String(id))
      return item ? item.qty : 0
    },
    [cart]
  )

  const contextValue = useMemo(
    () => ({
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
      triggerToast,
    }),
    [cart, addItem, removeItem, deleteItem, removeClosedOfferItems, clearCart, clearKitchenCart, syncAvailability, closedOfferItems, itemCount, total, getItemQty, requireCustomer, triggerToast]
  )

  return (
    <CartContext.Provider value={contextValue}>
      {children}

      {/* Real-time Offer Closed Modal Popup Overlay */}
      {isOfferModalOpen && (
        <View
          style={{
            position: Platform.OS === "web" ? "fixed" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              width: "100%",
              maxWidth: 380,
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 20,
              zIndex: 1000000,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={26} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins-Bold", fontSize: 17, color: "#111827" }}>
                  Festival Offer Closed
                </Text>
                <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "700", marginTop: 2 }}>
                  ऑफ़र बंद हो चुका है
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#FECACA", marginBottom: 18 }}>
              <Text style={{ fontSize: 12, color: "#374151", marginBottom: 8, fontWeight: "500" }}>
                The kitchen seller has turned off or ended the festival offer for:
              </Text>
              {closedOfferItems.map((item) => (
                <Text key={item.id} style={{ fontSize: 13, fontWeight: "700", color: "#1F2937", marginVertical: 3 }} numberOfLines={1}>
                  • {item.name}
                </Text>
              ))}
              <Text style={{ fontSize: 11, color: "#B91C1C", fontWeight: "600", marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#FECACA" }}>
                You cannot place this order at the discounted offer price.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleConfirmRemoveClosedOffers}
              style={{ backgroundColor: "#DC2626", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
            >
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 15 }}>
                OK, Remove from Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </CartContext.Provider>
  )
}

const defaultCartContext = {
  cart: [],
  addItem: () => false,
  confirmClearAndAdd: () => {},
  removeItem: () => {},
  deleteItem: () => {},
  removeClosedOfferItems: () => {},
  clearCart: () => {},
  closedOfferItems: [],
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
