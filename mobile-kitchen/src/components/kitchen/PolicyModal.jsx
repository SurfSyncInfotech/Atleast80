import { useState, useEffect } from "react"
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { X, ShieldCheck, FileText } from "lucide-react-native"
import { api } from "../../lib/api"

const DEFAULT_PRIVACY_SECTIONS = [
  {
    id: "who",
    num: "01",
    title: "Who we are",
    content: "Atleast80 (\"we\", \"us\", \"our\") operates a marketplace connecting customers with verified home kitchens. This policy explains how we handle personal data when you use our website and mobile experience.",
  },
  {
    id: "collect",
    num: "02",
    title: "Information we collect",
    content: "Customers: name, phone number, email, delivery address, order history, and payment-related metadata processed by our payment partners (we do not store full card numbers).\n\nKitchen partners: business and owner details, FSSAI or registration documents, kitchen photos, hygiene videos, menu data, bank or payout details, and communications with our team.\n\nAutomatically: device type, browser, IP address, and usage logs used for security and product improvement.",
  },
  {
    id: "use",
    num: "03",
    title: "How we use your data",
    content: "To process orders, deliver food, verify kitchen hygiene, provide customer support, send transactional messages (order updates, OTPs), improve our platform, and comply with legal obligations.",
  },
  {
    id: "share",
    num: "04",
    title: "Sharing of information",
    content: "We share limited data with kitchen partners (name, phone, delivery address for fulfilment), payment processors, delivery partners where applicable, and authorities when required by law. We do not sell your personal data.",
  },
  {
    id: "hygiene",
    num: "05",
    title: "Hygiene videos",
    content: "Kitchen hygiene videos uploaded by sellers may be displayed to customers on the kitchen's public page to build trust. Videos are stored securely and removed according to our retention rules.",
  },
  {
    id: "retention",
    num: "06",
    title: "Data retention",
    content: "We retain account and order data as long as your account is active and as needed for legal, tax, and dispute-resolution purposes. You may request deletion subject to applicable law.",
  },
  {
    id: "rights",
    num: "07",
    title: "Your rights",
    content: "You may access, correct, or request deletion of your personal data by contacting us. Indian users may have rights under applicable data protection laws.",
  },
  {
    id: "security",
    num: "08",
    title: "Security",
    content: "We use industry-standard measures including encrypted connections (HTTPS), access controls, and secure storage. No method of transmission over the internet is 100% secure.",
  },
  {
    id: "children",
    num: "09",
    title: "Children",
    content: "Our services are not directed at children under 18. We do not knowingly collect data from minors.",
  },
  {
    id: "contact",
    num: "10",
    title: "Contact",
    content: "For privacy questions: contact@elifelo.com · +91 40 3559 4439",
  },
]

const DEFAULT_TERMS_SECTIONS = [
  {
    id: "acceptance",
    num: "01",
    title: "Acceptance",
    content: "By accessing or using Atleast80, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.",
  },
  {
    id: "role",
    num: "02",
    title: "Our role",
    content: "Atleast80 is a technology marketplace that connects customers with independent home kitchens. We are not the seller of food items — kitchens prepare and fulfil orders directly. We facilitate discovery, ordering, payments, and hygiene verification.",
  },
  {
    id: "customers",
    num: "03",
    title: "Customer accounts",
    content: "You must provide accurate contact and delivery information. You are responsible for keeping your login credentials secure. Orders are binding once confirmed.",
  },
  {
    id: "partners",
    num: "04",
    title: "Kitchen partner obligations",
    content: "Partners must maintain valid registrations (including FSSAI where applicable), upload daily hygiene videos, prepare food safely, honour listed prices, and fulfil orders on time. We may suspend or remove kitchens that violate hygiene standards, receive repeated complaints, or breach these terms.",
  },
  {
    id: "orders",
    num: "05",
    title: "Orders, pricing & payments",
    content: "Prices are set by kitchens and displayed at checkout. Taxes and delivery fees may apply. Payments are processed through authorised payment partners. Refunds are handled per our refund policy and individual order circumstances.",
  },
  {
    id: "hygiene",
    num: "06",
    title: "Hygiene & food safety",
    content: "Kitchens agree to follow our Hygiene Guidelines and applicable food safety laws. Customers acknowledge that home-cooked food carries inherent risks and should report concerns promptly.",
  },
  {
    id: "conduct",
    num: "07",
    title: "Prohibited conduct",
    content: "Users may not misuse the platform, post false reviews, circumvent fees, upload misleading media, harass others, or use the service for unlawful purposes.",
  },
  {
    id: "ip",
    num: "08",
    title: "Intellectual property",
    content: "Atleast80 branding, software, and content are owned by us or our licensors. Kitchens grant us a licence to display their menus, images, and hygiene content for platform operation.",
  },
  {
    id: "liability",
    num: "09",
    title: "Limitation of liability",
    content: "To the fullest extent permitted by law, Atleast80 is not liable for indirect, incidental, or consequential damages arising from use of the platform, food quality issues between customers and kitchens, or service interruptions.",
  },
  {
    id: "termination",
    num: "10",
    title: "Termination",
    content: "We may suspend or terminate accounts that violate these terms. You may stop using the service at any time. Provisions that should survive termination will remain in effect.",
  },
  {
    id: "law",
    num: "11",
    title: "Governing law",
    content: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.",
  },
]

export default function PolicyModal({ visible, onClose, type = "privacy" }) {
  const isPrivacy = type === "privacy"
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service"
  const Icon = isPrivacy ? ShieldCheck : FileText
  const defaultSections = isPrivacy ? DEFAULT_PRIVACY_SECTIONS : DEFAULT_TERMS_SECTIONS

  const [sections, setSections] = useState(defaultSections)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true)
    api(`/api/cms/policies/${type}`)
      .then((data) => {
        if (!active) return
        if (Array.isArray(data?.sections) && data.sections.length > 0) {
          setSections(data.sections)
        } else {
          setSections(defaultSections)
        }
      })
      .catch(() => {
        if (active) setSections(defaultSections)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [visible, type])

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF9F6" }} edges={["top"]}>
        {/* Modal Header */}
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
              <Icon size={20} color="#0B6B3A" />
            </View>
            <View>
              <Text className="font-poppins font-bold text-base text-dark">{title}</Text>
              <Text className="font-nunito text-[10px] text-gray uppercase font-semibold">Atleast80 Legal</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
            <X size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator size="small" color="#0B6B3A" />
            <Text className="font-nunito text-xs text-gray mt-2">Loading document...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {sections.map((sec, i) => {
              const paragraphs = typeof sec.content === "string" ? sec.content.split("\n\n") : []
              return (
                <View key={sec.id || i} className="mb-6 pb-6 border-b border-gray-200/60">
                  <View className="flex-row items-start gap-3 mb-2">
                    <Text className="font-poppins font-extrabold text-lg text-primary/30 leading-tight">
                      {sec.num || String(i + 1).padStart(2, "0")}
                    </Text>
                    <Text className="font-poppins font-bold text-base text-dark flex-1">
                      {sec.title}
                    </Text>
                  </View>
                  <View className="pl-8 gap-2">
                    {paragraphs.map((p, pIdx) => (
                      <Text key={pIdx} className="font-nunito text-xs text-gray-700 leading-5">
                        {p}
                      </Text>
                    ))}
                  </View>
                </View>
              )
            })}

            <Text className="font-nunito text-[11px] text-gray text-center mt-4">
              © {new Date().getFullYear()} Atleast80. All rights reserved.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}
