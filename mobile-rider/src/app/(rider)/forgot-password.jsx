import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput, Keyboard } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ArrowLeft, Phone, Lock, ArrowRight, Truck, RotateCw } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import FieldError from "../../components/ui/FieldError"
import { api } from "../../lib/api"
import { useToast } from "../../context/ToastContext"
import {
  getForgotPhoneError,
  getForgotResetFieldErrors,
  getOtpFieldError,
  hasFieldErrors,
} from "../../lib/validation"

export default function RiderForgotPasswordPage() {
  const router = useRouter()
  const toast = useToast()
  const insets = useSafeAreaInsets()
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

  const [step, setStep] = useState("phone")
  const [phone, setPhone] = useState("")
  const [userId, setUserId] = useState(null)
  const [hint, setHint] = useState("")
  const [demoOtp, setDemoOtp] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const [resendLoading, setResendLoading] = useState(false)

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    let timer = null
    if (step === "otp" && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [step, resendTimer])

  const updatePhone = (val) => {
    const next = val.replace(/\D/g, "").slice(0, 10)
    setPhone(next)
    setFieldErrors((prev) => {
      if (!prev.phone) return prev
      const msg = getForgotPhoneError(next)
      if (!msg) {
        const nextErrors = { ...prev }
        delete nextErrors.phone
        return nextErrors
      }
      return { ...prev, phone: msg }
    })
  }

  const updatePassword = (val) => {
    setPassword(val)
    setFieldErrors((prev) => {
      if (!prev.password) return prev
      const nextErrors = getForgotResetFieldErrors({ otpDigits: otp, password: val })
      if (!nextErrors.password) {
        const next = { ...prev }
        delete next.password
        return next
      }
      return { ...prev, password: nextErrors.password }
    })
  }

  const handleSendOtp = async () => {
    const phoneError = getForgotPhoneError(phone)
    const errors = phoneError ? { phone: phoneError } : {}
    setFieldErrors(errors)
    if (phoneError) return

    setLoading(true)
    try {
      const data = await api("/api/auth/rider/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      })
      setUserId(data.userId)
      setHint(data.phoneHint)
      if (data.demoOtp) setDemoOtp(data.demoOtp)
      setStep("otp")
      setOtp(["", "", "", ""])
      setPassword("")
      setFieldErrors({})
      setResendTimer(30)
      toast.success("OTP sent successfully")
    } catch (err) {
      toast.error(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return
    setResendLoading(true)
    try {
      const data = await api("/api/auth/rider/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      })
      setUserId(data.userId)
      setHint(data.phoneHint)
      if (data.demoOtp) setDemoOtp(data.demoOtp)
      setResendTimer(30)
      toast.success("New OTP sent successfully")
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP")
    } finally {
      setResendLoading(false)
    }
  }

  const handleReset = async () => {
    const errors = getForgotResetFieldErrors({ otpDigits: otp, password })
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) return

    setLoading(true)
    try {
      await api("/api/auth/rider/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ userId, otp: otp.join(""), password }),
      })
      toast.success("Password updated successfully")
      setTimeout(() => router.replace("/(rider)/login"), 1200)
    } catch (err) {
      toast.error(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (fieldErrors.otp) {
      const msg = getOtpFieldError(next)
      setFieldErrors((prev) => {
        if (!msg) {
          const nextErrors = { ...prev }
          delete nextErrors.otp
          return nextErrors
        }
        return { ...prev, otp: msg }
      })
    }
    if (value && index < 3) otpRefs[index + 1].current?.focus()
  }

  const handleOtpKeyPress = (index, key) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
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
        contentContainerStyle={{ flexGrow: 1 }}
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
            onPress={() => (step === "otp" ? setStep("phone") : router.replace("/(rider)/login"))}
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
          <Text style={{ width: "100%", textAlign: "center" }} className="font-poppins font-bold text-2xl text-white">
            Reset Password
          </Text>
          <Text style={{ width: "100%", textAlign: "center", marginTop: 8, lineHeight: 20 }} className="font-nunito text-white/70 text-sm">
            {step === "phone"
              ? "Enter your registered phone number to receive an OTP"
              : `OTP sent to ${hint || "your phone"}`}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: "100%", maxWidth: 340 }}>
            <View className="bg-white rounded-3xl p-6 shadow-md">
              <Text className="font-poppins font-bold text-lg text-dark mb-1">
                {step === "phone" ? "Forgot Password" : "Verify & Reset"}
              </Text>
              <Text className="font-nunito text-gray text-xs mb-6">
                {step === "phone" ? "Enter your rider account phone number" : "Enter the OTP and your new password"}
              </Text>

              {step === "phone" ? (
                <View className="gap-4">
                  <View>
                    <Text className="font-poppins font-medium text-xs text-dark-light mb-2">Phone Number</Text>
                    <Input
                      value={phone}
                      onChangeText={updatePhone}
                      placeholder="Enter 10-digit number"
                      icon={Phone}
                      keyboardType="phone-pad"
                      maxLength={10}
                      error={!!fieldErrors.phone}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </View>
                  <View className="pt-2">
                    <Button onPress={handleSendOtp} size="lg" className="w-full h-12 rounded-full" loading={loading}>
                      <View className="flex-row items-center justify-center gap-2">
                        <Text className="text-white text-base font-bold">Send OTP</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </View>
                    </Button>
                  </View>
                </View>
              ) : (
                <View className="gap-4">
                  {demoOtp ? (
                    <View style={{ backgroundColor: "#F9FBF9", borderWidth: 1, borderColor: "#D1EAD1", borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 12, color: "#2E7D32", fontFamily: "Poppins", fontWeight: "bold", textAlign: "center" }}>
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
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: fieldErrors.otp ? "#F44336" : digit ? "#0B6B3A" : "#D1D5DB",
                            textAlign: "center",
                            fontSize: 18,
                            color: "#111827",
                            backgroundColor: fieldErrors.otp ? "#FEF2F2" : "#F8FAFC",
                            fontFamily: "Poppins",
                          }}
                        />
                      ))}
                    </View>
                    <FieldError message={fieldErrors.otp} />
                  </View>

                  <View className="flex-row items-center justify-between px-1">
                    <Text className="text-xs font-nunito text-gray">Didn't receive code?</Text>
                    {resendTimer > 0 ? (
                      <Text className="text-xs font-nunito text-gray font-semibold">Resend OTP in {resendTimer}s</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={handleResendOtp}
                        disabled={resendLoading}
                        className="flex-row items-center gap-1"
                      >
                        <RotateCw size={12} color="#0B6B3A" />
                        <Text className="text-xs font-nunito text-primary font-bold">
                          {resendLoading ? "Sending..." : "Resend OTP"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View>
                    <Text className="font-poppins font-medium text-xs text-dark-light mb-2">New Password</Text>
                    <PasswordInput
                      value={password}
                      onChangeText={updatePassword}
                      placeholder="At least 6 characters"
                      icon={Lock}
                      error={!!fieldErrors.password}
                    />
                    <FieldError message={fieldErrors.password} />
                  </View>

                  <View className="pt-2">
                    <Button onPress={handleReset} size="lg" className="w-full h-12 rounded-full" loading={loading}>
                      <View className="flex-row items-center justify-center gap-2">
                        <Text className="text-white text-base font-bold">Reset Password</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                      </View>
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
