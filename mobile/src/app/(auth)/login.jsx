import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, TextInput, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Mail, Lock, ArrowRight, Eye, EyeOff, AtSign } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "../../context/AuthContext"
import Svg, { Path } from "react-native-svg"

function WheatBackground() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} pointerEvents="none">
      {/* Top right wheat */}
      <Svg width="150" height="250" viewBox="0 0 150 250" style={{ position: "absolute", top: 10, right: -20, opacity: 0.18 }}>
        <Path
          d="M 10 240 Q 60 180 120 50"
          fill="none"
          stroke="#8D7E50"
          strokeWidth="2"
        />
        <Path d="M 60 180 Q 40 160 30 165 Q 45 180 60 180" fill="#8D7E50" />
        <Path d="M 70 160 Q 90 140 100 145 Q 85 160 70 160" fill="#8D7E50" />
        <Path d="M 80 140 Q 60 120 50 125 Q 65 140 80 140" fill="#8D7E50" />
        <Path d="M 90 120 Q 110 100 120 105 Q 105 120 90 120" fill="#8D7E50" />
        <Path d="M 100 100 Q 80 80 70 85 Q 85 100 100 100" fill="#8D7E50" />
        <Path d="M 110 80 Q 130 60 140 65 Q 125 80 110 80" fill="#8D7E50" />
      </Svg>

      {/* Bottom left wheat */}
      <Svg width="200" height="300" viewBox="0 0 200 300" style={{ position: "absolute", bottom: -20, left: -40, opacity: 0.15 }}>
        <Path
          d="M 30 280 Q 90 180 140 20"
          fill="none"
          stroke="#8D7E50"
          strokeWidth="2.5"
        />
        <Path d="M 60 220 Q 30 190 20 200 Q 40 225 60 220" fill="#8D7E50" />
        <Path d="M 80 190 Q 110 160 120 170 Q 95 195 80 190" fill="#8D7E50" />
        <Path d="M 95 160 Q 65 130 55 140 Q 75 165 95 160" fill="#8D7E50" />
        <Path d="M 110 130 Q 140 100 150 110 Q 125 135 110 130" fill="#8D7E50" />
        <Path d="M 125 100 Q 95 70 85 80 Q 105 105 125 100" fill="#8D7E50" />
        <Path d="M 135 70 Q 165 40 175 50 Q 150 75 135 70" fill="#8D7E50" />
      </Svg>
    </View>
  )
}

function ButtonWavePattern() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2, zIndex: 0 }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 350 56">
        <Path
          d="M 0 45 Q 87.5 25 175 45 T 350 45"
          fill="none"
          stroke="#E3DFD5"
          strokeWidth="1.5"
        />
        <Path
          d="M 0 50 Q 87.5 30 175 50 T 350 50"
          fill="none"
          stroke="#E3DFD5"
          strokeWidth="1"
        />
        <Path
          d="M 0 35 Q 87.5 15 175 35 T 350 35"
          fill="none"
          stroke="#E3DFD5"
          strokeWidth="0.8"
        />
      </Svg>
    </View>
  )
}

function CustomInput({
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  keyboardType = "default",
  autoCapitalize = "none",
  isGradientBorder = false,
  secureTextEntry = false,
  showToggle = false,
  isToggled = false,
  onTogglePress = null,
}) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View
      style={{
        borderRadius: 24,
        padding: 1.5,
        backgroundColor: isFocused ? "#0B6B3A" : "#E3DFD5",
      }}
    >
      <View
        style={{
          backgroundColor: "#FAF9F6",
          borderRadius: 23,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          height: 52,
        }}
      >
        {Icon && <Icon size={18} color={isFocused ? "#0B6B3A" : "#7A7A7A"} style={{ marginRight: 12 }} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9A9A9A"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            height: "100%",
            fontSize: 14,
            fontFamily: "Nunito",
            color: "#1F1F1F",
            ...Platform.select({
              web: {
                outlineStyle: "none",
                outlineWidth: 0,
                outlineColor: "transparent",
              },
            }),
          }}
        />
        {showToggle && onTogglePress && (
          <TouchableOpacity onPress={onTogglePress} style={{ padding: 4 }}>
            {isToggled ? <EyeOff size={18} color="#7A7A7A" /> : <Eye size={18} color="#7A7A7A" />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function PremiumButton({ onPress, label, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={{
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: "#0B6B3A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
        width: "100%",
        height: 56,
      }}
    >
      <LinearGradient
        colors={["#0C4240", "#135E39"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: "100%",
          height: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <ButtonWavePattern />
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 10 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins", fontWeight: "bold" }}>
              {label}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const successMessage = params?.message
  const initialIdentifier = params?.phone || params?.email || params?.identifier

  const { loginCustomer, verifyLoginOtp, user } = useAuth()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // OTP Login step additions
  const [step, setStep] = useState("credentials") // "credentials" or "otp"
  const [otp, setOtp] = useState(["", "", "", ""])
  const [phoneHint, setPhoneHint] = useState("")
  const [demoOtp, setDemoOtp] = useState("")

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const [prevInitialIdentifier, setPrevInitialIdentifier] = useState(null)

  // Sync identifier state when initialIdentifier parameter changes during render
  if (initialIdentifier && initialIdentifier !== prevInitialIdentifier) {
    setPrevInitialIdentifier(initialIdentifier)
    setIdentifier(initialIdentifier)
  }

  useEffect(() => {
    if (user?.role === "customer") {
      router.replace("/(customer)/home")
    }
  }, [user, router])

  if (user?.role === "customer") return null

  const handleSubmit = async () => {
    if (!identifier || !password) {
      setError("Please fill in all fields")
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await loginCustomer(identifier, password)
      if (data?.requiresOtp) {
        setPhoneHint(data.phoneHint || "")
        setStep("otp")
        setOtp(["", "", "", ""])
      } else {
        router.replace("/(customer)/home")
      }
    } catch (err) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("")
    if (otpValue.length !== 4) {
      setError("Please enter the 4-digit OTP")
      return
    }
    setError("")
    setLoading(true)
    try {
      await verifyLoginOtp(identifier, password, otpValue)
      router.replace("/(customer)/home")
    } catch (err) {
      setError(err.message || "Failed to verify OTP")
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

  const handleResendOtp = async () => {
    setError("")
    setLoading(true)
    try {
      const data = await loginCustomer(email, password)
      setError("")
      if (data?.demoOtp) setDemoOtp(data.demoOtp)
      setOtp(["", "", "", ""])
      // Focus first input
      if (otpRefs[0]?.current) otpRefs[0].current.focus()
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient
      colors={["#FFF8D6", "#FAF9F5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.5 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <WheatBackground />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo and Greetings */}
          <View style={{ paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 64 : 44, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ position: "relative" }}>
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: "#FFFFFF" }}
                  resizeMode="cover"
                />
                {/* Red Crown Badge */}
                <View style={{ position: "absolute", top: -2, right: -2, backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1.5, borderColor: "#FFFFFF" }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "bold" }}>👑</Text>
                </View>
              </View>
            </View>

            <Text className="font-poppins font-bold text-3xl text-dark mt-6">
              {step === "otp" ? "Verify your phone" : "Welcome back"}
            </Text>
            <Text className="font-nunito text-gray text-sm mt-1">
              {step === "otp"
                ? `One-time verification sent to ${phoneHint || "your phone"}`
                : "Sign in to order homemade food"}
            </Text>
          </View>

          {/* White Card Container */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Platform.OS === "ios" ? 44 : 24,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: -12 },
              shadowOpacity: 0.05,
              shadowRadius: 16,
              elevation: 16,
              flex: 1,
              marginTop: 12,
            }}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => (step === "otp" ? setStep("credentials") : router.replace("/(customer)/home"))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F5F5F3",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <ArrowLeft size={18} color="#1F1F1F" />
            </TouchableOpacity>

            {successMessage ? (
              <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <Text className="font-nunito text-sm text-green-800">{successMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="font-nunito text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            {step === "credentials" ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text className="font-poppins font-semibold text-[13px] text-dark mb-2">Email or Phone</Text>
                  <CustomInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Email or phone number"
                    icon={AtSign}
                    keyboardType="default"
                    autoCapitalize="none"
                    isGradientBorder={true}
                  />
                </View>

                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text className="font-poppins font-semibold text-[13px] text-dark">Password</Text>
                    <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                      <Text className="text-xs text-primary font-semibold">Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                  <CustomInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    icon={Lock}
                    secureTextEntry={!showPassword}
                    showToggle={true}
                    isToggled={showPassword}
                    onTogglePress={() => setShowPassword(!showPassword)}
                  />
                </View>

                <View style={{ paddingTop: 16 }}>
                  <PremiumButton
                    onPress={handleSubmit}
                    label="Sign in"
                    loading={loading}
                  />
                </View>

                <View className="flex-row justify-center mt-6">
                  <Text className="font-nunito text-sm text-gray">{"Don't have an account? "}</Text>
                  <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                    <Text className="text-primary font-bold text-sm">Create account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>

                {/* 4 Digit OTP Inputs */}
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

                <View style={{ paddingTop: 16 }}>
                  <PremiumButton
                    onPress={handleVerifyOtp}
                    label={loading ? "Verifying..." : "Verify & sign in"}
                    loading={loading}
                    disabled={otp.some((d) => !d)}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={loading}
                  style={{ alignSelf: "center", marginTop: 12 }}
                >
                  <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 14 }}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Brand Slogan */}
            <Text style={{ color: "#8D7E50", fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", letterSpacing: 2, textAlign: "center", marginTop: 40 }}>
              HOMEMADE FOOD AT YOUR FINGERTIPS
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
