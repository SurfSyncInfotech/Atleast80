import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Linking } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  ArrowRight, ShieldCheck, Home, Heart, Users, Leaf,
  ShoppingCart, ChefHat, MapPin, Mail, Phone, Sparkles, CheckCircle2,
  ArrowLeft, ChevronRight
} from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { getContactSettings } from "../../../lib/api"

const stats = [
  { icon: ChefHat, label: "Home Kitchens", value: "500+", colors: ["#3B82F6", "#4F46E5"] },
  { icon: Users, label: "Happy Customers", value: "50K+", colors: ["#10B981", "#0D9488"] },
  { icon: Leaf, label: "Cities", value: "25+", colors: ["#FBBF24", "#F97316"] },
  { icon: ShieldCheck, label: "Hygiene Verified", value: "80%+", colors: ["#0B6B3A", "#064D29"] },
]

const values = [
  { icon: ShieldCheck, title: "Hygiene First", desc: "Daily verification, transparent ratings, and strict kitchen standards on every order.", color: "#059669", bg: "#ECFDF5" },
  { icon: Home, title: "Real Home Kitchens", desc: "Authentic home chefs and families — not commercial restaurants — cooking with care.", color: "#2563EB", bg: "#EFF6FF" },
  { icon: ShoppingCart, title: "Food & Ration", desc: "Meals, tiffins, and daily grocery essentials from one trusted kitchen.", color: "#D97706", bg: "#FFFBEB" },
  { icon: Heart, title: "Community First", desc: "Fair earnings for home kitchens and affordable, healthy food for every household.", color: "#E11D48", bg: "#FFF1F2" },
]

const pillars = [
  "Verified hygiene checks on every kitchen",
  "Homemade meals & ration in one order",
  "Stories, menus & ratings you can trust",
  "Supporting local home entrepreneurs",
]

export default function AboutScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("story")
  const [supportPhone, setSupportPhone] = useState("+91 40 3559 4439")
  const [supportEmail, setSupportEmail] = useState("contact@elifelo.com")
  const [supportAddress, setSupportAddress] = useState("Maharashtra, India")

  useEffect(() => {
    getContactSettings()
      .then((data) => {
        if (data?.supportPhone) setSupportPhone(data.supportPhone)
        if (data?.supportEmail) setSupportEmail(data.supportEmail)
        if (data?.supportAddress) setSupportAddress(data.supportAddress)
      })
      .catch((err) => {
        console.log("Failed to fetch contact settings in About:", err)
      })
  }, [])

  const handleCall = () => {
    const cleanNum = supportPhone.replace(/[^0-9+]/g, "")
    Linking.openURL(`tel:${cleanNum}`).catch(err => console.log("Failed to call", err))
  }

  const handleEmail = () => {
    Linking.openURL(`mailto:${supportEmail}`).catch(err => console.log("Failed to email", err))
  }

  const handleMap = () => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(supportAddress || "India")}`).catch(err => console.log("Failed to open maps", err))
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9F6]" edges={["top"]}>
      {/* Header (Premium Native Style) */}
      <View className="flex-row items-center px-4 py-3.5 bg-white border-b border-gray-light/35">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/(tabs)/home"))}
          className="mr-3 p-1.5 rounded-full active:bg-gray-100"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color="#1F1F1F" />
        </TouchableOpacity>
        <Text className="font-poppins font-bold text-base text-dark">
          About Atleast80
        </Text>
      </View>

      {/* Segmented control tabs */}
      <View style={{
        flexDirection: "row",
        backgroundColor: "#FAF9F5",
        borderRadius: 24,
        padding: 4,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderColor: "#E3DFD5",
        borderWidth: 1,
      }}>
        {[
          { id: "story", label: "Our Story" },
          { id: "values", label: "Our Values" },
          { id: "contact", label: "Stats & Contact" }
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.9}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: 20,
                backgroundColor: active ? "#0C4240" : "transparent",
              }}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: "Poppins",
                fontWeight: "bold",
                color: active ? "#FFFFFF" : "#7A7A7A",
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-grow"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {activeTab === "story" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {/* Timeline banner */}
            <View style={{ relative: "position", marginBottom: 20, borderRadius: 20, overflow: "hidden", height: 180, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              <Image
                source={require("../../../../assets/images/about.png")}
                style={{ width: "100%", height: "100%", borderRadius: 20 }}
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/20" />
              <View
                className="absolute bottom-3 right-3 bg-white rounded-xl p-3 border border-gray-light/35 max-w-[150px]"
                style={Platform.select({
                  default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 }
                })}
              >
                <Text className="font-poppins font-bold text-primary text-base leading-none">2026</Text>
                <Text className="font-nunito text-gray text-[9px] mt-1 leading-normal">
                  {"Founded to bring India's home kitchens online."}
                </Text>
              </View>
            </View>

            {/* Story cards */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View className="p-4 bg-white rounded-2xl border border-gray-light/35 shadow-sm">
                <View className="flex-row items-center gap-2 mb-2">
                  <Sparkles size={16} color="#0B6B3A" />
                  <Text className="font-poppins font-bold text-sm text-dark">The Inspiration</Text>
                </View>
                <Text className="font-nunito text-gray text-xs leading-relaxed">
                  {"We believe the best food doesn't come from big chains — it comes from home. Millions of talented cooks prepare nutritious meals every day, yet most discoverability is broken."}
                </Text>
              </View>

              <View className="p-4 bg-white rounded-2xl border border-gray-light/35 shadow-sm">
                <View className="flex-row items-center gap-2 mb-2">
                  <ChefHat size={16} color="#4F46E5" />
                  <Text className="font-poppins font-bold text-sm text-dark">Empowering Chefs</Text>
                </View>
                <Text className="font-nunito text-gray text-xs leading-relaxed">
                  {"Atleast80 gives home kitchens a platform to go live, share updates via stories, list food and ration, and build loyal customer communities who value hygiene, authenticity, and fair pricing."}
                </Text>
              </View>
            </View>

            {/* Pillars */}
            <View className="bg-white rounded-2xl border border-gray-light/35 p-4 mb-5 shadow-sm">
              <Text className="font-poppins font-bold text-xs text-dark mb-3">Our Platform Pillars</Text>
              {pillars.map((item, index) => (
                <View key={index} className="flex-row items-start gap-2.5 mb-2.5">
                  <CheckCircle2 size={14} color="#0B6B3A" style={{ marginTop: 2 }} />
                  <Text className="font-nunito text-xs text-dark flex-1 leading-relaxed">{item}</Text>
                </View>
              ))}
            </View>

            {/* Mission banner */}
            <View className="relative rounded-2xl overflow-hidden min-h-[220px] justify-center bg-primary p-5 shadow-sm">
              <Image
                source={require("../../../../assets/images/indianwomen.png")}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.25, borderRadius: 20 }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(11, 107, 58, 0.95)", "rgba(11, 107, 58, 0.70)"]}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" }}
              />
              <View className="relative z-10">
                <Text className="font-poppins font-bold text-white text-base">Our Mission</Text>
                <Text className="font-nunito text-white/85 text-xs mt-2 leading-relaxed">
                  Make homemade food and daily ration accessible to every household in India — while empowering home kitchens to build sustainable, dignified livelihoods.
                </Text>
                <View className="flex-row gap-3 mt-5">
                  <TouchableOpacity
                    onPress={() => router.replace("/(customer)/search")}
                    className="bg-white px-4 py-2 rounded-xl flex-row items-center gap-1 shadow-sm"
                  >
                    <Text className="text-primary font-poppins font-bold text-xs">Discover</Text>
                    <ArrowRight size={11} color="#0B6B3A" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.replace("/(kitchen)/signup")}
                    className="bg-white/15 border border-white/25 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-poppins font-bold text-xs">Register Kitchen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === "values" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Text className="font-poppins font-bold text-dark text-lg text-center mb-1">What we stand for</Text>
            <Text className="font-nunito text-gray text-xs text-center mb-5">
              The core principles behind every kitchen, meal, and ration order on Atleast80.
            </Text>

            <View style={{ gap: 12 }}>
              {values.map((v, i) => {
                const Icon = v.icon
                return (
                  <View
                    key={i}
                    className="flex-row gap-4 bg-white rounded-2xl p-4 border border-gray-light/35 shadow-sm"
                  >
                    <View
                      style={{ backgroundColor: v.bg, width: 44, height: 44, borderRadius: 12 }}
                      className="items-center justify-center shrink-0"
                    >
                      <Icon size={20} color={v.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-poppins font-bold text-dark text-sm">{v.title}</Text>
                      <Text className="font-nunito text-gray text-xs mt-1 leading-relaxed">{v.desc}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {activeTab === "contact" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {/* Stats Dashboard */}
            <LinearGradient
              colors={["#0C4240", "#135E39"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                padding: 20,
                marginBottom: 20,
                shadowColor: "#0C4240",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", opacity: 0.9 }}>
                Our Impact
              </Text>
              <Text style={{ color: "#C5A85A", fontSize: 11, fontFamily: "Nunito", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                {"Empowering India's Home Cooks"}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20, gap: 20 }}>
                {/* Big Circle Stats */}
                <View style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 2,
                  borderColor: "#C5A85A",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 22, fontFamily: "Poppins", fontWeight: "bold" }}>50K+</Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontFamily: "Nunito", fontWeight: "bold" }}>CUSTOMERS</Text>
                </View>

                {/* Sub-Stats List on Right */}
                <View style={{ flex: 1, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ChefHat size={14} color="#C5A85A" />
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito", fontWeight: "bold" }}>
                      500+ <Text style={{ fontWeight: "normal", opacity: 0.8 }}>Home Kitchens</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MapPin size={14} color="#C5A85A" />
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito", fontWeight: "bold" }}>
                      25+ <Text style={{ fontWeight: "normal", opacity: 0.8 }}>Cities Active</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={14} color="#C5A85A" />
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontFamily: "Nunito", fontWeight: "bold" }}>
                      80%+ <Text style={{ fontWeight: "normal", opacity: 0.8 }}>Hygiene Verified</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Quick Actions Row */}
            <View className="bg-white rounded-2xl border border-gray-light/35 p-5 mb-5 shadow-sm">
              <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", textAlign: "center" }}>
                Get in Touch
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", marginTop: 2, marginBottom: 16 }}>
                Have questions or want to partner? Connect with us instantly.
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
                {/* Call Button */}
                <TouchableOpacity onPress={handleCall} activeOpacity={0.8} style={{ alignItems: "center" }}>
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#EAF7EE",
                    borderColor: "#C8E6C9",
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Phone size={20} color="#0B6B3A" />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", marginTop: 8 }}>Call Us</Text>
                  <Text style={{ fontSize: 8, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }} numberOfLines={1}>{supportPhone}</Text>
                </TouchableOpacity>

                {/* Email Button */}
                <TouchableOpacity onPress={handleEmail} activeOpacity={0.8} style={{ alignItems: "center", maxWidth: 120 }}>
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#EFF6FF",
                    borderColor: "#BFDBFE",
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Mail size={20} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", marginTop: 8 }}>Email Us</Text>
                  <Text style={{ fontSize: 8, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }} numberOfLines={1}>{supportEmail}</Text>
                </TouchableOpacity>

                {/* Map Button */}
                <TouchableOpacity onPress={handleMap} activeOpacity={0.8} style={{ alignItems: "center", maxWidth: 100 }}>
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#FFFBEB",
                    borderColor: "#FDE68A",
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <MapPin size={20} color="#D97706" />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "#1F1F1F", marginTop: 8 }}>Locate Us</Text>
                  <Text style={{ fontSize: 8, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }} numberOfLines={1}>{supportAddress}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom grocery image banner */}
            <View className="relative h-32 rounded-2xl overflow-hidden shadow-sm">
              <Image
                source={require("../../../../assets/images/newgrocery.jpg")}
                style={{ width: "100%", height: "100%", borderRadius: 20 }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
