import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput } from "react-native"
import { useRouter } from "expo-router"
import { ArrowLeft, Phone, Lock, ArrowRight, RotateCw } from "lucide-react-native"
import Svg, { Path, Rect, Circle } from "react-native-svg"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"

function SecurityIllustration() {
  return (
    <View className="items-center justify-center mb-6">
      <Svg width="120" height="100" viewBox="0 0 120 100">
        {/* Shield */}
        <Path
          d="M 68 25 L 98 35 C 98 65 68 85 68 85 C 68 85 38 65 38 35 Z"
          fill="#C4D1DB"
          opacity="0.5"
        />
        <Path
          d="M 68 25 L 98 35 C 98 65 68 85 68 85 L 68 25 Z"
          fill="#94A3B8"
          opacity="0.6"
        />

        {/* Lock Body */}
        <Rect x="42" y="40" width="36" height="28" rx="6" fill="#FFFFFF" stroke="#334155" strokeWidth="2.5" />
        {/* Lock Shackle */}
        <Path d="M 50 40 V 28 C 50 20 70 20 70 28 V 40" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        {/* Keyhole */}
        <Circle cx="60" cy="52" r="3" fill="#334155" />
        <Path d="M 59 52 L 61 52 L 62 60 L 58 60 Z" fill="#334155" />

        {/* Key */}
        <Path d="M 26 48 L 44 48" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="24" cy="48" r="6" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
        <Path d="M 38 48 V 53 M 42 48 V 52" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    </View>
  )
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { sendForgotPasswordOtp, resetPassword } = useAuth()
  const [step, setStep] = useState("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [phoneHint, setPhoneHint] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const [resendLoading, setResendLoading] = useState(false)

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const scrollViewRef = useRef(null)
  const otpValue = otp.join("")

  const handlePasswordFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 150)
  }

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

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setError("Please enter your 10-digit phone number")
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await sendForgotPasswordOtp(phone.trim())
      setPhoneHint(data.phoneHint || `******${phone.trim().slice(-4)}`)
      setStep("otp")
      setResendTimer(30)
    } catch (err) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return
    setError("")
    setSuccess("")
    setResendLoading(true)
    try {
      const data = await sendForgotPasswordOtp(phone.trim())
      setPhoneHint(data.phoneHint || `******${phone.trim().slice(-4)}`)
      setSuccess("New OTP sent successfully!")
      setResendTimer(30)
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setResendLoading(false)
    }
  }

  const handleReset = async () => {
    if (otp.some((d) => !d) || password.length < 6) {
      setError("Please complete OTP and enter a password (min 6 chars)")
      return
    }
    setError("")
    setLoading(true)
    try {
      await resetPassword({ phoneOrEmail: phone.trim(), otp: otpValue, password })
      setSuccess("Password updated! Redirecting to login...")
      setTimeout(() => {
        router.replace({
          pathname: "/(auth)/login",
          params: { phone },
        })
      }, 2000)
    } catch (err) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)

    // Focus next input if value is filled
    if (value && index < 3) {
      otpRefs[index + 1].current.focus()
    }
  }

  const handleOtpKeyPress = (index, key) => {
    // Focus previous input on backspace if current is empty
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus()
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      style={{ flex: 1 }}
      className="flex-1 bg-cream relative"
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingTop: 40, paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Left Back Circle Button */}
        <TouchableOpacity
          onPress={() => (step === "otp" ? setStep("phone") : router.replace("/(auth)/login"))}
          className="absolute top-12 left-6 w-10 h-10 rounded-full bg-white border border-gray-light flex items-center justify-center shadow-sm z-20"
        >
          <ArrowLeft size={18} color="#1F1F1F" />
        </TouchableOpacity>

        <View className="px-6 items-center w-full max-w-md self-center">
          {/* Top Security Illustration */}
          <SecurityIllustration />

          {/* Centered Header */}
          <Text className="font-poppins font-bold text-3xl text-dark text-center">Reset password</Text>
          <Text className="font-nunito text-gray text-sm mt-2 text-center max-w-xs leading-5">
            {step === "phone"
              ? "Enter your phone number — we'll send an OTP to verify your identity"
              : `OTP sent to ${phoneHint || "your phone"}`}
          </Text>

          {/* Form Container */}
          <View className="w-full mt-6">
            {error ? (
              <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="font-nunito text-sm text-red-700 text-center">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <Text className="font-nunito text-sm text-green-800 text-center">{success}</Text>
              </View>
            ) : null}

            {step === "phone" ? (
              <View className="space-y-4">
                <View>
                  <Text className="font-poppins font-medium text-xs text-dark mb-2">Phone Number</Text>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter 10-digit number"
                    icon={Phone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View className="pt-2">
                  <Button onPress={handleSendOtp} size="lg" className="w-full h-14 rounded-full" loading={loading}>
                    <View className="flex-row items-center justify-center gap-2">
                      <Text className="text-white text-base font-bold">Send OTP</Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </View>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="space-y-6">
                {/* 4 Digit OTP Inputs */}
                <View className="flex-row gap-3 justify-center py-2">
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
                        width: 54,
                        height: 54,
                        backgroundColor: "white",
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: "#E8E8E8",
                        textAlign: "center",
                        fontSize: 22,
                        fontWeight: "bold",
                        color: "#1F1F1F",
                      }}
                    />
                  ))}
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
                  <Text className="font-poppins font-medium text-xs text-dark mb-2">New Password</Text>
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    icon={Lock}
                    onFocus={handlePasswordFocus}
                  />
                </View>

                <View className="pt-2">
                  <Button
                    onPress={handleReset}
                    size="lg"
                    className="w-full h-14 rounded-full"
                    loading={loading}
                    disabled={otp.some((d) => !d) || password.length < 6}
                  >
                    <Text className="text-white text-base font-bold">Reset Password</Text>
                  </Button>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} className="mt-6">
              <Text className="text-primary font-bold text-center text-sm underline">Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
