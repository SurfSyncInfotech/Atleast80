import { useState, useEffect } from "react"
import { MapPin, Loader2, Navigation, Edit3, Map } from "lucide-react"
import StateCitySelect from "./StateCitySelect"
import LocationMapModal from "./LocationMapModal"
import { useLocationPreference, useAutoDetectLocation, autoDetectLocation, getLocationPreference } from "../../lib/locationPreference"

export default function HomepageLocationBar() {
  const { state, city, address, lat, lng, setLocation, label } = useLocationPreference()
  const { detecting } = useAutoDetectLocation()
  const [editingAddress, setEditingAddress] = useState(false)
  const [tempAddress, setTempAddress] = useState(address || "")
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)

  useEffect(() => {
    setTempAddress(address || "")
  }, [address])

  const [detectNotice, setDetectNotice] = useState("")

  const handleDetect = async () => {
    setDetectNotice("")
    const result = await autoDetectLocation({ force: true })
    if (result.status === "error") {
      setDetectNotice(result.errorMessage || "Could not detect location. Please select manually.")
    } else if (result.state || result.city) {
      setLocation(result.state, result.city, result.address || "", result.pincode || "", result.suburb || "", "browser", result.lat || result.latitude, result.lng || result.longitude)
    }
  }

  const handleSaveAddress = () => {
    setLocation(state, city, tempAddress, "")
    setEditingAddress(false)
  }

  const handleConfirmMapLocation = (loc) => {
    if (!loc) return
    setLocation(
      loc.state || state,
      loc.city || city,
      loc.address || "",
      loc.pincode || "",
      loc.suburb || "",
      "manual",
      loc.latitude,
      loc.longitude
    )
  }

  return (
    <section className="mt-4 md:mt-6 bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-sm text-dark">Your delivery location</h3>
            <p className="font-nunito text-xs text-gray">
              {detecting ? "Detecting your location..." : "Select state and city to see nearby home kitchens"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 text-primary text-xs font-poppins font-semibold hover:bg-primary/5 cursor-pointer shadow-xs"
          >
            <Map size={14} />
            Pin on Map
          </button>

          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-poppins font-semibold hover:bg-primary-dark cursor-pointer disabled:opacity-50 border-0 shadow-xs"
          >
            {detecting ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            Use my location
          </button>
        </div>
      </div>

      <StateCitySelect
        state={state}
        city={city}
        variant="hero"
        disabled={detecting}
        onStateChange={(value) => setLocation(value, "")}
        onCityChange={(value) => {
          const current = getLocationPreference()
          setLocation(current.state, value)
        }}
      />

      {detectNotice && (
        <p className="font-nunito text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3">
          ⚠️ {detectNotice}
        </p>
      )}

      {detecting ? (
        <p className="font-nunito text-xs text-gray mt-3 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Finding your city...
        </p>
      ) : label ? (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-nunito text-xs text-primary truncate">
                Delivering to: <span className="font-semibold">{address || label}</span>
              </p>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="text-primary hover:text-primary-dark transition-colors p-0.5 rounded cursor-pointer flex-shrink-0 bg-transparent border-0 inline-flex items-center gap-1"
                title="Edit location on map"
              >
                <Edit3 size={13} />
                <span className="text-[10px] underline font-medium">Edit Pin</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocation("", "", "", "")
                setEditingAddress(false)
              }}
              className="text-red-500 hover:text-red-600 font-poppins font-semibold text-xs transition-colors cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
            >
              Clear Filters
            </button>
          </div>

          {editingAddress && (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="Enter exact flat/house no, colony, landmark..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-light font-nunito text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSaveAddress}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-poppins font-semibold hover:bg-primary-dark cursor-pointer border-0"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingAddress(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-light text-gray text-xs font-poppins font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="font-nunito text-xs text-gray mt-3">No location selected — all available kitchens are shown</p>
      )}

      {/* Interactive Leaflet Map Location Modal */}
      <LocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={address}
        initialCity={city}
        initialState={state}
        initialLat={lat}
        initialLng={lng}
      />
    </section>
  )
}
