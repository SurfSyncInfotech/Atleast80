import { useState, useRef } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ArrowLeft, Phone, Lock, ArrowRight, Utensils } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { api } from "../../lib/api"

export default function KitchenForgotPasswordPage() {
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const [step, setStep] = useState("phone") // "phone" | "otp"
    const [phone, setPhone] = useState("")
    const [userId, setUserId] = useState(null)
    const [hint, setHint] = useState("")
    const [demoOtp, setDemoOtp] = useState("")
    const [otp, setOtp] = useState(["", "", "", ""])
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

    const handleSendOtp = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("Enter a valid 10-digit Indian mobile number")
            return
        }
        setError("")
        setLoading(true)
        try {
            const data = await api("/api/auth/kitchen/forgot-password/send-otp", {
                method: "POST",
                body: JSON.stringify({ phone }),
            })
            setUserId(data.userId)
            setHint(data.phoneHint)
            if (data.demoOtp) setDemoOtp(data.demoOtp)
            setStep("otp")
        } catch (err) {
            setError(err.message || "Failed to send OTP")
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async () => {
        const otpValue = otp.join("")
        if (otpValue.length !== 4) {
            setError("Please enter the 4-digit OTP")
            return
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }
        setError("")
        setLoading(true)
        try {
            await api("/api/auth/kitchen/forgot-password/reset", {
                method: "POST",
                body: JSON.stringify({ userId, otp: otpValue, password }),
            })
            setSuccess("Password updated! Redirecting to login...")
            setTimeout(() => router.replace("/(kitchen)/login"), 2000)
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
        if (value && index < 3) otpRefs[index + 1].current?.focus()
    }

    const handleOtpKeyPress = (index, key) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus()
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-cream">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
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
                        onPress={() => (step === "otp" ? setStep("phone") : router.replace("/(kitchen)/login"))}
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
                        <Utensils size={32} color="#F4C400" />
                    </View>
                    <Text style={{ width: "100%", textAlign: "center" }} className="font-poppins font-bold text-2xl text-white">
                        Reset Password
                    </Text>
                    <Text style={{ width: "100%", textAlign: "center", marginTop: 8, lineHeight: 20 }} className="font-nunito text-white/70 text-sm">
                        {step === "phone"
                            ? "Enter your registered kitchen phone number to receive an OTP"
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
                                {step === "phone" ? "Enter your kitchen account phone number" : "Enter the OTP and your new password"}
                            </Text>

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
                                <View className="gap-4">
                                    <View>
                                        <Text className="font-poppins font-medium text-xs text-dark-light mb-2">Phone Number</Text>
                                        <Input
                                            value={phone}
                                            onChangeText={(val) => setPhone(val.replace(/\D/g, "").slice(0, 10))}
                                            placeholder="Enter 10-digit number"
                                            icon={Phone}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
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
                                                    borderWidth: 1,
                                                    borderColor: "#D1D5DB",
                                                    textAlign: "center",
                                                    fontSize: 18,
                                                    color: "#111827",
                                                    backgroundColor: "#F8FAFC",
                                                    fontFamily: "Poppins",
                                                }}
                                            />
                                        ))}
                                    </View>

                                    <View>
                                        <Text className="font-poppins font-medium text-xs text-dark-light mb-2">New Password</Text>
                                        <PasswordInput
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="••••••••"
                                            icon={Lock}
                                        />
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
