import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useVideoPlayer, VideoView } from "expo-video"
import { resolveMediaUrl } from "../../lib/media"
import {
  ChefHat,
  ArrowRight,
  ArrowLeft,
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Check,
  Upload,
  FileText,
  UtensilsCrossed,
  Eye,
  Download,
  ChevronDown,
  X,
  Video,
  CheckCircle,
  AlertTriangle,
  Shield,
  LocateFixed,
  ExternalLink
} from "lucide-react-native"
import LocationMapModal from "../../components/common/LocationMapModal"
import { LinearGradient } from "expo-linear-gradient"
import * as DocumentPicker from "expo-document-picker"
import * as WebBrowser from "expo-web-browser"
import * as Location from "expo-location"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"
import { api, getPartnerAgreement, checkPhoneAvailability } from "../../lib/api"

const steps = [
  { id: 1, title: "Kitchen Info", subtitle: "Tell Us About Your Kitchen", icon: Store },
  { id: 2, title: "Account", subtitle: "Create Your Account", icon: User },
  { id: 3, title: "Location", subtitle: "Location & Kitchen Details", icon: MapPin },
  { id: 4, title: "Agreement", subtitle: "Agreement & Training Video", icon: CheckCircle },
  { id: 5, title: "KYC Verify", subtitle: "KYC Documents Verification", icon: Shield },
]

function TrainingVideoPlayer({ videoUrl, onEnded }) {
  const player = useVideoPlayer(videoUrl, (playerInstance) => {
    playerInstance.loop = false
    playerInstance.play()
  })

  useEffect(() => {
    if (!player) return
    const sub = player.addListener("playToEnd", () => {
      onEnded?.()
    })
    return () => {
      sub?.remove()
    }
  }, [player, onEnded])

  if (Platform.OS === "web") {
    return (
      <video
        src={videoUrl}
        controls
        autoPlay
        playsInline
        style={{ width: "100%", maxHeight: "80vh", backgroundColor: "#000" }}
        onEnded={onEnded}
      />
    )
  }

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%", backgroundColor: "#000000" }}
      contentFit="contain"
      nativeControls={true}
    />
  )
}

export default function KitchenSignupPage() {
  const router = useRouter()
  const { registerKitchen, verifyKitchenRegisterOtp } = useAuth()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  // Form State
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    speciality: "",
    kitchenType: "veg",
    bestItem: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    openingTime: "",
    description: "",
    aadhaarNumber: "",
    panNumber: "",
  })
  const [fssaiLicenseFile, setFssaiLicenseFile] = useState(null)
  const [aadhaarCardFile, setAadhaarCardFile] = useState(null)
  const [aadhaarCardBackFile, setAadhaarCardBackFile] = useState(null)
  const [panCardFile, setPanCardFile] = useState(null)

  // OTP Verification Modal States
  const [signupOtpVisible, setSignupOtpVisible] = useState(false)
  const [signupUserId, setSignupUserId] = useState(null)
  const [signupOtp, setSignupOtp] = useState(["", "", "", ""])
  const [signupDemoOtp, setSignupDemoOtp] = useState("")
  const [signupOtpError, setSignupOtpError] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)
  const signupOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  // Location Picker States
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [statePickerVisible, setStatePickerVisible] = useState(false)
  const [cityPickerVisible, setCityPickerVisible] = useState(false)

  // Agreement & Training Video States
  const [agreement, setAgreement] = useState(null)
  const [agreementLoading, setAgreementLoading] = useState(false)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [agreementViewed, setAgreementViewed] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)
  const [pdfModalVisible, setPdfModalVisible] = useState(false)
  const [pdfScrolledToBottom, setPdfScrolledToBottom] = useState(false)
  const [videoModalVisible, setVideoModalVisible] = useState(false)

  // Load agreement and video metadata
  useEffect(() => {
    if (step !== 4 || agreement || agreementLoading) return
    setAgreementLoading(true)
    getPartnerAgreement()
      .then((data) => {
        if (data) {
          setAgreement({
            ...data,
            url: resolveMediaUrl(data.url),
            videoUrl: resolveMediaUrl(data.videoUrl),
          })
        }
      })
      .catch(() => setError("Failed to load Partner Agreement. Please try again."))
      .finally(() => setAgreementLoading(false))
  }, [step])

  const loadStates = async () => {
    if (statesList.length > 0) return
    setStatesLoading(true)
    try {
      const data = await api("/api/locations/states")
      setStatesList(data.states || [])
    } catch (err) {
      console.warn("Failed to load states:", err)
    } finally {
      setStatesLoading(false)
    }
  }

  const handleSelectState = async (stateName, stateIso) => {
    setForm((f) => ({ ...f, state: stateName, city: "" }))
    setStatePickerVisible(false)

    setCitiesLoading(true)
    try {
      const data = await api(`/api/locations/cities?state=${stateIso}`)
      setCitiesList(data.cities || [])
    } catch (err) {
      console.warn("Failed to load cities:", err)
      setCitiesList([])
    } finally {
      setCitiesLoading(false)
    }
  }

  const handleAutoDetectLocation = async () => {
    setError("")
    setDetectingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to auto-detect your address.")
        return
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = loc.coords

      const data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)

      if (!data) {
        Alert.alert("Location Error", "Could not resolve address details. Please fill manually.")
        return
      }

      const addr = data.address || {}
      const rawState = data.state || addr.state || ""
      let rawCity = data.city || addr.city || ""
      let town = data.town || addr.town || ""
      let district = data.district || addr.district || addr.county || ""

      const societyKeywords = ["society", "housing", "co-operative", "co-op", "apartment", "apt", "colony", "towers", "tower", "residency", "enclave", "chsl", "complex", "villas", "flat", "building", "layout"]
      const isSocietyName = rawCity && societyKeywords.some(kw => rawCity.toLowerCase().includes(kw))

      let city = isSocietyName ? (town || district || rawCity) : (rawCity || town || district || addr.village || "")
      let suburb = data.suburb || addr.suburb || addr.neighbourhood || (isSocietyName ? rawCity : "") || ""
      const postcode = data.postcode || addr.postcode || ""

      let streetAddress = data.formattedAddress || data.displayName || [suburb, city, rawState, postcode].filter(Boolean).join(", ")
      if (!streetAddress && data.display_name) {
        streetAddress = data.display_name.split(",").slice(0, 2).map((s) => s.trim()).join(", ")
      }

      setForm((f) => ({
        ...f,
        address: streetAddress || f.address,
        state: rawState || f.state,
        city: city || f.city,
        pincode: postcode || f.pincode,
      }))

      if (rawState) {
        try {
          const statesData = statesList.length ? { states: statesList } : await api("/api/locations/states")
          if (!statesList.length) setStatesList(statesData.states || [])
          const match = (statesData.states || []).find((s) => s.name && s.name.toLowerCase() === rawState.toLowerCase())
          if (match) {
            setCitiesLoading(true)
            const cdata = await api(`/api/locations/cities?state=${match.iso2}`)
            setCitiesList(cdata.cities || [])
          }
        } catch {
          // Non-critical — manual state/city picker will still fetch on demand
        } finally {
          setCitiesLoading(false)
        }
      }
    } catch (err) {
      Alert.alert("Location Error", "Failed to auto-detect location: " + err.message)
    } finally {
      setDetectingLocation(false)
    }
  }

  const [isMapModalVisible, setIsMapModalVisible] = useState(false)

  const handleConfirmMapLocation = async (data) => {
    if (!data) return
    const { address, city, state, pincode } = data
    setForm((f) => ({
      ...f,
      address: address || f.address,
      state: state || f.state,
      city: city || f.city,
      pincode: pincode || f.pincode,
    }))
    if (state) {
      try {
        const statesData = statesList.length ? { states: statesList } : await api("/api/locations/states")
        if (!statesList.length) setStatesList(statesData.states || [])
        const match = (statesData.states || []).find((s) => s.name.toLowerCase() === state.toLowerCase())
        if (match) {
          const cdata = await api(`/api/locations/cities?state=${match.iso2}`)
          setCitiesList(cdata.cities || [])
        }
      } catch (err) {}
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFssaiLicenseFile(result.assets[0])
        setError("")
      }
    } catch (err) {
      console.log("Error picking document", err)
    }
  }

  const pickAadhaarDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAadhaarCardFile(result.assets[0])
        setError("")
      }
    } catch (err) {
      console.log("Error picking Aadhaar document", err)
    }
  }

  const pickAadhaarBackDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAadhaarCardBackFile(result.assets[0])
        setError("")
      }
    } catch (err) {
      console.log("Error picking Aadhaar Back document", err)
    }
  }

  const pickPanDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPanCardFile(result.assets[0])
        setError("")
      }
    } catch (err) {
      console.log("Error picking PAN document", err)
    }
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.ownerName.trim() || !form.speciality.trim() || !form.bestItem.trim()) {
        setError("Kitchen name, owner name, speciality, and signature dish are required")
        return false
      }
    }
    if (step === 2) {
      if (!form.phone.trim() || !form.email.trim() || !form.password || !fssaiLicenseFile) {
        setError("Phone number, email address, password, and FSSAI license upload are required")
        return false
      }
      if (form.phone.trim().length !== 10) {
        setError("Phone number must be 10 digits")
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError("Please enter a valid email address")
        return false
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters")
        return false
      }
    }
    if (step === 3) {
      if (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
        setError("Full address, city, state, and pincode are required")
        return false
      }
      if (form.pincode.length !== 6) {
        setError("Pincode must be 6 digits")
        return false
      }
      if (!form.openingTime.trim()) {
        setError("Operating hours are required")
        return false
      }
      if (!form.description.trim()) {
        setError("Kitchen description is required")
        return false
      }
    }
    if (step === 4) {
      if (!agreementViewed) {
        setError("Please open and review the Partner Agreement PDF first")
        return false
      }
      if (agreement?.videoUrl && !videoWatched) {
        setError("Please watch the mandatory training video first")
        return false
      }
      if (!agreementAccepted) {
        setError("Please tick the confirmation checkbox to continue")
        return false
      }
    }
    if (step === 5) {
      if (!form.aadhaarNumber.trim() || !form.panNumber.trim() || !aadhaarCardFile || !aadhaarCardBackFile || !panCardFile) {
        setError("Aadhaar Number, Aadhaar Front & Back files, PAN Number, and PAN Card file are required")
        return false
      }
      if (!/^\d{12}$/.test(form.aadhaarNumber.trim())) {
        setError("Aadhaar number must be exactly 12 digits")
        return false
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.trim().toUpperCase())) {
        setError("PAN number must be a valid 10-character alphanumeric PAN")
        return false
      }
    }
    setError("")
    return true
  }

  const nextStep = async () => {
    if (!validateStep()) return
    if (step === 2) {
      setLoading(true)
      try {
        await checkPhoneAvailability(form.phone, form.email, "kitchen")
      } catch (err) {
        setError(err.message || "Mobile number or email already registered")
        setLoading(false)
        return
      }
      setLoading(false)
    }
    setStep((s) => Math.min(s + 1, 5))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    if (step < 5) {
      await nextStep()
      return
    }

    if (!validateStep()) return

    setError("")
    setLoading(true)
    try {
      const data = await registerKitchen(
        { ...form, agreementVersion: agreement.version },
        fssaiLicenseFile,
        aadhaarCardFile,
        aadhaarCardBackFile,
        panCardFile
      )
      if (data?.requiresOtp) {
        setSignupUserId(data.userId)
        if (data.demoOtp) setSignupDemoOtp(data.demoOtp)
        setSignupOtp(["", "", "", ""])
        setSignupOtpError("")
        setSignupOtpVisible(true)
      } else {
        router.replace({
          pathname: "/(kitchen)/dashboard",
          params: { newSignup: "true" },
        })
      }
    } catch (err) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignupOtp = async () => {
    const otpVal = signupOtp.join("")
    if (otpVal.length !== 4) {
      setSignupOtpError("Please enter the 4-digit OTP")
      return
    }
    setSignupOtpError("")
    setOtpVerifying(true)
    try {
      await verifyKitchenRegisterOtp(signupUserId, otpVal)
      setSignupOtpVisible(false)
      // Directly navigate to login after successful OTP verification
      router.replace("/(kitchen)/login")
    } catch (err) {
      setSignupOtpError(err.message || "Invalid or expired OTP")
    } finally {
      setOtpVerifying(false)
    }
  }

  const currentStepMeta = steps.find((s) => s.id === step)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      className="flex-1 bg-cream"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 280 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#064d29", "#0B6B3A", "#0a4025"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            paddingHorizontal: 24,
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(244,196,0,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={22} color="#F4C400" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF" }} className="font-poppins font-bold text-lg">
                Register Your Kitchen
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 2 }} className="font-nunito text-xs">
                {`Step ${step} of 5: ${currentStepMeta?.subtitle}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"))}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 6,
              marginTop: 14,
              backgroundColor: "rgba(255,255,255,0.14)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <ArrowLeft size={14} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF" }} className="font-nunito text-xs font-semibold">
              Back
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <View className="px-4 py-6 flex-1">
          {/* Step Indicator dots */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, marginBottom: 20 }}>
            {steps.map((s, i) => {
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDone ? "#0B6B3A" : isActive ? "#FFFFFF" : "#E5E5E5",
                      borderWidth: isActive ? 2 : 0,
                      borderColor: "#0B6B3A",
                    }}
                  >
                    {isDone ? (
                      <Check size={12} color="#FFFFFF" />
                    ) : isActive ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0B6B3A" }} />
                    ) : null}
                  </View>
                  {i < steps.length - 1 ? (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        marginHorizontal: 6,
                        backgroundColor: step > s.id ? "#0B6B3A" : "#E5E5E5",
                      }}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-light/35">
            {error ? (
              <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="font-nunito text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <View className="space-y-4">
                <Text className="font-poppins font-bold text-lg text-dark mb-1">
                  Tell us about your kitchen
                </Text>
                <Text className="font-nunito text-gray text-xs mb-4">
                  This is how customers will discover you
                </Text>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Kitchen Name *</Text>
                  <Input
                    value={form.name}
                    onChangeText={(val) => setForm({ ...form, name: val })}
                    placeholder="e.g. Amma's Rasoi"
                    icon={Store}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Owner Name *</Text>
                  <Input
                    value={form.ownerName}
                    onChangeText={(val) => setForm({ ...form, ownerName: val })}
                    placeholder="e.g. Priya Sharma"
                    icon={User}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Speciality *</Text>
                  <Input
                    value={form.speciality}
                    onChangeText={(val) => setForm({ ...form, speciality: val })}
                    placeholder="North Indian, Homemade Pickles, Tiffin..."
                    icon={UtensilsCrossed}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-2">Kitchen Type *</Text>
                  <View className="flex-row gap-2">
                    {[
                      { id: "veg", label: "Pure Veg" },
                      { id: "non_veg", label: "Non-Veg" },
                      { id: "both", label: "Veg & Non-Veg" },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setForm({ ...form, kitchenType: opt.id })}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: form.kitchenType === opt.id ? "#0B6B3A" : "#FFFFFF",
                          borderColor: form.kitchenType === opt.id ? "#0B6B3A" : "#E5E5E5",
                        }}
                      >
                        <Text
                          style={{ color: form.kitchenType === opt.id ? "#FFFFFF" : "#2E2E2E" }}
                          className="font-poppins font-bold text-xs"
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Signature Dish *</Text>
                  <Input
                    value={form.bestItem}
                    onChangeText={(val) => setForm({ ...form, bestItem: val })}
                    placeholder="e.g. Dal Makhani Thali"
                    icon={UtensilsCrossed}
                  />
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View className="space-y-4">
                <Text className="font-poppins font-bold text-lg text-dark mb-1">
                  Create your account
                </Text>
                <Text className="font-nunito text-gray text-xs mb-4">
                  Credentials to manage your kitchen business
                </Text>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Phone Number *</Text>
                  <Input
                    value={form.phone}
                    onChangeText={(val) => setForm({ ...form, phone: val.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    icon={Phone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Email Address *</Text>
                  <Input
                    value={form.email}
                    onChangeText={(val) => setForm({ ...form, email: val })}
                    placeholder="kitchen@example.com"
                    icon={Mail}
                    keyboardType="email-address"
                    autoComplete="off"
                    autoCorrect={false}
                    textContentType="none"
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Password *</Text>
                  <PasswordInput
                    value={form.password}
                    onChangeText={(val) => setForm({ ...form, password: val })}
                    placeholder="Minimum 6 characters"
                    icon={Lock}
                    autoComplete="off"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">FSSAI License *</Text>
                  <TouchableOpacity
                    onPress={pickDocument}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderStyle: "dashed",
                      borderColor: "#E5E5E5",
                      borderRadius: 16,
                      padding: 20,
                    }}
                  >
                    {fssaiLicenseFile ? (
                      <>
                        <FileText size={28} color="#0B6B3A" />
                        <Text className="font-nunito text-xs text-dark text-center font-semibold mt-2" numberOfLines={1}>
                          {fssaiLicenseFile.name}
                        </Text>
                        <Text className="font-nunito text-[10px] text-gray mt-1">Tap to change document</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color="#7A7A7A" />
                        <Text className="font-nunito text-xs text-gray text-center mt-2">
                          Upload FSSAI License (JPG, PNG, PDF)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {step === 3 ? (
              <View className="space-y-4">
                <Text className="font-poppins font-bold text-lg text-dark mb-1">
                  Location & kitchen details
                </Text>
                <Text className="font-nunito text-gray text-xs mb-4">
                  For delivery calculations and verification
                </Text>

                {/* Map Pin Button */}
                <TouchableOpacity
                  onPress={() => setIsMapModalVisible(true)}
                  className="flex-row items-center justify-center gap-2 bg-[#0B6B3A] py-2.5 px-4 rounded-xl mb-3"
                >
                  <MapPin size={14} color="#FFFFFF" />
                  <Text className="font-poppins font-bold text-xs text-white">
                    Pin / Pick Location on Map
                  </Text>
                </TouchableOpacity>

                <View>
                  <View className="flex-row justify-between items-center mb-1.5">
                    <Text className="font-poppins text-xs font-semibold text-dark">Full Address *</Text>
                    <TouchableOpacity
                      onPress={handleAutoDetectLocation}
                      disabled={detectingLocation}
                      className="flex-row items-center gap-1"
                    >
                      {detectingLocation ? (
                        <ActivityIndicator size="small" color="#0B6B3A" />
                      ) : (
                        <LocateFixed size={12} color="#0B6B3A" />
                      )}
                      <Text className="text-[11px] font-poppins font-bold text-primary">
                        {detectingLocation ? "Detecting..." : "Use current location"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Input
                    value={form.address}
                    onChangeText={(val) => setForm({ ...form, address: val })}
                    placeholder="House no., street, area, landmark"
                    icon={MapPin}
                  />
                </View>

                {/* Dropdowns */}
                <View className="flex-row gap-4 mb-2">
                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">State *</Text>
                    <TouchableOpacity
                      onPress={() => {
                        loadStates()
                        setStatePickerVisible(true)
                      }}
                      style={{
                        height: 48,
                        backgroundColor: "#FAF9F6",
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: "#E3DFD5",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: form.state ? "#1F1F1F" : "#A3A3A3", fontFamily: "Nunito" }}>
                        {form.state || "Select state"}
                      </Text>
                      <ChevronDown size={18} color="#7A7A7A" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">City *</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!form.state) {
                          Alert.alert("Notice", "Please select a state first")
                          return
                        }
                        setCityPickerVisible(true)
                      }}
                      style={{
                        height: 48,
                        backgroundColor: "#FAF9F6",
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: "#E3DFD5",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: form.city ? "#1F1F1F" : "#A3A3A3", fontFamily: "Nunito" }}>
                        {form.city || "Select city"}
                      </Text>
                      <ChevronDown size={18} color="#7A7A7A" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Pincode *</Text>
                  <Input
                    value={form.pincode}
                    onChangeText={(val) => setForm({ ...form, pincode: val.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="6 digits"
                    keyboardType="number-pad"
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Operating Hours *</Text>
                  <Input
                    value={form.openingTime}
                    onChangeText={(val) => setForm({ ...form, openingTime: val })}
                    placeholder="e.g. 8 AM - 9 PM"
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">About your kitchen *</Text>
                  <Input
                    value={form.description}
                    onChangeText={(val) => setForm({ ...form, description: val })}
                    placeholder="Tell customers about your kitchen, hygiene standards..."
                    multiline
                    numberOfLines={4}
                    inputClassName="h-24 pt-2 align-top"
                  />
                </View>

                {/* Detailed 9-Row Review Summary Box */}
                <View className="bg-cream rounded-xl p-4 border border-gray-light/50 mt-4">
                  <Text className="font-poppins text-[10px] font-bold text-gray uppercase mb-2">
                    Review summary
                  </Text>
                  <View className="space-y-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Kitchen Name</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.name || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Owner</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.ownerName || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Type</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">
                        {form.kitchenType === "veg" ? "Pure Veg" : form.kitchenType === "non_veg" ? "Non-Veg" : "Veg & Non-Veg"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Speciality</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.speciality || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Signature Dish</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.bestItem || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">FSSAI File</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {fssaiLicenseFile?.name || "—"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Phone</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.phone || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Email</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.email || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Location</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {form.address ? `${form.address}, ${form.city}, ${form.state} - ${form.pincode}` : "—"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Hours</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.openingTime || "—"}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {step === 4 ? (
              <View className="space-y-5">
                <Text className="font-poppins font-bold text-lg text-dark mb-1">
                  Partner Agreement & Onboarding
                </Text>
                <Text className="font-nunito text-gray text-xs mb-4">
                  Please review the agreement and training video to complete registration
                </Text>

                {agreementLoading ? (
                  <Text className="font-nunito text-sm text-gray text-center py-8">Loading onboarding assets...</Text>
                ) : agreement?.url ? (
                  <View className="space-y-4">
                    {/* Compliance Step 1: Read Agreement */}
                    <View className="border border-[#E5E5E5] bg-white rounded-xl p-4 space-y-3">
                      <Text className="font-poppins font-semibold text-xs text-dark">
                        1. Review Partner Agreement PDF
                      </Text>
                      <Text className="font-nunito text-[11px] text-gray leading-4">
                        Please view the terms of partnering with us. You must open the document to unlock the confirmation.
                      </Text>
                      <View className="flex-row flex-wrap items-center justify-between gap-2.5">
                        <TouchableOpacity
                          onPress={() => {
                            setPdfScrolledToBottom(false)
                            setPdfModalVisible(true)
                            setError("")
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: "#0B6B3A",
                          }}
                        >
                          <FileText size={14} color="#0B6B3A" />
                          <Text className="text-primary font-poppins font-bold text-xs">Open & Scroll Agreement PDF</Text>
                        </TouchableOpacity>

                        {agreementViewed ? (
                          <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <Text className="text-[10px] text-emerald-800 font-poppins font-bold">✓ Viewed</Text>
                          </View>
                        ) : (
                          <View className="bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                            <Text className="text-[10px] text-amber-800 font-poppins font-bold">Required (Scroll to end)</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Compliance Step 2: Training Video */}
                    {agreement.videoUrl ? (
                      <View className="border border-[#E5E5E5] bg-white rounded-xl p-4 space-y-3">
                        <Text className="font-poppins font-semibold text-xs text-dark">
                          2. Watch Mandatory Training Video
                        </Text>
                        <Text className="font-nunito text-[11px] text-gray leading-4">
                          Watch this quick video to learn about our hygiene standards and partner operations. Must watch till end.
                        </Text>
                        <View className="flex-row flex-wrap items-center justify-between gap-2.5">
                          <TouchableOpacity
                            onPress={() => {
                              setVideoModalVisible(true)
                              setError("")
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              borderColor: "#0B6B3A",
                            }}
                          >
                            <Video size={14} color="#0B6B3A" />
                            <Text className="text-primary font-poppins font-bold text-xs">Watch Training Video</Text>
                          </TouchableOpacity>

                          {videoWatched ? (
                            <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <Text className="text-[10px] text-emerald-800 font-poppins font-bold">✓ Watched</Text>
                            </View>
                          ) : (
                            <View className="bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                              <Text className="text-[10px] text-amber-800 font-poppins font-bold">Required (Watch till end)</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : null}

                    {/* Compliance Step 3: Acceptance Checkbox */}
                    {(() => {
                      const canAccept = agreementViewed && (!agreement.videoUrl || videoWatched)
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            if (!agreementViewed && agreement.videoUrl && !videoWatched) {
                              setError("Please open the Partner Agreement PDF and watch the Training Video first.")
                              Alert.alert(
                                "Action Required",
                                "Please open and read the Partner Agreement PDF and watch the Training Video before accepting."
                              )
                              return
                            }
                            if (!agreementViewed) {
                              setError("Please open and read the Partner Agreement PDF first.")
                              Alert.alert(
                                "Action Required",
                                "Please open and read the Partner Agreement PDF before accepting."
                              )
                              return
                            }
                            if (agreement.videoUrl && !videoWatched) {
                              setError("Please watch the mandatory training video first.")
                              Alert.alert(
                                "Action Required",
                                "Please watch the mandatory training video before accepting."
                              )
                              return
                            }
                            setAgreementAccepted((v) => !v)
                            setError("")
                          }}
                          activeOpacity={canAccept ? 0.7 : 0.85}
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            gap: 12,
                            backgroundColor: agreementAccepted ? "#F0FDF4" : canAccept ? "#FAF9F6" : "#F8F8F5",
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1.5,
                            borderColor: agreementAccepted ? "#0B6B3A" : canAccept ? "#0B6B3A" : "#E3DFD5",
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              borderWidth: 1.5,
                              borderColor: canAccept ? "#0B6B3A" : "#A3A3A3",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: agreementAccepted ? "#0B6B3A" : canAccept ? "#FFFFFF" : "#E5E5E5",
                              marginTop: 2,
                            }}
                          >
                            {agreementAccepted ? <Check size={14} color="#FFFFFF" strokeWidth={2.5} /> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text className="font-nunito text-xs text-dark leading-4 font-medium">
                              I confirm that I have reviewed the Partner Agreement and watched the onboarding guidelines, and agree to the terms.
                            </Text>
                            {!canAccept ? (
                              <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Nunito", marginTop: 4, fontWeight: "600" }}>
                                🔒 Open PDF and watch video above to unlock this confirmation.
                              </Text>
                            ) : (
                              <Text style={{ color: "#0B6B3A", fontSize: 11, fontFamily: "Nunito", marginTop: 4, fontWeight: "600" }}>
                                ✓ Requirements completed. Tap to confirm and continue.
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      )
                    })()}
                  </View>
                ) : (
                  <Text className="font-nunito text-sm text-gray text-center py-8">
                    Partner onboarding assets are not configured. Please contact support.
                  </Text>
                )}
              </View>
            ) : null}

            {step === 5 ? (
              <View className="space-y-5">
                <Text className="font-poppins font-bold text-lg text-dark mb-1">
                  KYC Verification
                </Text>
                <Text className="font-nunito text-gray text-xs mb-4">
                  Please upload your government issued Aadhaar & PAN details to verify your identity
                </Text>

                <View>
                  <Text className="font-poppins font-medium text-xs text-dark-light mb-2">Aadhaar Card Number</Text>
                  <Input
                    value={form.aadhaarNumber}
                    onChangeText={(val) => setForm({ ...form, aadhaarNumber: val })}
                    placeholder="12-digit Aadhaar number"
                    keyboardType="numeric"
                    maxLength={12}
                  />
                </View>

                <View className="space-y-2">
                  <Text className="font-poppins font-medium text-xs text-dark-light block mb-2">Aadhaar Card File (Front Side)</Text>
                  <TouchableOpacity
                    onPress={pickAadhaarDocument}
                    style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#D1D5DB",
                      borderStyle: "dashed",
                      borderRadius: 12,
                      padding: 24,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {aadhaarCardFile ? (
                      <>
                        <FileText size={28} color="#0B6B3A" />
                        <Text className="font-nunito text-sm text-dark mt-2 text-center break-all">{aadhaarCardFile.name}</Text>
                        <Text className="font-nunito text-xs text-gray mt-1">Tap to change file</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color="#7A7A7A" />
                        <Text className="font-nunito text-sm text-gray mt-2 text-center">Upload Aadhaar Front (PDF or Image)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View className="space-y-2">
                  <Text className="font-poppins font-medium text-xs text-dark-light block mb-2">Aadhaar Card File (Back Side)</Text>
                  <TouchableOpacity
                    onPress={pickPanDocument} // Wait, let's make sure it calls pickAadhaarBackDocument? Oh wait! We used pickPanDocument for back side? No, let's make a new helper or reuse pickPanDocument but for Back side? Let's check: we had pickPanDocument, pickAadhaarDocument, and pickDocument. Oh, we need to create pickAadhaarBackDocument! Wait, let's check what we did inside step 2. We can just define pickAadhaarBackDocument! Let's write the code for pickAadhaarBackDocument below.
                    // Wait, let's make sure we define pickAadhaarBackDocument first! Let's check what we have for picking documents.
                    // Yes, we will define pickAadhaarBackDocument in the file. Let's look at chunk 3 where we added pickAadhaarDocument. We can define pickAadhaarBackDocument there. Let's verify that.
                    onPress={pickAadhaarBackDocument}
                    style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#D1D5DB",
                      borderStyle: "dashed",
                      borderRadius: 12,
                      padding: 24,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {aadhaarCardBackFile ? (
                      <>
                        <FileText size={28} color="#0B6B3A" />
                        <Text className="font-nunito text-sm text-dark mt-2 text-center break-all">{aadhaarCardBackFile.name}</Text>
                        <Text className="font-nunito text-xs text-gray mt-1">Tap to change file</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color="#7A7A7A" />
                        <Text className="font-nunito text-sm text-gray mt-2 text-center">Upload Aadhaar Back (PDF or Image)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="font-poppins font-medium text-xs text-dark-light mb-2">PAN Card Number</Text>
                  <Input
                    value={form.panNumber}
                    onChangeText={(val) => setForm({ ...form, panNumber: val.toUpperCase() })}
                    placeholder="10-character alphanumeric PAN"
                    maxLength={10}
                    autoCapitalize="characters"
                  />
                </View>

                <View className="space-y-2">
                  <Text className="font-poppins font-medium text-xs text-dark-light block mb-2">PAN Card File</Text>
                  <TouchableOpacity
                    onPress={pickPanDocument}
                    style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#D1D5DB",
                      borderStyle: "dashed",
                      borderRadius: 12,
                      padding: 24,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {panCardFile ? (
                      <>
                        <FileText size={28} color="#0B6B3A" />
                        <Text className="font-nunito text-sm text-dark mt-2 text-center break-all">{panCardFile.name}</Text>
                        <Text className="font-nunito text-xs text-gray mt-1">Tap to change file</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color="#7A7A7A" />
                        <Text className="font-nunito text-sm text-gray mt-2 text-center">Upload PAN Card (PDF or Image)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View className="bg-white rounded-xl p-4 border border-[#e8e8e8] space-y-2">
                  <Text className="font-poppins font-semibold text-xs text-[#999] uppercase tracking-wide">Review KYC</Text>
                  <View className="space-y-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Aadhaar No.</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.aadhaarNumber || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Aadhaar Front</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {aadhaarCardFile?.name || "—"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">Aadhaar Back</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {aadhaarCardBackFile?.name || "—"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">PAN No.</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold">{form.panNumber || "—"}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray font-nunito">PAN File</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {panCardFile?.name || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Navigation buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              {step > 1 ? (
                <TouchableOpacity
                  onPress={prevStep}
                  style={{
                    flex: 1,
                    height: 50,
                    borderWidth: 1.5,
                    borderColor: "#0B6B3A",
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    paddingHorizontal: 12,
                  }}
                >
                  <ArrowLeft size={16} color="#0B6B3A" />
                  <Text numberOfLines={1} style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 14, fontFamily: "Poppins" }}>
                    Back
                  </Text>
                </TouchableOpacity>
              ) : null}

              {step < 5 ? (
                <TouchableOpacity
                  onPress={nextStep}
                  style={{
                    flex: 1,
                    height: 50,
                    backgroundColor: "#0B6B3A",
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text numberOfLines={1} style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 14, fontFamily: "Poppins" }}>
                    Continue
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 1,
                    height: 50,
                    backgroundColor: "#0B6B3A",
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    paddingHorizontal: 12,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text numberOfLines={1} style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                        Submit for Approval
                      </Text>
                      <ArrowRight size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="font-nunito text-sm text-gray">Already registered? </Text>
            <TouchableOpacity onPress={() => router.push("/(kitchen)/login")}>
              <Text className="text-primary font-bold text-sm">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* State Picker Modal */}
      <Modal visible={statePickerVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingVertical: 24, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select State</Text>
              <TouchableOpacity onPress={() => setStatePickerVisible(false)}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
            {statesLoading ? (
              <ActivityIndicator size="large" color="#0B6B3A" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView>
                {statesList.map((st) => (
                  <TouchableOpacity
                    key={st.iso2}
                    onPress={() => handleSelectState(st.name, st.iso2)}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F3" }}
                  >
                    <Text style={{ fontSize: 15, color: "#1F1F1F", fontFamily: "Nunito" }}>{st.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={cityPickerVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingVertical: 24, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Select City</Text>
              <TouchableOpacity onPress={() => setCityPickerVisible(false)}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>
            {citiesLoading ? (
              <ActivityIndicator size="large" color="#0B6B3A" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView>
                {citiesList.map((ct) => (
                  <TouchableOpacity
                    key={ct.id || ct.name}
                    onPress={() => {
                      setForm((f) => ({ ...f, city: ct.name }))
                      setCityPickerVisible(false)
                    }}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F3" }}
                  >
                    <Text style={{ fontSize: 15, color: "#1F1F1F", fontFamily: "Nunito" }}>{ct.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Signup OTP Verification Modal */}
      <Modal visible={signupOtpVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, width: "100%", maxWidth: 340, padding: 24, alignItems: "center", elevation: 5 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <CheckCircle size={24} color="#0B6B3A" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins", marginBottom: 6 }}>Verify Registration</Text>
            <Text style={{ fontSize: 12, color: "#7A7A7A", fontFamily: "Nunito", textAlign: "center", marginBottom: 20, lineHeight: 18 }}>
              Enter the 4-digit code sent to your contact info to submit your application.
            </Text>

            {signupDemoOtp ? (
              <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "#FCD2D1", backgroundColor: "#FDEDEC", paddingHorizontal: 16, paddingVertical: 10, width: "100%" }}>
                <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#C0392B", textAlign: "center" }}>
                  Demo OTP: <Text style={{ fontFamily: "Poppins", fontWeight: "bold", letterSpacing: 2 }}>{signupDemoOtp}</Text>
                </Text>
              </View>
            ) : null}

            {signupOtpError ? (
              <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "#FCD2D1", backgroundColor: "#FDEDEC", paddingHorizontal: 16, paddingVertical: 10, width: "100%" }}>
                <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#C0392B", textAlign: "center" }}>{signupOtpError}</Text>
              </View>
            ) : null}

            {/* OTP Inputs */}
            <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", paddingVertical: 12 }}>
              {signupOtp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={signupOtpRefs[i]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => {
                    if (!/^\d?$/.test(val)) return
                    const next = [...signupOtp]
                    next[i] = val
                    setSignupOtp(next)
                    if (val && i < 3) {
                      signupOtpRefs[i + 1].current?.focus()
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !signupOtp[i] && i > 0) {
                      signupOtpRefs[i - 1].current?.focus()
                    }
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "#FAF9F6",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: digit ? "#0B6B3A" : "#E3DFD5",
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1F1F1F",
                    fontFamily: "Poppins",
                  }}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerifySignupOtp}
              disabled={otpVerifying}
              style={{
                width: "100%",
                backgroundColor: "#0B6B3A",
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 20,
                opacity: otpVerifying ? 0.6 : 1,
              }}
            >
              {otpVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins", fontSize: 14 }}>
                  Verify & Register
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSignupOtpVisible(false)}
              style={{ marginTop: 14 }}
            >
              <Text style={{ color: "#7A7A7A", fontFamily: "Nunito", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PDF Viewer Modal */}
      <Modal visible={pdfModalVisible} animationType="slide" transparent={false} onRequestClose={() => setPdfModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "#0B6B3A", paddingTop: insets.top }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#0B6B3A" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <FileText size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>
                  Partner Agreement PDF
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
                  Version {agreement?.version || 1} · Official Terms
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {agreement?.url ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(agreement.url)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  accessibilityLabel="Open in Browser"
                >
                  <ExternalLink size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => setPdfModalVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* PDF Body Container */}
          <View style={{ flex: 1, width: "100%", backgroundColor: "#FFFFFF" }}>
            {Platform.OS === "web" ? (
              <iframe
                src={agreement?.url ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(agreement.url)}` : ""}
                style={{ width: "100%", height: "100%", border: "none", display: "block", backgroundColor: "#FFFFFF" }}
                title="Partner Agreement PDF"
                onLoad={() => setPdfScrolledToBottom(true)}
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <FileText size={42} color="#0B6B3A" />
                </View>
                <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: "#1F1F1F", textAlign: "center" }}>
                  Partner Agreement
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#7A7A7A", textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: 300 }}>
                  Version {agreement?.version || 1} · Official Terms &amp; Conditions. Please review the official partnership document.
                </Text>

                {agreement?.url ? (
                  <TouchableOpacity
                    onPress={() => {
                      Linking.openURL(agreement.url)
                      setPdfScrolledToBottom(true)
                    }}
                    style={{
                      marginTop: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "#EAF7EE",
                      borderWidth: 1.5,
                      borderColor: "#0B6B3A",
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 14
                    }}
                  >
                    <ExternalLink size={18} color="#0B6B3A" />
                    <Text style={{ fontFamily: "Poppins-Bold", fontSize: 14, color: "#0B6B3A" }}>
                      Open Full Document
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#E5E5E5", backgroundColor: "#FFFFFF" }}>
            <TouchableOpacity
              onPress={() => {
                setAgreementViewed(true)
                if (!agreement?.videoUrl || videoWatched) {
                  setAgreementAccepted(true)
                }
                setPdfModalVisible(false)
                setError("")
              }}
              style={{
                backgroundColor: "#0B6B3A",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                shadowColor: "#0B6B3A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 3
              }}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 14 }}>
                Confirm &amp; Mark as Reviewed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Training Video Modal */}
      <Modal visible={videoModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#111111" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: "#FFFFFF" }}>Mandatory Training Video</Text>
              <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#AAAAAA" }}>Must watch until video finishes</Text>
            </View>
            <TouchableOpacity onPress={() => setVideoModalVisible(false)} style={{ padding: 8 }}>
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Video Player */}
          <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#000000" }}>
            {agreement?.videoUrl ? (
              <TrainingVideoPlayer
                videoUrl={agreement.videoUrl}
                onEnded={() => {
                  setVideoWatched(true)
                  if (agreementViewed) {
                    setAgreementAccepted(true)
                  }
                  setVideoModalVisible(false)
                  setError("")
                }}
              />
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center", padding: 20 }}>
                <ActivityIndicator size="large" color="#0B6B3A" />
                <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#AAAAAA", marginTop: 12 }}>
                  Loading Training Video...
                </Text>
              </View>
            )}
          </View>

          {/* Footer note & Mark Watched action */}
          <View style={{ padding: 14, backgroundColor: "#111111", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#FFD54F", flex: 1 }}>
              Watch video to complete onboarding.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setVideoWatched(true)
                if (agreementViewed) {
                  setAgreementAccepted(true)
                }
                setVideoModalVisible(false)
                setError("")
              }}
              style={{
                backgroundColor: "#0B6B3A",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6
              }}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 12 }}>Mark as Watched</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Map Modal */}
      <LocationMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={form.address}
        initialCity={form.city}
        initialState={form.state}
      />
    </KeyboardAvoidingView>
  )
}