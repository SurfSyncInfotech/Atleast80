import { MapPin } from "lucide-react"
import StateCitySelect from "./StateCitySelect"
import { useLocationPreference } from "../../lib/locationPreference"

export default function HomepageLocationBar() {
  const { state, city, setLocation, label } = useLocationPreference()

  return (
    <section className="mt-4 md:mt-6 bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="font-poppins font-semibold text-sm text-dark">Your delivery location</h3>
          <p className="font-nunito text-xs text-gray">Select state and city to see nearby home kitchens</p>
        </div>
      </div>

      <StateCitySelect
        state={state}
        city={city}
        variant="hero"
        onStateChange={(value) => setLocation(value, "")}
        onCityChange={(value) => setLocation(state, value)}
      />

      {label ? (
        <p className="font-nunito text-xs text-primary mt-3">
          Showing kitchens in <span className="font-semibold">{label}</span>
        </p>
      ) : (
        <p className="font-nunito text-xs text-gray mt-3">No location selected — all available kitchens are shown</p>
      )}
    </section>
  )
}
