import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mail, Phone, MapPin, Pencil, LogOut, Package, ChevronRight, X,
  ShoppingBag, Clock, User, Sparkles,
} from "lucide-react"
import Button from "../components/ui/Button"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { validateBrowserLocation, getLocationPreference, setLocationPreference } from "../lib/locationPreference"
import { cn } from "../lib/utils"

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-primary/10 text-primary",
  out_for_delivery: "bg-secondary/30 text-dark",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
}

function initials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function InfoTile({ icon: Icon, label, value, muted }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cream/80 border border-gray-100/80">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray">{label}</p>
        <p className={cn("font-nunito text-sm mt-0.5 break-words", muted ? "text-gray" : "text-dark")}>
          {value}
        </p>
      </div>
    </div>
  )
}

function OrderCard({ order, highlight, onTrack }) {
  return (
    <motion.button
      type="button"
      onClick={() => onTrack(order.id)}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full text-left rounded-2xl p-4 transition-all cursor-pointer",
        highlight
          ? "bg-gradient-to-br from-primary/8 via-white to-secondary/10 border-2 border-primary/20 shadow-md"
          : "bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/15"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-poppins font-semibold text-sm text-dark truncate">{order.kitchenName}</p>
            <p className="font-nunito text-xs text-gray mt-0.5">#{order.orderNumber}</p>
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] font-poppins font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0",
            STATUS_COLORS[order.status] || "bg-gray-100 text-gray"
          )}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/80">
        <div className="flex items-center gap-3 text-xs font-nunito text-gray">
          <span>{order.items?.length || 0} items</span>
          <span>·</span>
          <span className="font-poppins font-semibold text-dark">₹{order.grandTotal}</span>
          {order.createdAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(order.createdAt)}
              </span>
            </>
          )}
        </div>
        <span className="text-primary text-xs font-poppins font-semibold flex items-center gap-0.5">
          Track <ChevronRight size={14} />
        </span>
      </div>
    </motion.button>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuth()
  const [orders, setOrders] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", pincode: "",
  })
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [detectingLocation, setDetectingLocation] = useState(false)

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const validation = validateBrowserLocation(position)
        if (!validation.valid) {
          alert(`Browser location is too coarse (~${Math.round((validation.accuracy || 0)/1000)} km). Please pick location on map or enter manually.`)
          setDetectingLocation(false)
          return
        }

        const { latitude, longitude } = position.coords
        console.trace("[REVERSE GEOCODE CALLED]", {
          latitude,
          longitude,
          caller: "ProfilePage.handleAutoDetectLocation"
        })
        try {
          const data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)
          if (data) {
            const addr = data.address || {}
            const road = data.suburb || addr.road || addr.suburb || addr.neighbourhood || ""
            const houseNumber = addr.house_number || ""
            const city = data.city || data.suburb || data.district || addr.city || addr.town || addr.village || addr.county || ""
            const postcode = data.postcode || addr.postcode || ""

            let streetAddress = data.formattedAddress || data.displayName || [houseNumber, road].filter(Boolean).join(", ")
            if (!streetAddress && data.display_name) {
              streetAddress = data.display_name.split(",").slice(0, 2).map(s => s.trim()).join(", ")
            }

            setForm(prev => ({
              ...prev,
              address: streetAddress || prev.address,
              city: city || prev.city,
              pincode: postcode || prev.pincode
            }))
          } else {
            alert("Could not resolve address details. Please fill manually.")
          }
        } catch (err) {
          alert("Failed to auto-detect location: " + err.message)
        } finally {
          setDetectingLocation(false)
        }
      },
      (err) => {
        if (err.code === 1) {
          alert("Location permission denied. Please allow access or fill manually.")
        } else if (err.code === 2) {
          alert("Position unavailable. Please pick location on map or enter manually.")
        } else if (err.code === 3) {
          alert("Location detection timed out. Please try again or enter manually.")
        } else {
          alert("Failed to get location: " + (err.message || "Unknown error"))
        }
        setDetectingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const [locationPref, setLocationPref] = useState(getLocationPreference)

  useEffect(() => {
    const syncLocation = () => {
      const pref = getLocationPreference()
      setLocationPref(pref)
      if (pref.address || pref.city) {
        setForm((prev) => ({
          ...prev,
          address: pref.address || prev.address,
          city: pref.city || prev.city,
          pincode: pref.pincode || prev.pincode,
        }))
      }
    }
    window.addEventListener("location-preference-change", syncLocation)
    return () => window.removeEventListener("location-preference-change", syncLocation)
  }, [])

  const isStalePune = (str) =>
    str && (str.toLowerCase().includes("guruwar peth") || str.toLowerCase().includes("pant sachiv"))

  const prefAddressStr = [locationPref?.address || locationPref?.suburb, locationPref?.city, locationPref?.pincode].filter(Boolean).join(", ")
  const userAddressStr = [user?.address, user?.city, user?.pincode].filter(Boolean).join(", ")

  const activeDisplayAddress = (!isStalePune(prefAddressStr) && prefAddressStr)
    || (!isStalePune(userAddressStr) && userAddressStr)
    || ""

  const hasAddress = Boolean(activeDisplayAddress)
  const pastOrders = orders.filter((o) => !currentOrder || o.id !== currentOrder.id)

  useEffect(() => {
    if (!user) return
    const pref = getLocationPreference()
    const cleanUserAddr = isStalePune(user.address) ? "" : (user.address || "")
    const cleanUserCity = isStalePune(user.address) ? "" : (user.city || "")

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: pref.address || cleanUserAddr,
      city: pref.city || cleanUserCity,
      pincode: pref.pincode || user.pincode || "",
    })
  }, [user])

  useEffect(() => {
    api("/api/alerts").then((d) => setAlerts(d.alerts || [])).catch(() => setAlerts([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [ordersRes, currentRes] = await Promise.all([
          api("/api/orders"),
          api("/api/orders/current"),
        ])
        if (!cancelled) {
          setOrders(ordersRes.orders || [])
          setCurrentOrder(currentRes.order || null)
        }
      } catch {
        if (!cancelled) {
          setOrders([])
          setCurrentOrder(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      await updateProfile(form)
      setLocationPreference({
        city: form.city,
        address: form.address,
        pincode: form.pincode,
      }, { source: "manual" })
      setEditing(false)
    } catch (err) {
      setSaveError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/home")
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] pb-28">
      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] pt-6 pb-8 px-4 md:px-8 lg:px-10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative w-full max-w-[min(100%,90rem)] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-secondary">
              <Sparkles size={14} />
              <span className="text-[10px] font-poppins font-bold uppercase tracking-[0.2em]">My Account</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-poppins font-semibold cursor-pointer hover:bg-white/20 transition-colors"
            >
              <LogOut size={13} />
              Log out
            </button>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white text-primary font-poppins font-bold text-2xl md:text-3xl flex items-center justify-center shadow-xl ring-4 ring-white/20">
                {initials(user?.name)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-secondary rounded-lg flex items-center justify-center shadow-md">
                <User size={12} className="text-dark" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-poppins font-bold text-2xl md:text-3xl text-white truncate">{user?.name}</h1>
              <p className="font-nunito text-white/65 text-sm md:text-base mt-1 truncate">{user?.email}</p>
              <button
                onClick={() => setEditing(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-primary text-xs font-poppins font-bold cursor-pointer hover:bg-white/90 transition-colors shadow-sm"
              >
                <Pencil size={12} />
                Edit profile
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4 max-w-md md:max-w-lg">
            <div className="rounded-xl bg-secondary px-4 py-3.5 text-center shadow-md">
              <p className="font-poppins font-bold text-2xl md:text-3xl text-dark">{orders.length}</p>
              <p className="font-nunito text-xs text-dark/80 mt-0.5 font-semibold">Total orders</p>
            </div>
            <div className="rounded-xl bg-error px-4 py-3.5 text-center shadow-md">
              <p className="font-poppins font-bold text-2xl md:text-3xl text-white">{currentOrder ? "1" : "0"}</p>
              <p className="font-nunito text-xs text-white/90 mt-0.5 font-semibold">Active order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 md:px-8 lg:px-10 w-full max-w-[min(100%,90rem)] mx-auto py-6">
        {alerts.length > 0 && (
          <div className="mb-5 space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-2xl border border-primary/15 p-4 shadow-sm">
                <p className="font-poppins font-semibold text-sm text-dark">{alert.title}</p>
                <p className="font-nunito text-sm text-gray mt-1">{alert.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-5 lg:gap-8 items-stretch">
          {/* Account details */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 h-full">
            <h2 className="font-poppins font-semibold text-dark text-lg mb-4">Account details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile icon={Mail} label="Email" value={user?.email} />
              <InfoTile icon={Phone} label="Phone" value={user?.phone ? `+91 ${user.phone}` : "—"} />
              <div className="sm:col-span-2">
                <InfoTile
                  icon={MapPin}
                  label="Delivery address"
                  value={
                    hasAddress
                      ? activeDisplayAddress
                      : "No address saved yet"
                  }
                  muted={!hasAddress}
                />
              </div>
            </div>
            {!hasAddress && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 w-full text-center text-sm font-poppins font-semibold text-primary cursor-pointer hover:underline"
              >
                Add delivery address for checkout →
              </button>
            )}
          </div>

          {/* Orders — single card */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-primary" />
                <h2 className="font-poppins font-semibold text-dark text-lg">Your orders</h2>
              </div>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/orders")}
                  className="text-xs font-poppins font-semibold text-primary cursor-pointer hover:underline"
                >
                  View all
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray mb-3">
                  Current order
                </p>
                {loading ? (
                  <div className="rounded-xl border border-gray-100 p-8 flex justify-center">
                    <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : currentOrder ? (
                  <OrderCard
                    order={currentOrder}
                    highlight
                    onTrack={(id) => navigate(`/orders/${id}`)}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center bg-cream/40">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Package size={20} className="text-primary" />
                    </div>
                    <p className="font-poppins font-medium text-dark text-sm">No active order</p>
                    <p className="font-nunito text-gray text-xs mt-1">Place an order to track it here.</p>
                    <Button className="mt-3" size="sm" onClick={() => navigate("/home")}>
                      Browse kitchens
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray mb-3">
                  Order history
                </p>
                {loading ? (
                  <p className="text-center text-gray font-nunito text-sm py-4">Loading...</p>
                ) : pastOrders.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-cream/40 p-5 text-center">
                    <p className="font-nunito text-gray text-sm">Past orders will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {pastOrders.map((order, i) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <OrderCard order={order} onTrack={(id) => navigate(`/orders/${id}`)} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setEditing(false)}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-poppins font-bold text-lg text-dark">Edit profile</h3>
                  <p className="font-nunito text-xs text-gray mt-0.5">Update your account & delivery info</p>
                </div>
                <button
                  onClick={() => setEditing(false)}
                  className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {saveError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                {[
                  ["name", "Full name", "text"],
                  ["email", "Email", "email"],
                  ["phone", "Phone", "tel"],
                  ["address", "Address", "text"],
                  ["city", "City", "text"],
                  ["pincode", "Pincode", "tel"],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-poppins font-semibold text-dark">{label}</label>
                      {key === "address" && (
                        <button
                          type="button"
                          onClick={handleAutoDetectLocation}
                          disabled={detectingLocation}
                          className="flex items-center gap-1 text-[11px] font-poppins font-bold text-primary hover:text-primary-dark cursor-pointer disabled:opacity-50"
                        >
                          <MapPin size={12} />
                          {detectingLocation ? "Detecting..." : "Auto Detect"}
                        </button>
                      )}
                    </div>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [key]:
                            key === "phone" || key === "pincode"
                              ? e.target.value.replace(/\D/g, "").slice(0, key === "phone" ? 10 : 6)
                              : e.target.value,
                        }))
                      }
                      className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-gray-light font-nunito text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full mt-4" size="lg" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
