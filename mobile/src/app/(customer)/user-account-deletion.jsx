import { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ArrowLeft, Mail, Trash2, ShieldCheck, Clock } from "lucide-react-native"
import { getContactSettings } from "../../lib/api"

const FALLBACK_DELETION_EMAIL = "liveatleast80@gmail.com"

const STEPS = [
  {
    title: "Send a deletion request",
    content: (email) => `Email ${email} from the address registered on your Atleast80 account. Use the subject “Account deletion request”.`,
  },
  {
    title: "Include your account details",
    content: "Add your full name and the phone number linked to the account so we can match the request to the right profile.",
  },
  {
    title: "We confirm and delete",
    content: "After we verify the request, we delete the account and associated personal data. You will get a confirmation at the same email address.",
  },
]

export default function UserAccountDeletionScreen() {
  const router = useRouter()
  const [deletionEmail, setDeletionEmail] = useState(FALLBACK_DELETION_EMAIL)

  useEffect(() => {
    getContactSettings()
      .then((data) => {
        if (data?.accountDeletionEmail) setDeletionEmail(data.accountDeletionEmail)
      })
      .catch(() => {})
  }, [])

  const openMail = () => {
    const body = [
      "Please delete my Atleast80 account.",
      "",
      "Name:",
      "Phone:",
      "Registered email:",
    ].join("\n")
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: deletionEmail,
      su: "Account deletion request",
      body,
    })
    Linking.openURL(`https://mail.google.com/mail/?${params.toString()}`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F4EF" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>Delete account</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={openMail} activeOpacity={0.8}>
          <Text style={{ fontSize: 24, fontFamily: "Poppins", fontWeight: "bold", color: "#0C4240", lineHeight: 32, textDecorationLine: "underline" }}>
            Delete your Atleast80 account
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontFamily: "Nunito", color: "#4B5563", marginTop: 10, lineHeight: 22 }}>
          You can request deletion of your user account at any time. Email {deletionEmail} and we will remove your account and personal data.
        </Text>

        <TouchableOpacity
          onPress={openMail}
          activeOpacity={0.85}
          style={{ marginTop: 20, backgroundColor: "#0A1F13", borderRadius: 20, padding: 18, flexDirection: "row", gap: 14, alignItems: "center" }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Mail size={20} color="#F5C451" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: "Poppins", fontWeight: "bold", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
              Request account deletion
            </Text>
            <Text style={{ fontSize: 15, fontFamily: "Poppins", fontWeight: "bold", color: "#FFFFFF", marginTop: 4 }}>{deletionEmail}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ marginTop: 24, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#F0F0F0" }}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={{ marginBottom: index === STEPS.length - 1 ? 0 : 18 }}>
              <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>{`${index + 1}. ${step.title}`}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 6, lineHeight: 20 }}>
                {typeof step.content === "function" ? step.content(deletionEmail) : step.content}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#F0F0F0", flexDirection: "row", gap: 12 }}>
          <Trash2 size={18} color="#0B6B3A" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>What we delete</Text>
            <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 6, lineHeight: 20 }}>
              Your profile, login, phone number, email, saved delivery address, and other personal details tied to the account.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#F0F0F0", flexDirection: "row", gap: 12 }}>
          <ShieldCheck size={18} color="#0B6B3A" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins", fontWeight: "bold", color: "#1F2937" }}>What we may keep</Text>
            <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#4B5563", marginTop: 6, lineHeight: 20 }}>
              Order and payment records required for tax, fraud prevention, or legal obligations may be retained in limited form, then deleted when that period ends.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <Clock size={16} color="#0B6B3A" />
          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Nunito", color: "#4B5563", lineHeight: 20 }}>
            Deletion requests are processed within 7 business days.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
