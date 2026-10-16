import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Linking, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { ArrowLeft, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Check, FileText, ExternalLink, X } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "../../context/AuthContext"
import { checkPhoneAvailability, getUserAgreement } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import Svg, { Path } from "react-native-svg"

let WebView = null
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView
  } catch (e) {
    console.warn("react-native-webview not loaded", e)
  }
}

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

import { CheckCircle } from "lucide-react-native"

export default function SignupPage() {
  const router = useRouter()
  const { signupCustomer, verifySignupOtp, resendSignupOtp, loginCustomer } = useAuth()
  
  const [step, setStep] = useState("signup") // "signup" or "otp"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreementRead, setAgreementRead] = useState(false)
  const [userAgreement, setUserAgreement] = useState(null)
  const [pdfModalVisible, setPdfModalVisible] = useState(false)
  const [pdfViewerLoading, setPdfViewerLoading] = useState(true)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // OTP state variables
  const [userId, setUserId] = useState(null)
  const [otp, setOtp] = useState(["", "", "", ""])
  const [phoneHint, setPhoneHint] = useState("")
  const [resendTimer, setResendTimer] = useState(30)
  const [resendMessage, setResendMessage] = useState("")
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    getUserAgreement()
      .then((data) => {
        if (data?.url) {
          setUserAgreement({
            ...data,
            url: resolveMediaUrl(data.url)
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let interval = null
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [step, resendTimer])

  const handleSubmit = async () => {
    if (!name || !email || !phone || !password) {
      setError("Please fill in all fields")
      return
    }
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (userAgreement?.url && !agreementRead) {
      setError("Please tap and read the User Agreement PDF before signing up")
      return
    }
    if (!agreedToTerms) {
      setError("Please accept the User Agreement & Terms to proceed")
      return
    }

    setError("")
    setLoading(true)
    try {
      await checkPhoneAvailability(phone, email, "customer")
      const res = await signupCustomer({
        name,
        email,
        phone,
        password,
      })
      if (res.requiresOtp) {
        setUserId(res.userId)
        setPhoneHint(`******${phone.slice(-4)}`)
        setResendTimer(30)
        setStep("otp")
      } else {
        // Fallback login directly
        await loginCustomer(email, password)
      }
    } catch (err) {
      setError(err.message || "Signup failed")
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
      await verifySignupOtp(userId, otpValue)
      router.replace({
        pathname: "/(auth)/login",
        params: {
          message: "Account created and verified! Please sign in to continue.",
          phone: phone.trim(),
        },
      })
    } catch (err) {
      setError(err.message || "Failed to verify OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    setError("")
    setResendMessage("")
    setLoading(true)
    try {
      await resendSignupOtp(userId)
      setResendMessage("New OTP sent successfully!")
      setResendTimer(30)
      setOtp(["", "", "", ""])
      if (otpRefs[0]?.current) otpRefs[0].current.focus()
      setTimeout(() => setResendMessage(""), 4000)
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
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
          {/* Top Greetings */}
          <View style={{ paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 64 : 44, paddingBottom: 16 }}>
            <Text className="font-poppins font-bold text-3xl text-dark">
              {step === "signup" ? "Create account" : "Verify your phone"}
            </Text>
            <Text className="font-nunito text-gray text-sm mt-1">
              {step === "signup" ? "Sign up to buy homemade food" : `One-time verification sent to ${phoneHint}`}
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
              onPress={() => (step === "otp" ? setStep("signup") : router.canGoBack() ? router.back() : router.replace("/(customer)/home"))}
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

            {error ? (
              <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="font-nunito text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            {step === "signup" ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text className="font-poppins font-semibold text-[13px] text-dark mb-2">Full Name</Text>
                  <CustomInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    icon={User}
                    autoCapitalize="words"
                    isGradientBorder={false}
                  />
                </View>

                <View>
                  <Text className="font-poppins font-semibold text-[13px] text-dark mb-2">Email Address</Text>
                  <CustomInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    icon={Mail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    isGradientBorder={true}
                  />
                </View>

                <View>
                  <Text className="font-poppins font-semibold text-[13px] text-dark mb-2">Phone Number</Text>
                  <CustomInput
                    value={phone}
                    onChangeText={(val) => setPhone(val.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    icon={Phone}
                    keyboardType="phone-pad"
                    isGradientBorder={false}
                  />
                </View>

                <View>
                  <Text className="font-poppins font-semibold text-[13px] text-dark mb-2">Password</Text>
                  <CustomInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    icon={Lock}
                    secureTextEntry={!showPassword}
                    showToggle={true}
                    isToggled={showPassword}
                    onTogglePress={() => setShowPassword(!showPassword)}
                  />
                </View>

                {/* User Agreement PDF Card (Compulsory) */}
                {userAgreement?.url ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setPdfViewerLoading(true)
                      setPdfModalVisible(true)
                      setAgreementRead(true)
                      setAgreedToTerms(true)
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: agreementRead ? "#F0FBF4" : "#FFF8E7",
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1.5,
                      borderColor: agreementRead ? "#0B6B3A" : "#F4C400",
                      marginTop: 4,
                    }}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: agreementRead ? "#EAF7EE" : "#FEF3C7",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <FileText size={18} color={agreementRead ? "#0B6B3A" : "#B8900A"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Poppins", fontWeight: "600", fontSize: 13, color: agreementRead ? "#0B6B3A" : "#92400E" }}>
                        {agreementRead ? "Agreement Read ✓" : "Read User Agreement (Required)"}
                      </Text>
                      <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "#7A7A7A", marginTop: 1 }}>
                        Version {userAgreement.version} · Tap to view PDF in app
                      </Text>
                    </View>
                    {!agreementRead ? (
                      <ArrowRight size={16} color="#B8900A" />
                    ) : (
                      <Check size={18} color="#0B6B3A" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ) : null}

                {/* User Agreement & Terms Checkbox */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (userAgreement?.url && !agreementRead) {
                      setPdfViewerLoading(true)
                      setPdfModalVisible(true)
                      setAgreementRead(true)
                      setAgreedToTerms(true)
                    } else {
                      setAgreedToTerms(!agreedToTerms)
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: agreedToTerms ? "#0B6B3A" : "#D1D5DB",
                      backgroundColor: agreedToTerms ? "#0B6B3A" : "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    {agreedToTerms && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Nunito", fontSize: 12, color: "#4B5563", lineHeight: 18 }}>
                      I agree to the{" "}
                      <Text
                        onPress={() => {
                          if (userAgreement?.url) {
                            setPdfViewerLoading(true)
                            setPdfModalVisible(true)
                            setAgreementRead(true)
                            setAgreedToTerms(true)
                          }
                        }}
                        style={{ color: "#0B6B3A", fontWeight: "bold", textDecorationLine: "underline" }}
                      >
                        User Agreement &amp; Terms
                      </Text>
                      .
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={{ paddingTop: 16 }}>
                  <PremiumButton 
                    onPress={handleSubmit} 
                    label="Sign up" 
                    loading={loading} 
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {resendMessage ? (
                  <View style={{ backgroundColor: "#EAF7EE", borderRadius: 16, borderHeight: 1, borderColor: "#D6EAE7", padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <CheckCircle size={16} color="#059669" />
                    <Text style={{ color: "#0B6B3A", fontWeight: "bold", fontSize: 13 }}>{resendMessage}</Text>
                  </View>
                ) : null}

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
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: digit ? "#0B6B3A" : "#E3DFD5",
                        textAlign: "center",
                        fontSize: 22,
                        fontFamily: "Poppins",
                        fontWeight: "bold",
                        color: "#1F1F1F",
                      }}
                    />
                  ))}
                </View>

                {error ? (
                  <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 mt-2">
                    <Text className="font-nunito text-xs text-red-700 text-center">{error}</Text>
                  </View>
                ) : null}

                <View style={{ paddingTop: 16 }}>
                  <PremiumButton 
                    onPress={handleVerifyOtp} 
                    label="Verify &amp; Continue" 
                    loading={loading} 
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={loading || resendTimer > 0}
                  style={{ alignSelf: "center", marginTop: 8 }}
                >
                  <Text style={{ color: resendTimer > 0 ? "#9A9A9A" : "#0B6B3A", fontWeight: "bold", fontSize: 14 }}>
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "signup" ? (
              <View className="flex-row justify-center mt-6">
                <Text className="font-nunito text-sm text-gray">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                  <Text className="text-primary font-bold text-sm">Sign in</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Bottom Brand Slogan */}
            <Text style={{ color: "#8D7E50", fontSize: 9, fontFamily: "Poppins", fontWeight: "bold", letterSpacing: 2, textAlign: "center", marginTop: 40 }}>
              HOMEMADE FOOD AT YOUR FINGERTIPS
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* In-App User Agreement PDF Modal */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0B6B3A" }} edges={["top", "bottom"]}>
          {/* Modal Header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: "#0B6B3A"
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <FileText size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>
                  User Agreement &amp; Terms
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                  Version {userAgreement?.version || 1} · Official Terms
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {userAgreement?.url ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(userAgreement.url)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  accessibilityLabel="Open PDF in new tab"
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* PDF Viewer Body */}
          <View style={{ flex: 1, backgroundColor: "#FFFFFF", position: "relative" }}>
            {pdfViewerLoading && (
              <View style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                gap: 12
              }}>
                <ActivityIndicator size="large" color="#0B6B3A" />
                <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#7A7A7A" }}>
                  Loading User Agreement...
                </Text>
              </View>
            )}

            {Platform.OS === "web" ? (
              <iframe
                src={userAgreement?.url || ""}
                style={{ width: "100%", height: "100%", minHeight: "100%", border: "none", display: "block", backgroundColor: "#FFFFFF" }}
                onLoad={() => setPdfViewerLoading(false)}
              />
            ) : WebView ? (
              <WebView
                source={{
                  uri: Platform.OS === "android" && userAgreement?.url && !userAgreement.url.includes("localhost") && !userAgreement.url.includes("127.0.0.1") && !userAgreement.url.includes("10.0.2.2")
                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(userAgreement.url)}`
                    : (userAgreement?.url || "")
                }}
                style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                onLoadEnd={() => setPdfViewerLoading(false)}
                onError={() => setPdfViewerLoading(false)}
                startInLoadingState={true}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                <FileText size={48} color="#0B6B3A" />
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 16, color: "#1F1F1F", marginTop: 16, textAlign: "center" }}>
                  User Agreement &amp; Terms
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 13, color: "#7A7A7A", textAlign: "center", marginTop: 8 }}>
                  Document loaded and ready for review.
                </Text>
              </View>
            )}
          </View>

          {/* Modal Bottom Action Bar */}
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E5E5",
            flexDirection: "row",
            gap: 12
          }}>
            <TouchableOpacity
              disabled={pdfViewerLoading}
              onPress={() => {
                if (pdfViewerLoading) return
                setAgreementRead(true)
                setAgreedToTerms(true)
                setPdfModalVisible(false)
              }}
              style={{
                flex: 1,
                height: 48,
                backgroundColor: pdfViewerLoading ? "#A0A0A0" : "#0B6B3A",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: pdfViewerLoading ? 0.65 : 1,
                shadowColor: "#0B6B3A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: pdfViewerLoading ? 0 : 0.2,
                shadowRadius: 5,
                elevation: pdfViewerLoading ? 0 : 3
              }}
            >
              {pdfViewerLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={{ color: "#FFFFFF", fontFamily: "Poppins", fontWeight: "bold", fontSize: 14 }}>
                {pdfViewerLoading ? "Loading Agreement..." : "I Have Read & Accept Terms"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  )
}
