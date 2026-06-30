import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const selectVariants = {
  default:
    "w-full px-4 py-3 bg-[#f4f4f5] border border-gray-200 font-nunito text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed",
  light:
    "w-full px-3 py-2.5 bg-white border border-gray-200 font-nunito text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed",
  hero:
    "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-nunito text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm",
}

export default function StateCitySelect({
  state,
  city,
  onStateChange,
  onCityChange,
  className,
  required = false,
  disabled = false,
  variant = "default",
}) {
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [stateIso, setStateIso] = useState("")
  const [loadingStates, setLoadingStates] = useState(true)
  const [loadingCities, setLoadingCities] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoadingStates(true)
    setError("")
    api("/api/locations/states")
      .then((data) => setStates(data.states || []))
      .catch((err) => {
        setStates([])
        setError(err.message || "Could not load states")
      })
      .finally(() => setLoadingStates(false))
  }, [])

  useEffect(() => {
    if (!state || !states.length) return
    const match = states.find((s) => s.name === state)
    if (match && match.iso2 !== stateIso) {
      setStateIso(match.iso2)
    }
  }, [state, states, stateIso])

  useEffect(() => {
    if (!stateIso) {
      setCities([])
      return
    }

    setLoadingCities(true)
    api(`/api/locations/cities?state=${encodeURIComponent(stateIso)}`)
      .then((data) => setCities(data.cities || []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false))
  }, [stateIso])

  const handleStateSelect = (e) => {
    const iso = e.target.value
    const selected = states.find((s) => s.iso2 === iso)
    setStateIso(iso)
    onStateChange(selected?.name || "")
    onCityChange("")
  }

  const handleCitySelect = (e) => {
    onCityChange(e.target.value)
  }

  const selectClass = selectVariants[variant] || selectVariants.default

  return (
    <div className={cn("space-y-1", className)}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <select
            className={selectClass}
            value={stateIso}
            onChange={handleStateSelect}
            required={required}
            disabled={disabled || loadingStates}
          >
            <option value="">{loadingStates ? "Loading states..." : "Select state"}</option>
            {states.map((s) => (
              <option key={s.iso2} value={s.iso2}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            className={selectClass}
            value={city}
            onChange={handleCitySelect}
            required={required}
            disabled={disabled || !stateIso || loadingCities}
          >
            <option value="">
              {!stateIso
                ? "Select state first"
                : loadingCities
                ? "Loading cities..."
                : "Select city"}
            </option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="font-nunito text-xs text-red-600">{error}</p>}
    </div>
  )
}
