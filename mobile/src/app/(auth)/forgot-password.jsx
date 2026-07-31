import { useState, useRef } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput } from "react-native"
import { useRouter } from "expo-router"
import { ArrowLeft, Phone, Lock, ArrowRight } from "lucide-react-native"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"

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

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const otpValue = otp.join("")

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
    } catch (err) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cream"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="px-6 pt-12">
          <TouchableOpacity
            onPress={() => (step === "otp" ? setStep("phone") : router.replace("/(auth)/login"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-light flex items-center justify-center"
          >
            <ArrowLeft size={18} color="#1F1F1F" />
          </TouchableOpacity>

          <Text className="font-poppins font-bold text-3xl text-dark mt-6">Reset password</Text>
          <Text className="font-nunito text-gray text-base mt-2">
            {step === "phone"
              ? "Enter your phone number — we'll send an OTP to verify your identity"
              : `OTP sent to ${phoneHint || "your phone"}`}
          </Text>
        </View>

        {/* Form Container */}
        <View className="flex-1 px-6 py-6 justify-center">
          {error ? (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="font-nunito text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <Text className="font-nunito text-sm text-green-800">{success}</Text>
            </View>
          ) : null}

          {step === "phone" ? (
            <View className="space-y-4">
              <View>
                <Text className="font-poppins font-medium text-sm text-dark mb-2">Phone Number</Text>
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
                <Button onPress={handleSendOtp} size="lg" className="w-full h-14" loading={loading}>
                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-white text-lg font-bold">Send OTP</Text>
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
                      width: 56,
                      height: 56,
                      backgroundColor: "white",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: "#E8E8E8",
                      textAlign: "center",
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "#1F1F1F",
                    }}
                  />
                ))}
              </View>

              <View>
                <Text className="font-poppins font-medium text-sm text-dark mb-2">New Password</Text>
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  icon={Lock}
                />
              </View>

              <View className="pt-2">
                <Button
                  onPress={handleReset}
                  size="lg"
                  className="w-full h-14"
                  loading={loading}
                  disabled={otp.some((d) => !d) || password.length < 6}
                >
                  <Text className="text-white text-lg font-bold">Reset Password</Text>
                </Button>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} className="mt-6">
            <Text className="text-primary font-bold text-center text-base">Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
