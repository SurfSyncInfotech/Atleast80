import { MapPin, Loader2, Navigation } from "lucide-react"
import StateCitySelect from "./StateCitySelect"
import { useLocationPreference, useAutoDetectLocation, autoDetectLocation, getLocationPreference } from "../../lib/locationPreference"

export default function HomepageLocationBar() {
  const { state, city, setLocation, label } = useLocationPreference()
  const { detecting } = useAutoDetectLocation()

  const handleDetect = async () => {
    const result = await autoDetectLocation({ force: true })
    if (result.state || result.city) {
      setLocation(result.state, result.city)
    }
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
        <button
          type="button"
          onClick={handleDetect}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 text-primary text-xs font-poppins font-semibold hover:bg-primary/5 cursor-pointer disabled:opacity-50 self-start"
        >
          {detecting ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          Use my location
        </button>
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

      {detecting ? (
        <p className="font-nunito text-xs text-gray mt-3 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Finding your city...
        </p>
      ) : label ? (
        <p className="font-nunito text-xs text-primary mt-3">
          Showing kitchens in <span className="font-semibold">{label}</span>
        </p>
      ) : (
        <p className="font-nunito text-xs text-gray mt-3">No location selected — all available kitchens are shown</p>
      )}
    </section>
  )
}
