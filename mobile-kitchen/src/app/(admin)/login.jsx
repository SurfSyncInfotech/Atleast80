import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { ShieldCheck, ArrowLeft, Mail, Lock, ChefHat, Users } from "lucide-react-native"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"

export default function AdminLoginScreen() {
  const router = useRouter()
  const { loginAdmin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields")
      return
    }

    setError("")
    setLoading(true)

    try {
      await loginAdmin(email.trim(), password.trim())
      router.replace("/(admin)/dashboard")
    } catch (err) {
      setError(err.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-cream">
      {/* Dark gradient top section */}
      <LinearGradient
        colors={["#0A1F13", "#0B6B3A", "#064D29"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-12 pb-16 px-6 rounded-b-[40px] relative overflow-hidden"
      >
        {/* Subtle circles */}
        <View className="absolute top-[-50] right-[-50] w-48 h-48 rounded-full bg-white/5" />
        <View className="absolute bottom-[-30] left-[-30] w-36 h-36 rounded-full bg-secondary/5" />

        <SafeAreaView edges={["top"]}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.replace("/(customer)/home")}
            className="flex-row items-center gap-1.5 self-start px-3 py-1.5 bg-white/10 rounded-full border border-white/10 mb-6"
          >
            <ArrowLeft size={14} color="#FFF" />
            <Text className="font-nunito text-xs text-white/80">Back</Text>
          </TouchableOpacity>

          <View className="items-center mt-2">
            <View className="w-14 h-14 bg-white/10 rounded-2xl items-center justify-center mb-4 border border-white/15">
              <ShieldCheck size={28} color="#F4C400" />
            </View>
            <Text className="font-poppins font-bold text-2xl text-white text-center">
              Admin Portal
            </Text>
            <Text className="font-nunito text-white/60 text-xs text-center mt-1.5 max-w-[280px] leading-relaxed">
              Secure console for Atleast80 authorized team members only.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Form Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-6 -mt-8"
          contentContainerStyle={{ pb: 40 }}
        >
          <View className="bg-white rounded-3xl shadow-lg border border-primary/5 p-6 gap-5">
            <View>
              <Text className="font-poppins font-bold text-dark text-lg">
                Sign In
              </Text>
              <Text className="font-nunito text-gray text-xs mt-0.5">
                Authorized credentials required
              </Text>
            </View>

            {/* Email Field */}
            <View>
              <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                Email Address
              </Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="admin@atleast80.com"
                icon={Mail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View>
              <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                Password
              </Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                icon={Lock}
              />
            </View>

            {error ? (
              <View className="bg-red-50 border border-red-100 p-3 rounded-xl">
                <Text className="text-red-700 text-xs font-nunito text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              onPress={handleSubmit}
              loading={loading}
              className="py-3 rounded-xl mt-2"
            >
              Sign In
            </Button>
          </View>

          <Text className="font-nunito text-[11px] text-[#999] text-center mt-6 px-8 leading-relaxed">
            This area is restricted. Unauthorized access attempts are monitored and logged.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
