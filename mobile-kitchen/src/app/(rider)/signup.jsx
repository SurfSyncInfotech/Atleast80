import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from "react-native"
import { useRouter } from "expo-router"
import { Linking } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  Truck,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  Upload,
  FileText,
  Check,
  CheckCircle,
  Shield,
  HelpCircle,
  FileDigit
} from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as DocumentPicker from "expo-document-picker"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"
import { checkPhoneAvailability } from "../../lib/api"

const steps = [
  { id: 1, title: "Personal Details", subtitle: "Enter Profile Information", icon: User },
  { id: 2, title: "Vehicle Type", subtitle: "Select Delivery Vehicle Type", icon: Truck },
  { id: 3, title: "KYC Details", subtitle: "Upload Verification Documents", icon: Shield },
  { id: 4, title: "Agreement", subtitle: "Rider Partnership Terms", icon: CheckCircle },
]

export default function RiderSignupPage() {
  const router = useRouter()
  const { registerRider, verifyRiderRegisterOtp } = useAuth()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    vehicleType: "bicycle", // 'bicycle', 'motorcycle', 'scooter'
    vehicleNumber: "",
    drivingLicenseNumber: "",
    aadhaarNumber: "",
    panNumber: "",
  })

  // File states
  const [aadhaarCardFile, setAadhaarCardFile] = useState(null)
  const [aadhaarCardBackFile, setAadhaarCardBackFile] = useState(null)
  const [panCardFile, setPanCardFile] = useState(null)
  const [drivingLicenseFile, setDrivingLicenseFile] = useState(null)

  // Onboarding Terms
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Rider Agreement
  const [agreement, setAgreement] = useState(null)
  const [agreementLoading, setAgreementLoading] = useState(false)
  const [agreementRead, setAgreementRead] = useState(false)

  // Fetch rider agreement when step 4 is reached
  useEffect(() => {
    if (step === 4 && !agreement) {
      setAgreementLoading(true)
      fetch(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/rider/rider-agreement`)
        .then((r) => r.json())
        .then((data) => setAgreement(data))
        .catch(() => {})
        .finally(() => setAgreementLoading(false))
    }
  }, [step])

  // OTP Modal
  const [signupOtpVisible, setSignupOtpVisible] = useState(false)
  const [signupUserId, setSignupUserId] = useState(null)
  const [signupOtp, setSignupOtp] = useState(["", "", "", ""])
  const [signupDemoOtp, setSignupDemoOtp] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)
  const signupOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const pickDocument = async (field) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]
        if (field === "aadhaarFront") setAadhaarCardFile(file)
        if (field === "aadhaarBack") setAadhaarCardBackFile(file)
        if (field === "pan") setPanCardFile(file)
        if (field === "dl") setDrivingLicenseFile(file)
        setError("")
      }
    } catch (err) {
      console.log("Error picking document", err)
    }
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.password.trim()) {
        setError("Name and password are required")
        return false
      }
      if (!form.phone.trim() && !form.email.trim()) {
        setError("Phone or email is required")
        return false
      }
      if (form.phone.trim() && form.phone.trim().length !== 10) {
        setError("Phone number must be 10 digits")
        return false
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters")
        return false
      }
    }
    if (step === 2) {
      if (form.vehicleType !== "bicycle") {
        if (!form.vehicleNumber.trim() || !form.drivingLicenseNumber.trim()) {
          setError("Vehicle number and driving license number are required for motorized vehicles")
          return false
        }
      }
    }
    if (step === 3) {
      if (!form.aadhaarNumber.trim() || !form.panNumber.trim()) {
        setError("Aadhaar and PAN numbers are required")
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
      if (!aadhaarCardFile || !aadhaarCardBackFile || !panCardFile) {
        setError("Aadhaar Front, Aadhaar Back, and PAN Card document files are required")
        return false
      }
      if (form.vehicleType !== "bicycle" && !drivingLicenseFile) {
        setError("Driving License card document file is required for motorized vehicles")
        return false
      }
    }
    if (step === 4) {
      if (!agreementRead) {
        setError("Please read the Rider Agreement before accepting")
        return false
      }
      if (!termsAccepted) {
        setError("Please accept the terms of partnership to continue")
        return false
      }
    }
    setError("")
    return true
  }

  const nextStep = async () => {
    if (!validateStep()) return
    if (step === 1) {
      setLoading(true)
      try {
        await checkPhoneAvailability(form.phone, form.email)
      } catch (err) {
        setError(err.message || "Mobile number or email already registered")
        setLoading(false)
        return
      }
      setLoading(false)
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    if (step < 4) {
      await nextStep()
      return
    }

    if (!validateStep()) return

    setError("")
    setLoading(true)
    try {
      const data = await registerRider(form, aadhaarCardFile, aadhaarCardBackFile, panCardFile, drivingLicenseFile)
      if (data?.requiresOtp) {
        setSignupUserId(data.userId)
        if (data.demoOtp) setSignupDemoOtp(data.demoOtp)
        setSignupOtp(["", "", "", ""])
        setSignupOtpVisible(true)
      } else {
        Alert.alert("Success", "Registration submitted successfully. Please log in.")
        router.replace("/(rider)/login")
      }
    } catch (err) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const otpValue = signupOtp.join("")
    if (otpValue.length !== 4) {
      setError("Please enter the 4-digit OTP")
      return
    }
    setOtpVerifying(true)
    try {
      await verifyRiderRegisterOtp(signupUserId, otpValue)
      setSignupOtpVisible(false)
      // Navigate directly to login after successful OTP verification
      router.replace("/(rider)/login")
    } catch (err) {
      setError(err.message || "Invalid OTP")
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...signupOtp]
    next[index] = value
    setSignupOtp(next)

    if (value && index < 3) {
      signupOtpRefs[index + 1].current.focus()
    }
  }

  const handleOtpKeyPress = (index, key) => {
    if (key === "Backspace" && !signupOtp[index] && index > 0) {
      signupOtpRefs[index - 1].current.focus()
    }
  }

  const currentStepMeta = steps.find((s) => s.id === step)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      className="flex-1 bg-cream"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
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
              <Truck size={22} color="#F4C400" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF" }} className="font-poppins font-bold text-lg">
                Rider Registration
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 2 }} className="font-nunito text-xs">
                {`Step ${step} of 4: ${currentStepMeta?.subtitle}`}
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
          {/* Step Indicator dots (Mockup aligned to standard theme stepper) */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, marginBottom: 20, width: "100%" }}>
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
                    ) : (
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: isActive ? "#0B6B3A" : "#7A7A7A" }}>
                        {s.id}
                      </Text>
                    )}
                  </View>
                  {i < steps.length - 1 && (
                    <View style={{ flex: 1, height: 2, backgroundColor: isDone ? "#0B6B3A" : "#E5E5E5", marginHorizontal: 8 }} />
                  )}
                </View>
              )
            })}
          </View>

          {/* Form Card Overlay */}
          <View className="bg-white rounded-3xl p-6 shadow-md flex-1">
            {step === 1 ? (
              <View className="gap-4">
                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Full Name *</Text>
                  <Input
                    placeholder="Full Name"
                    value={form.name}
                    onChangeText={(val) => setForm({ ...form, name: val })}
                    icon={User}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Phone Number *</Text>
                  <Input
                    placeholder="Mobile Number (10 digits)"
                    value={form.phone}
                    onChangeText={(val) => setForm({ ...form, phone: val })}
                    keyboardType="numeric"
                    maxLength={10}
                    icon={Phone}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Email Address *</Text>
                  <Input
                    placeholder="Email Address"
                    value={form.email}
                    onChangeText={(val) => setForm({ ...form, email: val })}
                    autoCapitalize="none"
                    icon={Mail}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Create Password *</Text>
                  <PasswordInput
                    placeholder="Create Password"
                    value={form.password}
                    onChangeText={(val) => setForm({ ...form, password: val })}
                    icon={Lock}
                  />
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View className="gap-5">
                <Text className="font-poppins font-bold text-dark text-base">Select Vehicle Type</Text>
                
                <View className="flex-row gap-2">
                  {["bicycle", "motorcycle", "scooter"].map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setForm({ ...form, vehicleType: v })}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: form.vehicleType === v ? "#0B6B3A" : "#FFFFFF",
                        borderColor: form.vehicleType === v ? "#0B6B3A" : "#E5E5E5",
                      }}
                    >
                      <Text
                        style={{ color: form.vehicleType === v ? "#FFFFFF" : "#2E2E2E" }}
                        className="font-poppins font-bold text-xs text-capitalize"
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {form.vehicleType !== "bicycle" && (
                  <View className="gap-4 mt-2">
                    <View>
                      <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Vehicle Number *</Text>
                      <Input
                        placeholder="e.g. UP32 AB 1234"
                        value={form.vehicleNumber}
                        onChangeText={(val) => setForm({ ...form, vehicleNumber: val })}
                        autoCapitalize="characters"
                        icon={Truck}
                      />
                    </View>

                    <View>
                      <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Driving License Number *</Text>
                      <Input
                        placeholder="Enter DL number"
                        value={form.drivingLicenseNumber}
                        onChangeText={(val) => setForm({ ...form, drivingLicenseNumber: val })}
                        autoCapitalize="characters"
                        icon={FileDigit}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {step === 3 ? (
              <View className="gap-5">
                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Aadhaar Card Number *</Text>
                  <Input
                    placeholder="12-digit Aadhaar number"
                    value={form.aadhaarNumber}
                    onChangeText={(val) => setForm({ ...form, aadhaarNumber: val })}
                    keyboardType="numeric"
                    maxLength={12}
                    icon={FileDigit}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Aadhaar Front Side *</Text>
                  <TouchableOpacity
                    onPress={() => pickDocument("aadhaarFront")}
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#E3DFD5",
                      borderStyle: "dashed",
                      borderRadius: 16,
                      padding: 16,
                      backgroundColor: "#FAF9F6",
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Upload size={16} color="#0B6B3A" />
                    <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#4A4A4A" }}>
                      {aadhaarCardFile ? aadhaarCardFile.name : "Upload Aadhaar Front"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Aadhaar Back Side *</Text>
                  <TouchableOpacity
                    onPress={() => pickDocument("aadhaarBack")}
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#E3DFD5",
                      borderStyle: "dashed",
                      borderRadius: 16,
                      padding: 16,
                      backgroundColor: "#FAF9F6",
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Upload size={16} color="#0B6B3A" />
                    <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#4A4A4A" }}>
                      {aadhaarCardBackFile ? aadhaarCardBackFile.name : "Upload Aadhaar Back"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">PAN Card Number *</Text>
                  <Input
                    placeholder="10-character alphanumeric PAN"
                    value={form.panNumber}
                    onChangeText={(val) => setForm({ ...form, panNumber: val.toUpperCase() })}
                    maxLength={10}
                    autoCapitalize="characters"
                    icon={FileDigit}
                  />
                </View>

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">PAN Card Document *</Text>
                  <TouchableOpacity
                    onPress={() => pickDocument("pan")}
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#E3DFD5",
                      borderStyle: "dashed",
                      borderRadius: 16,
                      padding: 16,
                      backgroundColor: "#FAF9F6",
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Upload size={16} color="#0B6B3A" />
                    <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#4A4A4A" }}>
                      {panCardFile ? panCardFile.name : "Upload PAN Card"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {form.vehicleType !== "bicycle" && (
                  <View>
                    <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Driving License Card *</Text>
                    <TouchableOpacity
                      onPress={() => pickDocument("dl")}
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#E3DFD5",
                        borderStyle: "dashed",
                        borderRadius: 16,
                        padding: 16,
                        backgroundColor: "#FAF9F6",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <Upload size={16} color="#0B6B3A" />
                      <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#4A4A4A" }}>
                        {drivingLicenseFile ? drivingLicenseFile.name : "Upload DL Document"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}

            {step === 4 ? (
              <View className="gap-4">
                <Text className="font-poppins font-bold text-dark text-base">Rider Partnership Agreement</Text>
                <Text className="font-nunito text-xs text-gray leading-5">
                  Please read the complete Rider Agreement below. You must open and read the agreement before you can accept the terms.
                </Text>

                {agreementLoading ? (
                  <View style={{ alignItems: "center", padding: 20 }}>
                    <ActivityIndicator size="small" color="#0B6B3A" />
                    <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#7A7A7A", marginTop: 8 }}>Loading agreement...</Text>
                  </View>
                ) : agreement?.url ? (
                  <TouchableOpacity
                    onPress={() => {
                      Linking.openURL(agreement.url)
                      setAgreementRead(true)
                    }}
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      backgroundColor: agreementRead ? "#F0FBF4" : "#FFF8E7",
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: agreementRead ? "#0B6B3A" : "#F4C400",
                      alignItems: "center",
                    }}
                  >
                    <FileText size={20} color={agreementRead ? "#0B6B3A" : "#B8900A"} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Poppins", fontWeight: "600", fontSize: 13, color: agreementRead ? "#0B6B3A" : "#B8900A" }}>
                        {agreementRead ? "Agreement Read ✓" : "Read Rider Agreement (Required)"}
                      </Text>
                      <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#7A7A7A", marginTop: 2 }}>
                        Version {agreement.version} · Tap to open PDF
                      </Text>
                    </View>
                    {!agreementRead && <ArrowRight size={16} color="#B8900A" />}
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#FECACA" }}>
                    <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#DC2626", textAlign: "center" }}>
                      No Rider Agreement has been uploaded by admin yet. Please check back later.
                    </Text>
                  </View>
                )}

                {agreementRead && (
                  <TouchableOpacity
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      backgroundColor: "#FAF9F6",
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: termsAccepted ? "#0B6B3A" : "#E5E5E5",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: "#0B6B3A",
                        backgroundColor: termsAccepted ? "#0B6B3A" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {termsAccepted && <Check size={14} color="#FFFFFF" />}
                    </View>
                    <Text className="flex-1 font-nunito text-xs text-dark leading-5">
                      I have read and agree to the Rider Agreement, terms and conditions, code of conduct, and consent to identity verification checks.
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {error ? <Text className="font-nunito text-xs text-red-600 font-semibold mt-4">{error}</Text> : null}

            {/* Navigation buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
              {step > 1 && (
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
                  <Text numberOfLines={1} style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 14, fontFamily: "Poppins" }}>Back</Text>
                </TouchableOpacity>
              )}

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
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text numberOfLines={1} style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: "Poppins" }}>
                      {step === 4 ? "Submit for Approval" : "Continue"}
                    </Text>
                    {step < 4 && <ArrowRight size={16} color="#FFFFFF" />}
                  </>
                )}
              </TouchableOpacity>
            </View>

            {step === 1 && (
              <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-gray-100">
                <Text className="font-nunito text-sm text-gray">{"Already have an account? "}</Text>
                <TouchableOpacity onPress={() => router.push("/(rider)/login")}>
                  <Text className="text-primary font-bold text-sm">Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal visible={signupOtpVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F1F1F", fontFamily: "Poppins" }}>Verify Phone / Email</Text>
            <Text style={{ fontSize: 13, color: "#7A7A7A", fontFamily: "Nunito" }}>
              Please enter the 4-digit verification code sent to your contact details.
            </Text>

            {signupDemoOtp ? (
              <View style={{ backgroundColor: "#F9FBF9", borderStyle: "solid", borderWidth: 1, borderColor: "#D1EAD1", borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 12, color: "#2E7D32", fontFamily: "Poppins", fontWeight: "bold", textAlign: "center" }}>
                  Demo OTP (Auto-fill Hint): {signupDemoOtp}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", marginVertical: 12 }}>
              {signupOtp.map((val, idx) => (
                <TextInput
                  key={idx}
                  ref={signupOtpRefs[idx]}
                  value={val}
                  onChangeText={(text) => handleOtpChange(idx, text)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(idx, nativeEvent.key)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: val ? "#0B6B3A" : "#E8E8E8",
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#1F1F1F",
                    backgroundColor: "#F8F8F5",
                  }}
                />
              ))}
            </View>

            {error ? <Text style={{ fontSize: 12, color: "#EF4444", textAlign: "center", fontFamily: "Nunito" }}>{error}</Text> : null}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setSignupOtpVisible(false)}
                style={{ flex: 1, paddingVertical: 14, borderWidth: 2, borderColor: "#7A7A7A", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ color: "#7A7A7A", fontWeight: "bold", fontFamily: "Poppins" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={otpVerifying}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: "#0B6B3A", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontFamily: "Poppins" }}>
                  {otpVerifying ? "Verifying..." : "Verify & Register"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}
