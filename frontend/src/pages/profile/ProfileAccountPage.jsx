import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail, Phone, MapPin, Pencil, X, Trash2, ChevronRight, Navigation, Map } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Button from "../../components/ui/Button"
import LocationMapModal from "../../components/common/LocationMapModal"
import { useAuth } from "../../context/AuthContext"
import { api, getPublicContactSettings } from "../../lib/api"
import { gmailDeletionUrl } from "../../lib/deletionMail"
import { getLocationPreference, setLocationPreference, validateBrowserLocation } from "../../lib/locationPreference"
import { cn } from "../../lib/utils"

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

export default function ProfileAccountPage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", pincode: "",
  })
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletionEmail, setDeletionEmail] = useState("liveatleast80@gmail.com")
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)

  const [locationPref, setLocationPref] = useState(getLocationPreference)

  useEffect(() => {
    const handleLocChange = (e) => {
      setLocationPref(e.detail || getLocationPreference())
    }
    window.addEventListener("location-preference-change", handleLocChange)
    return () => window.removeEventListener("location-preference-change", handleLocChange)
  }, [])

  const currentAddress = user?.address || locationPref?.address || ""
  const currentCity = user?.city || locationPref?.city || ""
  const currentPincode = user?.pincode || locationPref?.pincode || ""
  const displayAddress = [currentAddress, currentCity, currentPincode].filter(Boolean).join(", ")
  const hasAddress = Boolean(displayAddress)

  useEffect(() => {
    getPublicContactSettings()
      .then((data) => {
        if (data?.accountDeletionEmail) setDeletionEmail(data.accountDeletionEmail)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    const pref = getLocationPreference()
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || pref.address || "",
      city: user.city || pref.city || "",
      pincode: user.pincode || pref.pincode || "",
    })
  }, [user])

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
          alert(`Browser location is too coarse. Please pick location on map or enter manually.`)
          setDetectingLocation(false)
          return
        }

        const { latitude, longitude } = position.coords
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
              streetAddress = data.display_name.split(",").slice(0, 2).map((s) => s.trim()).join(", ")
            }

            setForm((prev) => ({
              ...prev,
              address: streetAddress || prev.address,
              city: city || prev.city,
              pincode: postcode || prev.pincode,
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
        let msg = "Failed to get location."
        if (err.code === 1) msg = "Location permission denied. Please allow access or fill manually."
        else if (err.code === 2) msg = "Position unavailable. Please pick location on map or enter manually."
        else if (err.code === 3) msg = "Location detection timed out. Please try again."
        alert(msg)
        setDetectingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleConfirmMapLocation = (loc) => {
    if (!loc) return
    setForm((prev) => ({
      ...prev,
      address: loc.address || prev.address,
      city: loc.city || prev.city,
      pincode: loc.pincode || prev.pincode,
    }))
    setIsMapModalOpen(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      await updateProfile(form)
      // Sync address changes with global location preference
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

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-poppins font-semibold text-dark text-lg">Account details</h2>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-poppins font-bold cursor-pointer hover:bg-primary/15 transition-colors"
        >
          <Pencil size={12} />
          Edit profile
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Mail} label="Email" value={user?.email} />
        <InfoTile icon={Phone} label="Phone" value={user?.phone ? `+91 ${user.phone}` : "—"} />
        <div className="sm:col-span-2">
          <InfoTile
            icon={MapPin}
            label="Delivery address"
            value={hasAddress ? displayAddress : "No address saved yet"}
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

      <button
        type="button"
        onClick={() => navigate("/user-account-deletion")}
        className="mt-6 w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-red-100 bg-red-50/70 hover:bg-red-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="font-poppins font-semibold text-sm text-dark">Delete your Atleast80 account</p>
            <p className="font-nunito text-xs text-gray mt-0.5">Request deletion at {deletionEmail}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray flex-shrink-0" />
      </button>

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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsMapModalOpen(true)}
                            className="flex items-center gap-1 text-[11px] font-poppins font-bold text-primary hover:text-primary-dark cursor-pointer"
                          >
                            <Map size={12} />
                            Pin on Map
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={handleAutoDetectLocation}
                            disabled={detectingLocation}
                            className="flex items-center gap-1 text-[11px] font-poppins font-bold text-primary hover:text-primary-dark cursor-pointer disabled:opacity-50"
                          >
                            <Navigation size={12} />
                            {detectingLocation ? "Detecting..." : "Auto Detect"}
                          </button>
                        </div>
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

      <LocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={form.address}
        initialCity={form.city}
      />
    </div>
  )
}
