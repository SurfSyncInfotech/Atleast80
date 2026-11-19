import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Truck, ArrowLeft, User, Lock, ArrowRight } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import FieldError from "../../components/ui/FieldError"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { getLoginFieldErrors, getOtpFieldError, hasFieldErrors } from "../../lib/validation"

export default function RiderLoginPage() {
  const router = useRouter()
  const { loginRider, verifyRiderLoginOtp, user } = useAuth()
  const toast = useToast()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [otpError, setOtpError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    )
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    )
    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  const [step, setStep] = useState("credentials")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [hint, setHint] = useState("")
  const [channel, setChannel] = useState("phone")
  const [demoOtp, setDemoOtp] = useState("")

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    if (user?.role === "rider") {
      router.replace("/(rider)/dashboard")
    }
  }, [user, router])

  const insets = useSafeAreaInsets()

  if (user?.role === "rider") return null

  const updateIdentifier = (val) => {
    setIdentifier(val)
    setFieldErrors((prev) => {
      if (!prev.identifier) return prev
      const nextErrors = getLoginFieldErrors({ identifier: val, password })
      if (!nextErrors.identifier) {
        const next = { ...prev }
        delete next.identifier
        return next
      }
      return { ...prev, identifier: nextErrors.identifier }
    })
  }

  const updatePassword = (val) => {
    setPassword(val)
    setFieldErrors((prev) => {
      if (!prev.password) return prev
      const nextErrors = getLoginFieldErrors({ identifier, password: val })
      if (!nextErrors.password) {
        const next = { ...prev }
        delete next.password
        return next
      }
      return { ...prev, password: nextErrors.password }
    })
  }

  const handleSubmit = async () => {
    const errors = getLoginFieldErrors({ identifier, password })
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) return

    setLoading(true)
    try {
      const data = await loginRider(identifier.trim(), password)
      if (data?.requiresOtp) {
        setChannel(data.channel || "phone")
        setHint((data.channel === "email" ? data.emailHint : data.phoneHint) || "")
        if (data.demoOtp) setDemoOtp(data.demoOtp)
        setStep("otp")
        setOtp(["", "", "", ""])
        setOtpError("")
        toast.success("OTP sent successfully. Please verify to continue.")
      } else {
        toast.success("Signed in successfully")
        router.replace("/(rider)/dashboard")
      }
    } catch (err) {
      toast.error(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const error = getOtpFieldError(otp)
    setOtpError(error)
    if (error) return

    setLoading(true)
    try {
      await verifyRiderLoginOtp(identifier.trim(), password, otp.join(""))
      toast.success("Signed in successfully")
      router.replace("/(rider)/dashboard")
    } catch (err) {
      toast.error(err.message || "Failed to verify OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)

    if (otpError) {
      const error = getOtpFieldError(next)
      setOtpError(error)
    }

    if (value && index < 3) {
      otpRefs[index + 1].current.focus()
    }
  }

  const handleOtpKeyPress = (index, key) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus()
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      const data = await loginRider(identifier.trim(), password)
      if (data?.demoOtp) setDemoOtp(data.demoOtp)
      setOtp(["", "", "", ""])
      setOtpError("")
      if (otpRefs[0]?.current) otpRefs[0].current.focus()
      toast.success("OTP resent successfully")
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      enabled={isKeyboardVisible}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      style={{ flex: 1 }}
      className="flex-1 bg-cream"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#064d29", "#0B6B3A", "#0a4025"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: 48,
          }}
        >
          <TouchableOpacity
            onPress={() => (step === "otp" ? setStep("credentials") : router.replace("/(rider)/login"))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              position: "absolute",
              left: 20,
              top: Math.max(insets.top, 24) + 16,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Truck size={32} color="#F4C400" />
          </View>
          <Text
            style={{ width: "100%", textAlign: "center" }}
            className="font-poppins font-bold text-2xl text-white"
          >
            Rider Partner
          </Text>
          <Text
            style={{ width: "100%", textAlign: "center", marginTop: 8, lineHeight: 20 }}
            className="font-nunito text-white/70 text-sm"
          >
            {step === "otp"
              ? `One-time verification sent to ${hint || (channel === "email" ? "your email" : "your phone")}`
              : "Sign in to manage active deliveries, earnings, and your delivery profile."}
          </Text>
        </LinearGradient>

        <View
          style={{
            flex: 1,
            width: "100%",
            paddingHorizontal: 24,
            paddingVertical: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: "100%", maxWidth: 340 }}>
            <View className="bg-white rounded-3xl p-6 shadow-md">
              <Text className="font-poppins font-bold text-lg text-dark mb-1">
                {step === "otp" ? "Verify your account" : "Welcome back"}
              </Text>
              <Text className="font-nunito text-gray text-xs mb-6">
                {step === "otp" ? "Enter the 4-digit code to continue" : "Sign in to your rider account"}
              </Text>

              {step === "credentials" ? (
                <View className="gap-4">
                  <View>
                    <Text className="font-poppins font-medium text-xs text-dark-light mb-2">
                      Phone or Email
                    </Text>
                    <Input
                      value={identifier}
                      onChangeText={updateIdentifier}
                      placeholder="Phone number or email"
                      icon={User}
                      error={!!fieldErrors.identifier}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <FieldError message={fieldErrors.identifier} />
                  </View>

                  <View>
                    <Text className="font-poppins font-medium text-xs text-dark-light mb-2">
                      Password
                    </Text>
                    <PasswordInput
                      value={password}
                      onChangeText={updatePassword}
                      placeholder="Enter your password"
                      icon={Lock}
                      error={!!fieldErrors.password}
                    />
                    <FieldError message={fieldErrors.password} />
                    <TouchableOpacity
                      onPress={() => router.push("/(rider)/forgot-password")}
                      style={{ marginTop: fieldErrors.password ? 8 : 12 }}
                    >
                      <Text className="text-primary font-semibold text-xs text-right">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="pt-2">
                    <Button onPress={handleSubmit} size="lg" className="w-full h-12 rounded-full" loading={loading}>
                      <View className="flex-row items-center justify-center gap-2">
                        <Text className="text-white text-base font-bold">Sign In</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </View>
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="gap-4">
                  {demoOtp ? (
                    <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <Text className="font-nunito text-xs text-emerald-800 text-center font-semibold">
                        Demo OTP: {demoOtp}
                      </Text>
                    </View>
                  ) : null}

                  <View>
                    <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", paddingVertical: 8 }}>
                      {otp.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={otpRefs[i]}
                          keyboardType="number-pad"
                          maxLength={1}
                          value={digit}
                          onChangeText={(val) => handleOtpChange(i, val)}
                          onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
                          style={{
                            width: 48,
                            height: 48,
                            backgroundColor: otpError ? "#FEF2F2" : "#FAF9F6",
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: otpError ? "#F44336" : digit ? "#0B6B3A" : "#E3DFD5",
                            textAlign: "center",
                            fontSize: 20,
                            fontWeight: "bold",
                            color: "#1F1F1F",
                          }}
                        />
                      ))}
                    </View>
                    <FieldError message={otpError} />
                  </View>

                  <View className="pt-2">
                    <Button
                      onPress={handleVerifyOtp}
                      size="lg"
                      className="w-full h-12 rounded-full"
                      loading={loading}
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <Text className="text-white text-base font-bold">
                          {loading ? "Verifying..." : "Verify & sign in"}
                        </Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </View>
                    </Button>
                  </View>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={loading}
                    style={{ alignSelf: "center", marginTop: 8 }}
                  >
                    <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 14 }}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-gray-100">
                <Text className="font-nunito text-sm text-gray">{"Don't have a partner account? "}</Text>
                <TouchableOpacity onPress={() => router.push("/(rider)/signup")}>
                  <Text className="text-primary font-bold text-sm">Register now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
