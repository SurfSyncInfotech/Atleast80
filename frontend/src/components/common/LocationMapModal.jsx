import { useEffect, useRef, useState } from "react"
import { X, Search, MapPin, Navigation, Check, Loader2, Edit3 } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { api } from "../../lib/api"

import { validateBrowserLocation } from "../../lib/locationPreference"

// Fix default Leaflet marker icon urls in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

export default function LocationMapModal({ isOpen, onClose, onConfirmLocation, initialAddress, initialCity, initialState, initialLat, initialLng }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const [currentCoords, setCurrentCoords] = useState(null)
  const [accuracyNotice, setAccuracyNotice] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [detectedData, setDetectedData] = useState({
    formattedAddress: initialAddress || "",
    city: initialCity || "",
    state: initialState || "",
    pincode: "",
    suburb: ""
  })

  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const lastReverseAddrRef = useRef("")

  // Initialize modal state when opened: if returning user with saved location/coordinates, pre-fill map position and address; otherwise reset
  useEffect(() => {
    if (!isOpen) return

    setAccuracyNotice(null)
    setGeoError(null)

    const parsedLat = (initialLat !== null && initialLat !== undefined && !isNaN(Number(initialLat))) ? Number(initialLat) : null
    const parsedLng = (initialLng !== null && initialLng !== undefined && !isNaN(Number(initialLng))) ? Number(initialLng) : null

    const prefilledAddr = initialAddress || [initialCity, initialState].filter(Boolean).join(", ")
    lastReverseAddrRef.current = prefilledAddr || ""

    if (parsedLat !== null && parsedLng !== null) {
      setCurrentCoords({ lat: parsedLat, lng: parsedLng })
      setDetectedData({
        formattedAddress: prefilledAddr || "",
        city: initialCity || "",
        state: initialState || "",
        pincode: "",
        suburb: ""
      })
    } else if (prefilledAddr) {
      setCurrentCoords(null)
      setDetectedData({
        formattedAddress: prefilledAddr,
        city: initialCity || "",
        state: initialState || "",
        pincode: "",
        suburb: ""
      })
      // Geocode initial city/address if coordinates not explicitly saved
      api(`/api/locations/search?q=${encodeURIComponent(prefilledAddr)}`)
        .then((res) => {
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            const first = res.data[0]
            const lat = Number(first.latitude)
            const lng = Number(first.longitude)
            if (lat && lng) {
              setCurrentCoords({ lat, lng })
            }
          }
        })
        .catch(() => {})
    } else {
      setCurrentCoords(null)
      setDetectedData({
        formattedAddress: "",
        city: "",
        state: "",
        pincode: "",
        suburb: ""
      })
    }
  }, [isOpen, initialLat, initialLng, initialAddress, initialCity, initialState])

  // Initialize or re-create Leaflet Map cleanly every time modal opens
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      // Clean up previous map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }

      const initialCenter = currentCoords ? [currentCoords.lat, currentCoords.lng] : [20.5937, 78.9629]
      const initialZoom = currentCoords ? 15 : 5

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(initialCenter, initialZoom)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      if (currentCoords) {
        const customMarker = L.marker([currentCoords.lat, currentCoords.lng], {
          draggable: true,
        }).addTo(map)

        customMarker.on("dragend", (e) => {
          const latLng = e.target.getLatLng()
          setCurrentCoords({ lat: latLng.lat, lng: latLng.lng })
          fetchSurfSyncReverse(latLng.lat, latLng.lng)
        })

        markerRef.current = customMarker
      }

      map.on("click", (e) => {
        const lat = e.latlng.lat
        const lng = e.latlng.lng
        setCurrentCoords({ lat, lng })
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map)
          newMarker.on("dragend", (evt) => {
            const latLng = evt.target.getLatLng()
            setCurrentCoords({ lat: latLng.lat, lng: latLng.lng })
            fetchSurfSyncReverse(latLng.lat, latLng.lng)
          })
          markerRef.current = newMarker
        }
        fetchSurfSyncReverse(lat, lng)
      })

      mapInstanceRef.current = map

      // Force recalculate Leaflet map container size after DOM modal transition
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 100)
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen])

  // Sync map center and marker position whenever currentCoords updates (e.g. from async geocode)
  useEffect(() => {
    if (!mapInstanceRef.current || !currentCoords) return
    mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], 15)
    if (markerRef.current) {
      markerRef.current.setLatLng([currentCoords.lat, currentCoords.lng])
    } else {
      const customMarker = L.marker([currentCoords.lat, currentCoords.lng], {
        draggable: true,
      }).addTo(mapInstanceRef.current)

      customMarker.on("dragend", (e) => {
        const latLng = e.target.getLatLng()
        setCurrentCoords({ lat: latLng.lat, lng: latLng.lng })
        fetchSurfSyncReverse(latLng.lat, latLng.lng)
      })

      markerRef.current = customMarker
    }
  }, [currentCoords])

  // Cleanup Map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const fetchSurfSyncReverse = async (lat, lng) => {
    setIsLoadingAddress(true)
    console.trace("[REVERSE GEOCODE CALLED]", {
      latitude: lat,
      longitude: lng,
      apiEndpoint: `/api/locations/reverse?lat=${lat}&lng=${lng}`,
      caller: "LocationMapModal.fetchSurfSyncReverse"
    })
    try {
      const data = await api(`/api/locations/reverse?lat=${lat}&lng=${lng}`)
      console.log("[LOCATION TRACE] LocationMapModal fetchSurfSyncReverse response", {
        data,
        caller: "LocationMapModal.fetchSurfSyncReverse"
      })
      if (data) {
        const addr = data.address || {}
        const state = data.state || addr.state || ""

        let rawCity = data.city || addr.city || ""
        let town = data.town || addr.town || ""
        let district = data.district || addr.district || addr.county || ""

        const societyKeywords = ["society", "housing", "co-operative", "co-op", "apartment", "apt", "colony", "towers", "tower", "residency", "enclave", "chsl", "complex", "villas", "flat", "building", "layout"]
        const isSocietyName = rawCity && societyKeywords.some(kw => rawCity.toLowerCase().includes(kw))

        let city = isSocietyName ? (town || district || rawCity) : (rawCity || town || district || addr.village || "")
        let suburb = data.suburb || addr.suburb || addr.neighbourhood || (isSocietyName ? rawCity : "") || ""

        const postcode = data.postcode || addr.postcode || ""
        const formattedAddress = data.formattedAddress || data.displayName || [suburb, city, state, postcode].filter(Boolean).join(", ")
        lastReverseAddrRef.current = formattedAddress

        setDetectedData({
          formattedAddress,
          city,
          state,
          pincode: postcode,
          suburb
        })
      }
    } catch (err) {
      console.warn("SurfSync Map Reverse Geocode failed:", err)
    } finally {
      setIsLoadingAddress(false)
    }
  }

  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Please search or pick your location on map.")
      return
    }

    setGeoError(null)
    setAccuracyNotice(null)
    setIsLocatingUser(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        if (!lat || !lng) {
          setGeoError("Could not determine valid coordinates.")
          setIsLocatingUser(false)
          return
        }

        setCurrentCoords({ lat, lng })
        setGeoError(null)
        setAccuracyNotice(null)

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16)
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            const m = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current)
            m.on("dragend", (e) => {
              const latLng = e.target.getLatLng()
              setCurrentCoords({ lat: latLng.lat, lng: latLng.lng })
              fetchSurfSyncReverse(latLng.lat, latLng.lng)
            })
            markerRef.current = m
          }
          mapInstanceRef.current.invalidateSize()
        }

        fetchSurfSyncReverse(lat, lng)
        setIsLocatingUser(false)
      },
      (err) => {
        console.warn("GPS Location detect error:", err)
        if (err.code === 1) {
          setGeoError("Location permission denied. Please allow permission or search/pick manually on map.")
        } else if (err.code === 2) {
          setGeoError("Location position unavailable. Please search or pick manually on map.")
        } else if (err.code === 3) {
          setGeoError("Location request timed out. Please try again or search manually.")
        } else {
          setGeoError("Could not detect location. Please search or pick manually on map.")
        }
        setIsLocatingUser(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await api(`/api/locations/search?q=${encodeURIComponent(searchQuery.trim())}`)
        if (res && Array.isArray(res.data)) {
          setSearchResults(res.data)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.warn("SurfSync Location Search failed:", err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Debounce geocode when user manually types in the bottom address field
  useEffect(() => {
    const text = detectedData.formattedAddress?.trim()
    if (!text || text === lastReverseAddrRef.current || text.length < 3) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api(`/api/locations/search?q=${encodeURIComponent(text)}`)
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          const first = res.data[0]
          const lat = Number(first.latitude)
          const lng = Number(first.longitude)

          if (lat && lng) {
            setCurrentCoords({ lat, lng })
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([lat, lng], 15)
              if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng])
              }
            }
          }

          setDetectedData((prev) => ({
            ...prev,
            city: first.city || first.town || first.district || prev.city,
            state: first.state || prev.state,
            pincode: first.postcode || prev.pincode,
            suburb: first.suburb || prev.suburb
          }))
        }
      } catch (err) {
        console.warn("SurfSync manual address geocode failed:", err)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [detectedData.formattedAddress])

  const handleSelectSearchResult = (result) => {
    const lat = Number(result.latitude)
    const lng = Number(result.longitude)

    if (lat && lng) {
      setCurrentCoords({ lat, lng })
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 17)
        markerRef.current.setLatLng([lat, lng])
        mapInstanceRef.current.invalidateSize()
      }

      const formatted = result.formattedAddress || result.displayName || ""
      lastReverseAddrRef.current = formatted

      setDetectedData({
        formattedAddress: formatted,
        city: result.city || "",
        state: result.state || "",
        pincode: result.postcode || "",
        suburb: result.suburb || ""
      })
    }
    setSearchResults([])
    setSearchQuery("")
  }

  const handleConfirm = async () => {
    let address = (detectedData.formattedAddress || "").trim()
    let city = (detectedData.city || "").trim()
    let state = (detectedData.state || "").trim()
    let pincode = (detectedData.pincode || "").trim()
    let suburb = (detectedData.suburb || "").trim()
    let latitude = currentCoords?.lat || null
    let longitude = currentCoords?.lng || null

    // If user edited address manually and it differs from last reverse-geocoded address
    if (address && address !== lastReverseAddrRef.current && address.length >= 3) {
      try {
        const res = await api(`/api/locations/search?q=${encodeURIComponent(address)}`)
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          const top = res.data[0]
          city = top.city || top.town || top.district || city
          state = top.state || state
          pincode = top.postcode || pincode
          suburb = top.suburb || suburb
          if (top.latitude && top.longitude) {
            latitude = Number(top.latitude)
            longitude = Number(top.longitude)
          }
        }
      } catch (err) {
        console.warn("Geocoding during confirm failed:", err)
      }
    }

    // Fallback: If city or state still missing or unparsed, check comma separation (e.g. "kolad, Maharashtra")
    if (address.includes(",")) {
      const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        if (!city || address !== lastReverseAddrRef.current) {
          city = parts[0]
          state = parts[parts.length - 1]
        }
      }
    }

    onConfirmLocation({
      address: detectedData.formattedAddress,
      city,
      state,
      pincode,
      suburb,
      latitude,
      longitude
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] relative border border-gray-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-poppins font-bold text-base text-dark leading-snug">Pin Location on Map</h3>
              <p className="font-nunito text-xs text-gray">Drag pin or search to set your exact address</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer border-0"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Search Bar & Auto Detect Button */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 space-y-3 relative z-20">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type street, colony, building or area..."
                className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-nunito focus:outline-none focus:border-primary shadow-sm"
              />
              {isSearching && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>

            <button
              type="button"
              onClick={handleGPSDetect}
              disabled={isLocatingUser}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-primary/20 text-primary text-xs font-poppins font-semibold hover:bg-primary/5 cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {isLocatingUser ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              GPS
            </button>
          </div>

          {geoError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-nunito px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span>{geoError}</span>
            </div>
          )}

          {accuracyNotice && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-nunito px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="flex-shrink-0">ℹ️</span>
              <span>{accuracyNotice}</span>
            </div>
          )}

          {/* Search Suggestion Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
              {searchResults.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-start gap-2.5 cursor-pointer border-0 bg-transparent"
                >
                  <MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-poppins font-semibold text-xs text-dark truncate">{res.streetLine || res.suburb || res.city}</p>
                    <p className="font-nunito text-[11px] text-gray-500 truncate">{res.formattedAddress || res.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] w-full bg-gray-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[280px] sm:min-h-[340px] z-0" />
          
          <div className="absolute bottom-3 left-3 z-[400] bg-dark/80 backdrop-blur-md text-white text-[11px] font-nunito px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 pointer-events-none">
            <Edit3 size={12} className="text-primary-light" />
            <span>Click map or drag pin to adjust position</span>
          </div>
        </div>

        {/* Address Preview & Confirm Actions Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-nunito text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Selected Address (Edit manually if needed)
              </p>
              <span className="text-[10px] text-primary font-nunito font-medium">Editable</span>
            </div>
            {isLoadingAddress ? (
              <div className="flex items-center gap-2 py-2 px-1 text-gray-500">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="font-nunito text-xs text-gray-600">Updating address...</span>
              </div>
            ) : (
              <input
                type="text"
                value={detectedData.formattedAddress}
                onChange={(e) => setDetectedData((prev) => ({ ...prev, formattedAddress: e.target.value }))}
                placeholder="Type or edit your exact house no, building name, landmark..."
                className="w-full px-3 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white rounded-xl border border-gray-200 text-xs font-poppins font-semibold text-dark focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-xs"
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-poppins font-semibold hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoadingAddress || !detectedData.formattedAddress}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-poppins font-bold hover:bg-primary-dark cursor-pointer transition-colors shadow-md shadow-primary/20 disabled:opacity-50 border-0"
            >
              <Check size={14} />
              Confirm Location
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
