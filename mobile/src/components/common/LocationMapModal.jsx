import React, { useEffect, useRef, useState } from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
} from "react-native"
import * as Location from "expo-location"
import { X, Search, MapPin, Navigation, Check, Edit3 } from "lucide-react-native"
import { api } from "../../lib/api"

let WebView = null
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView
  } catch (e) {
    console.warn("react-native-webview not loaded", e)
  }
}

export default function LocationMapModal({
  visible,
  onClose,
  onConfirmLocation,
  initialAddress = "",
  initialCity = "",
  initialState = "",
  initialLat = null,
  initialLng = null
}) {
  const webViewRef = useRef(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const [currentCoords, setCurrentCoords] = useState(null)
  const [detectedAddress, setDetectedAddress] = useState(initialAddress)
  const [detectedCity, setDetectedCity] = useState(initialCity)
  const [detectedState, setDetectedState] = useState(initialState)
  const [detectedPincode, setDetectedPincode] = useState("")
  const [detectedSuburb, setDetectedSuburb] = useState("")

  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isLocatingUser, setIsLocatingUser] = useState(false)

  const handleGPSDetect = async () => {
    setIsLocatingUser(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access in your device settings to use GPS.")
        setIsLocatingUser(false)
        return
      }

      let lat = null
      let lng = null

      // Step 1: Check last known position for instant (0ms) response
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 })
        if (lastKnown && lastKnown.coords) {
          lat = lastKnown.coords.latitude
          lng = lastKnown.coords.longitude
        }
      } catch (e) {
        // Continue to fresh GPS fetch
      }

      // Step 2: If no cached position, fetch fresh position with Balanced accuracy and 8s timeout
      if (!lat || !lng) {
        try {
          const freshPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("GPS_TIMEOUT")), 8000))
          const loc = await Promise.race([freshPromise, timeoutPromise])
          if (loc && loc.coords) {
            lat = loc.coords.latitude
            lng = loc.coords.longitude
          }
        } catch (posErr) {
          console.warn("Balanced GPS failed or timed out, trying low accuracy fallback:", posErr)
          // Fallback to lowest accuracy for fast cell tower / wifi fix
          const lowLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }).catch(() => null)
          if (lowLoc && lowLoc.coords) {
            lat = lowLoc.coords.latitude
            lng = lowLoc.coords.longitude
          }
        }
      }

      if (lat && lng) {
        setCurrentCoords({ lat, lng })

        if (Platform.OS === "web") {
          const iframe = document.getElementById("leaflet-map-iframe")
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ action: "flyTo", lat, lng }), "*")
          }
        } else if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.map && window.marker) {
              window.map.flyTo([${lat}, ${lng}], 16);
              window.marker.setLatLng([${lat}, ${lng}]);
            }
            true;
          `)
        }

        await fetchSurfSyncReverse(lat, lng)
      } else {
        Alert.alert("GPS Error", "Could not detect your GPS coordinates. Please ensure GPS/Location is enabled on your phone or search your address above.")
      }
    } catch (err) {
      console.warn("Mobile GPS detect failed:", err)
      Alert.alert("GPS Error", "Could not detect live GPS location. Please check your location settings or search manually.")
    } finally {
      setIsLocatingUser(false)
    }
  }

  useEffect(() => {
    if (!visible) return

    const prefilledAddr = initialAddress || [initialCity, initialState].filter(Boolean).join(", ")
    setDetectedAddress(prefilledAddr || "")
    setDetectedCity(initialCity || "")
    setDetectedState(initialState || "")

    const parsedLat = (initialLat !== null && initialLat !== undefined && !isNaN(Number(initialLat))) ? Number(initialLat) : null
    const parsedLng = (initialLng !== null && initialLng !== undefined && !isNaN(Number(initialLng))) ? Number(initialLng) : null

    if (parsedLat !== null && parsedLng !== null) {
      setCurrentCoords({ lat: parsedLat, lng: parsedLng })
      setTimeout(() => {
        if (Platform.OS === "web") {
          const iframe = document.getElementById("leaflet-map-iframe")
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ action: "flyTo", lat: parsedLat, lng: parsedLng }), "*")
          }
        } else if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.map && window.marker) {
              window.map.flyTo([${parsedLat}, ${parsedLng}], 16);
              window.marker.setLatLng([${parsedLat}, ${parsedLng}]);
            }
            true;
          `)
        }
      }, 300)
    } else if (prefilledAddr) {
      api(`/api/locations/search?q=${encodeURIComponent(prefilledAddr)}`)
        .then((res) => {
          if (res?.data?.[0]) {
            const first = res.data[0]
            const lat = Number(first.latitude || first.lat)
            const lng = Number(first.longitude || first.lng)
            if (lat && lng) {
              setCurrentCoords({ lat, lng })
              if (Platform.OS === "web") {
                const iframe = document.getElementById("leaflet-map-iframe")
                if (iframe && iframe.contentWindow) {
                  iframe.contentWindow.postMessage(JSON.stringify({ action: "flyTo", lat, lng }), "*")
                }
              } else if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  if (window.map && window.marker) {
                    window.map.flyTo([${lat}, ${lng}], 15);
                    window.marker.setLatLng([${lat}, ${lng}]);
                  }
                  true;
                `)
              }
            }
          }
        })
        .catch(() => {})
    } else {
      setCurrentCoords(null)
    }
  }, [visible, initialAddress, initialCity, initialState, initialLat, initialLng])

  // SurfSync Reverse Geocode API Call
  const fetchSurfSyncReverse = async (lat, lng) => {
    setIsLoadingAddress(true)
    try {
      let data = null
      try {
        data = await api(`/api/locations/reverse?lat=${lat}&lng=${lng}`)
      } catch (apiErr) {
        console.warn("SurfSync Reverse API error, using native fallback:", apiErr)
      }

      if (data && (data.formattedAddress || data.displayName || data.city)) {
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
        const formatted = data.formattedAddress || data.displayName || [suburb, city, state, postcode].filter(Boolean).join(", ")

        setDetectedAddress(formatted)
        if (city) setDetectedCity(city)
        if (state) setDetectedState(state)
        if (postcode) setDetectedPincode(postcode)
        if (suburb) setDetectedSuburb(suburb)
      } else {
        // Native reverse geocode fallback
        try {
          const [nativeRes] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
          if (nativeRes) {
            const city = nativeRes.city || nativeRes.subregion || nativeRes.district || ""
            const state = nativeRes.region || ""
            const street = [nativeRes.name, nativeRes.street, nativeRes.district].filter(Boolean).join(", ")
            const pincode = nativeRes.postalCode || ""
            const formatted = [street, city, state, pincode].filter(Boolean).join(", ")
            setDetectedAddress(formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
            if (city) setDetectedCity(city)
            if (state) setDetectedState(state)
            if (pincode) setDetectedPincode(pincode)
          }
        } catch (geoErr) {
          console.warn("Native reverse geocode fallback error:", geoErr)
          setDetectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
      }
    } catch (err) {
      console.warn("Mobile SurfSync Reverse Geocode failed:", err)
    } finally {
      setIsLoadingAddress(false)
    }
  }

  // Web platform postMessage listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleWebMessage = (event) => {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
          if (data && data.lat && data.lng) {
            const lat = Number(data.lat)
            const lng = Number(data.lng)
            setCurrentCoords({ lat, lng })
            fetchSurfSyncReverse(lat, lng)
          }
        } catch (e) {}
      }
      window.addEventListener("message", handleWebMessage)
      return () => window.removeEventListener("message", handleWebMessage)
    }
  }, [])

  // Handle WebView messages (pin drag / map click on native)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data && data.lat && data.lng) {
        const lat = Number(data.lat)
        const lng = Number(data.lng)
        setCurrentCoords({ lat, lng })
        fetchSurfSyncReverse(lat, lng)
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // SurfSync Address Search Call (Manual Typing)
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
        console.warn("Mobile SurfSync Search failed:", err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectSearchResult = (item) => {
    const lat = Number(item.latitude || item.lat)
    const lng = Number(item.longitude || item.lng)

    if (lat && lng) {
      setCurrentCoords({ lat, lng })
      const formatted = item.formattedAddress || item.displayName || ""
      setDetectedAddress(formatted)
      if (item.city) setDetectedCity(item.city)
      if (item.state) setDetectedState(item.state)
      if (item.postcode) setDetectedPincode(item.postcode)

      // Move Leaflet map in WebView / Iframe
      if (Platform.OS === "web") {
        const iframe = document.getElementById("leaflet-map-iframe")
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ action: "flyTo", lat, lng }), "*")
        }
      } else if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.map && window.marker) {
            window.map.flyTo([${lat}, ${lng}], 16);
            window.marker.setLatLng([${lat}, ${lng}]);
          }
          true;
        `)
      }
    }
    setSearchResults([])
    setSearchQuery("")
  }

  const handleConfirm = () => {
    let finalSuburb = detectedSuburb
    if (finalSuburb && detectedAddress && !detectedAddress.toLowerCase().includes(finalSuburb.toLowerCase())) {
      finalSuburb = ""
    }
    let finalCity = detectedCity
    if (detectedAddress) {
      const parts = detectedAddress.split(",").map(p => p.trim()).filter(Boolean)
      if (parts.length > 0 && (!finalCity || !detectedAddress.toLowerCase().includes(finalCity.toLowerCase()))) {
        finalCity = parts[0]
      }
    }
    onConfirmLocation({
      address: detectedAddress,
      city: finalCity,
      state: detectedState,
      pincode: detectedPincode,
      suburb: finalSuburb,
      latitude: currentCoords?.lat || null,
      longitude: currentCoords?.lng || null
    })
    onClose()
  }

  const mapLat = currentCoords?.lat || 20.5937
  const mapLng = currentCoords?.lng || 78.9629
  const mapZoom = currentCoords ? 15 : 5

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #f3f4f6; }
          .leaflet-container { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${mapLat}, ${mapLng}], ${mapZoom});
          window.map = map;
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var marker = L.marker([${mapLat}, ${mapLng}], { draggable: true }).addTo(map);
          window.marker = marker;

          function sendCoords(lat, lng) {
            var data = JSON.stringify({ lat: lat, lng: lng });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(data);
            } else if (window.parent && window.parent.postMessage) {
              window.parent.postMessage(data, "*");
            }
          }

          marker.on('dragend', function(e) {
            var latLng = e.target.getLatLng();
            sendCoords(latLng.lat, latLng.lng);
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            sendCoords(e.latlng.lat, e.latlng.lng);
          });

          window.addEventListener('message', function(e) {
            try {
              var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              if (data && data.action === 'flyTo' && data.lat && data.lng) {
                if (window.map && window.marker) {
                  window.map.flyTo([data.lat, data.lng], 16);
                  window.marker.setLatLng([data.lat, data.lng]);
                }
              }
            } catch(err){}
          });
        </script>
      </body>
    </html>
  `

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={styles.container}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconCircle}>
              <MapPin size={18} color="#0B6B3A" />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.headerTitle}>Pin Location on Map</Text>
              <Text style={styles.headerSubtitle}>Drag pin or search to set your exact address</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color="#4A5568" />
          </TouchableOpacity>
        </View>

        {/* Search Bar & GPS Button */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Search size={16} color="#A0AEC0" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search street, colony, building..."
                placeholderTextColor="#A0AEC0"
              />
              {isSearching && <ActivityIndicator size="small" color="#0B6B3A" style={styles.searchLoader} />}
            </View>

            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGPSDetect}
              disabled={isLocatingUser}
            >
              {isLocatingUser ? (
                <ActivityIndicator size="small" color="#0B6B3A" />
              ) : (
                <Navigation size={14} color="#0B6B3A" />
              )}
              <Text style={styles.gpsBtnText}>GPS</Text>
            </TouchableOpacity>
          </View>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsDropdown}>
              <FlatList
                data={searchResults}
                keyExtractor={(_, index) => index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <MapPin size={14} color="#0B6B3A" style={styles.resultIcon} />
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultMainText} numberOfLines={1}>
                        {item.streetLine || item.suburb || item.city}
                      </Text>
                      <Text style={styles.resultSubText} numberOfLines={1}>
                        {item.formattedAddress || item.displayName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === "web" ? (
            <iframe
              id="leaflet-map-iframe"
              srcDoc={leafletHtml}
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : WebView ? (
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              onMessage={handleWebViewMessage}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F7FAFC" }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <MapPin size={32} color="#0B6B3A" />
              </View>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: "#1F1F1F", textAlign: "center" }}>
                Location Pin &amp; Search
              </Text>
              <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#718096", textAlign: "center", marginTop: 4, lineHeight: 18, maxWidth: 280 }}>
                Use the search box above or tap GPS to auto-detect your exact address.
              </Text>
            </View>
          )}
          <View style={styles.mapTipBadge}>
            <Edit3 size={11} color="#0B6B3A" />
            <Text style={styles.mapTipText}>Search address or tap GPS to detect</Text>
          </View>
        </View>

        {/* Footer: Editable Address Input & Confirm Button */}
        <View style={styles.footer}>
          <View style={styles.footerLabelRow}>
            <Text style={styles.footerLabel}>Selected Address (Edit manually if needed)</Text>
            <Text style={styles.editableBadge}>Editable</Text>
          </View>

          {isLoadingAddress ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#0B6B3A" />
              <Text style={styles.loadingText}>Updating address...</Text>
            </View>
          ) : (
            <TextInput
              style={styles.addressInput}
              value={detectedAddress}
              onChangeText={setDetectedAddress}
              placeholder="Type or edit your exact house no, building name, landmark..."
              placeholderTextColor="#A0AEC0"
              multiline={true}
            />
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, (!detectedAddress || isLoadingAddress) && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={!detectedAddress || isLoadingAddress}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "ios" ? 44 : 10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    backgroundColor: "#FFFFFF"
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(11, 107, 58, 0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  titleTextCol: {
    flexDirection: "column"
  },
  headerTitle: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 15,
    color: "#1A202C"
  },
  headerSubtitle: {
    fontFamily: "Nunito",
    fontSize: 11,
    color: "#718096"
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDF2F7",
    alignItems: "center",
    justifyContent: "center"
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    zIndex: 20
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 42
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAF7EE",
    borderWidth: 1,
    borderColor: "#A3D3B8",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    justifyContent: "center"
  },
  gpsBtnText: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 12,
    color: "#0B6B3A"
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito",
    fontSize: 12,
    color: "#1A202C",
    paddingVertical: 0
  },
  searchLoader: {
    marginLeft: 8
  },
  resultsDropdown: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 180,
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F7FAFC"
  },
  resultIcon: {
    marginRight: 10
  },
  resultTextCol: {
    flex: 1
  },
  resultMainText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 12,
    color: "#2D3748"
  },
  resultSubText: {
    fontFamily: "Nunito",
    fontSize: 10,
    color: "#718096"
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#EDF2F7"
  },
  webView: {
    flex: 1
  },
  mapTipBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(26, 32, 44, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  mapTipText: {
    fontFamily: "Nunito",
    fontSize: 10,
    color: "#FFFFFF"
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7"
  },
  footerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  footerLabel: {
    fontFamily: "Nunito",
    fontWeight: "700",
    fontSize: 11,
    color: "#718096",
    textTransform: "uppercase"
  },
  editableBadge: {
    fontFamily: "Nunito",
    fontSize: 10,
    fontWeight: "600",
    color: "#0B6B3A"
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F7FAFC",
    borderRadius: 10
  },
  loadingText: {
    fontFamily: "Nunito",
    fontSize: 12,
    color: "#4A5568"
  },
  addressInput: {
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 12,
    color: "#1A202C",
    maxHeight: 70,
    marginBottom: 12
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF"
  },
  cancelBtnText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 12,
    color: "#4A5568"
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#0B6B3A"
  },
  confirmBtnText: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 13,
    color: "#FFFFFF"
  },
  btnDisabled: {
    opacity: 0.5
  }
})
