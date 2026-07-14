import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ChefHat, ArrowRight, ArrowLeft, Store, User, Mail, Phone, Lock, MapPin, ShieldCheck, Check, Upload, FileText, UtensilsCrossed } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as DocumentPicker from "expo-document-picker"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"
import { cn } from "../../lib/utils"

const steps = [
  { id: 1, title: "Kitchen Info", subtitle: "Tell Us About Your Kitchen", icon: Store },
  { id: 2, title: "Account", subtitle: "Create Your Account", icon: User },
  { id: 3, title: "Location", subtitle: "Location & Kitchen Details", icon: MapPin },
]

export default function KitchenSignupPage() {
  const router = useRouter()
  const { registerKitchen } = useAuth()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
  })
  const [fssaiLicenseFile, setFssaiLicenseFile] = useState(null)

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

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.ownerName.trim() || !form.speciality.trim() || !form.bestItem.trim()) {
        setError("Kitchen name, owner name, speciality, and signature dish are required")
        return false
      }
    }
    if (step === 2) {
      if (!form.email.trim() || !form.phone.trim() || !form.password || !fssaiLicenseFile) {
        setError("Email, phone, password, and FSSAI license upload are required")
        return false
      }
      if (form.phone.length !== 10) {
        setError("Phone number must be 10 digits")
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
    setError("")
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 3))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    if (step < 3) {
      nextStep()
      return
    }

    if (!validateStep()) return

    setError("")
    setLoading(true)
    try {
      await registerKitchen(form, fssaiLicenseFile)
      router.replace({
        pathname: "/(kitchen)/dashboard",
        params: { newSignup: "true" },
      })
    } catch (err) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const currentStepMeta = steps.find((s) => s.id === step)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cream"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
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
              <Text
                style={{ color: "#FFFFFF" }}
                className="font-poppins font-bold text-lg"
              >
                Register Your Kitchen
              </Text>
              <Text
                style={{ color: "rgba(255,255,255,0.75)", marginTop: 2 }}
                className="font-nunito text-xs"
              >
                {`Step ${step} of 3: ${currentStepMeta?.subtitle}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
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
          {/* Step Indicator (dots) */}
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

          {/* Form Content card */}
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
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Email *</Text>
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

                <View>
                  <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">Full Address *</Text>
                  <Input
                    value={form.address}
                    onChangeText={(val) => setForm({ ...form, address: val })}
                    placeholder="House no., street, area, landmark"
                    icon={MapPin}
                  />
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">City *</Text>
                    <Input value={form.city} onChangeText={(val) => setForm({ ...form, city: val })} placeholder="City" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-semibold text-dark mb-1.5">State *</Text>
                    <Input value={form.state} onChangeText={(val) => setForm({ ...form, state: val })} placeholder="State" />
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

                {/* Summary Box */}
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
                      <Text className="text-xs text-gray font-nunito">FSSAI File</Text>
                      <Text className="text-xs text-dark font-poppins font-semibold truncate flex-1 text-right ml-4">
                        {fssaiLicenseFile?.name || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Navigation buttons */}
            <View className="flex-row gap-3 mt-6">
              {step > 1 ? (
                <TouchableOpacity
                  onPress={prevStep}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderWidth: 2,
                    borderColor: "#0B6B3A",
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <ArrowLeft size={16} color="#0B6B3A" />
                  <Text className="text-primary font-poppins font-bold text-sm">Back</Text>
                </TouchableOpacity>
              ) : null}

              {step < 3 ? (
                <TouchableOpacity
                  onPress={nextStep}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    backgroundColor: "#0B6B3A",
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <Text className="text-white font-poppins font-bold text-sm">Continue</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <Button
                  onPress={handleSubmit}
                  size="lg"
                  className="flex-1 h-12 rounded-full"
                  loading={loading}
                >
                  <Text className="text-white text-base font-bold">Register</Text>
                </Button>
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
    </KeyboardAvoidingView>
  )
}