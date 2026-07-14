import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as DocumentPicker from "expo-document-picker"
import {
  MessageSquare,
  FileText,
  Upload,
  Trash2,
  Phone,
  RefreshCw,
  X,
  FileUp,
  ExternalLink,
  CheckCircle
} from "lucide-react-native"
import { api, uploadQuotation } from "../../../lib/api"
import { resolveMediaUrl } from "../../../lib/media"
import { cn } from "../../../lib/utils"

const MIN_BULK_VALUE = 2000

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function KitchenEnquiriesScreen() {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState("")

  // Form modal state
  const [activeEnquiry, setActiveEnquiry] = useState(null)
  const [quoteAmount, setQuoteAmount] = useState("")
  const [quoteNotes, setQuoteNotes] = useState("")
  const [quoteFile, setQuoteFile] = useState(null)
  const [successModalVisible, setSuccessModalVisible] = useState(false)

  const loadEnquiries = useCallback(async () => {
    setError("")
    try {
      const data = await api("/api/bulk-enquiries/partner", {}, "kitchen")
      setEnquiries(data.enquiries || [])
    } catch (err) {
      console.log("Failed to load enquiries:", err)
      setError(err.message || "Failed to load enquiries")
      setEnquiries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEnquiries()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadEnquiries])

  const handleRefresh = () => {
    setRefreshing(true)
    loadEnquiries()
  }

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      })
      if (!result.canceled && result.assets?.length) {
        setQuoteFile(result.assets[0])
      }
    } catch (err) {
      Alert.alert("File selection error", err.message || "Failed to select file")
    }
  }

  const handleUploadQuotation = async () => {
    if (!activeEnquiry) return
    if (!quoteFile) {
      Alert.alert("Required", "Please select a quotation file (PDF or Image)")
      return
    }
    if (!quoteAmount || Number(quoteAmount) <= 0) {
      Alert.alert("Required", "Please enter a valid quotation amount")
      return
    }

    setUploadingId(activeEnquiry.id)
    try {
      await uploadQuotation(activeEnquiry.id, quoteAmount, quoteNotes, quoteFile)
      setActiveEnquiry(null)
      setQuoteAmount("")
      setQuoteNotes("")
      setQuoteFile(null)
      await loadEnquiries()
      setSuccessModalVisible(true)
    } catch (err) {
      Alert.alert("Upload Failed", err.message || "Failed to upload quotation")
    } finally {
      setUploadingId(null)
    }
  }

  const performDeleteQuotation = async (enquiryId) => {
    setDeletingId(enquiryId)
    try {
      await api(`/api/bulk-enquiries/${enquiryId}/quotation`, { method: "DELETE" }, "kitchen")
      await loadEnquiries(false)
      Alert.alert("Success", "Quotation deleted successfully.")
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to delete quotation")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteQuotation = (enquiryId) => {
    Alert.alert(
      "Delete Quotation?",
      "Are you sure you want to delete this quotation? The enquiry will move back to Pending.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteQuotation(enquiryId),
        },
      ]
    )
  }

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:+91${phone}`).catch(() => {
        Alert.alert("Error", "Unable to place phone call")
      })
    }
  }

  const pending = enquiries.filter((e) => e.status === "pending")
  const quoted = enquiries.filter((e) => e.status === "quoted")

  // State for segment control (Pending vs Quoted)
  const [segment, setSegment] = useState("pending")

  const displayedList = segment === "pending" ? pending : quoted

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-light/35">
        <View className="flex-1 mr-2">
          <Text className="font-poppins font-bold text-lg text-dark flex-row items-center">
            Bulk Enquiries
          </Text>
          <Text className="font-nunito text-xs text-gray" numberOfLines={1}>
            Quotations for custom bulk orders (min ₹{MIN_BULK_VALUE})
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          className="w-10 h-10 bg-cream items-center justify-center rounded-xl border border-gray-light/20"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <RefreshCw size={16} color="#0B6B3A" />
          )}
        </TouchableOpacity>
      </View>

      {/* Segment Selector */}
      <View className="bg-white px-4 py-3 flex-row gap-2 border-b border-gray-light/25">
        <TouchableOpacity
          onPress={() => setSegment("pending")}
          className={cn(
            "flex-1 py-2.5 rounded-xl border items-center justify-center",
            segment === "pending" ? "bg-primary border-primary" : "bg-cream border-gray-light/30"
          )}
        >
          <Text className={cn("font-poppins font-semibold text-xs", segment === "pending" ? "text-white" : "text-gray")}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSegment("quoted")}
          className={cn(
            "flex-1 py-2.5 rounded-xl border items-center justify-center",
            segment === "quoted" ? "bg-primary border-primary" : "bg-cream border-gray-light/30"
          )}
        >
          <Text className={cn("font-poppins font-semibold text-xs", segment === "quoted" ? "text-white" : "text-gray")}>
            Quoted ({quoted.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0B6B3A" />
          <Text className="font-nunito text-xs text-gray mt-2">Loading enquiries...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="font-nunito text-sm text-red-600 text-center">{error}</Text>
          <TouchableOpacity onPress={() => loadEnquiries(true)} className="mt-4 px-4 py-2 bg-primary rounded-xl">
            <Text className="font-poppins font-bold text-xs text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayedList.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <MessageSquare size={42} color="#D8D8D8" className="mb-3" />
          <Text className="font-poppins font-semibold text-dark text-base text-center">
            No enquiries here
          </Text>
          <Text className="font-nunito text-sm text-gray text-center mt-1">
            {segment === "pending"
              ? "You do not have any pending bulk order enquiries."
              : "You have not sent any quotations yet."}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ paddingBottom: 110, gap: 12 }}
        >
          {displayedList.map((enquiry) => (
            <View key={enquiry.id} className="bg-white rounded-2xl border border-gray-light/50 p-4 shadow-sm">
              {/* Header card info */}
              <View className="flex-row justify-between items-start mb-2.5">
                <View>
                  <Text className="font-poppins font-bold text-sm text-dark-light">
                    Customer: {enquiry.customerName || "User"}
                  </Text>
                  <Text className="font-nunito text-[10px] text-gray mt-0.5">
                    Received {formatDate(enquiry.createdAt)}
                  </Text>
                </View>
                {enquiry.customerPhone && (
                  <TouchableOpacity
                    onPress={() => handleCall(enquiry.customerPhone)}
                    className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center"
                  >
                    <Phone size={14} color="#0B6B3A" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Requirement Text */}
              <View className="bg-cream-dark/15 rounded-xl p-3 mb-3 border border-gray-light/20">
                <Text className="font-nunito text-xs text-dark leading-relaxed">
                  {enquiry.message}
                </Text>
              </View>

              {/* Info stats */}
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-poppins text-[10px] text-gray uppercase">Estimated budget</Text>
                <Text className="font-poppins font-bold text-xs text-primary">
                  ₹{enquiry.estimatedValue}
                </Text>
              </View>

              {/* Quoted specific details */}
              {enquiry.status === "quoted" && (
                <View className="border-t border-gray-light/20 pt-3 mb-3 gap-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="font-poppins font-semibold text-xs text-dark">Your quote amount</Text>
                    <Text className="font-poppins font-bold text-sm text-primary">₹{enquiry.quotationAmount}</Text>
                  </View>
                  {enquiry.quotationNotes ? (
                    <Text className="font-nunito text-xs text-gray bg-cream/30 p-2 rounded-xl border border-gray-light/10">
                      Notes: {enquiry.quotationNotes}
                    </Text>
                  ) : null}
                  {enquiry.quotationFile && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(resolveMediaUrl(enquiry.quotationFile))}
                      className="flex-row items-center gap-1.5 py-1"
                    >
                      <FileText size={14} color="#0B6B3A" />
                      <Text className="font-nunito text-xs text-primary font-bold underline flex-1">
                        View Quotation File
                      </Text>
                      <ExternalLink size={12} color="#0B6B3A" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Actions */}
              {enquiry.status === "pending" ? (
                <TouchableOpacity
                  onPress={() => {
                    setQuoteAmount(String(enquiry.estimatedValue))
                    setActiveEnquiry(enquiry)
                  }}
                  className="w-full py-2.5 bg-primary rounded-xl items-center justify-center flex-row gap-1.5"
                >
                  <Upload size={14} color="#FFFFFF" />
                  <Text className="font-poppins font-bold text-xs text-white">Send Quotation</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleDeleteQuotation(enquiry.id)}
                  disabled={deletingId === enquiry.id}
                  className="w-full py-2.5 bg-red-50 border border-red-100 rounded-xl items-center justify-center flex-row gap-1.5"
                >
                  {deletingId === enquiry.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#EF4444" />
                      <Text className="font-poppins font-bold text-xs text-red-600">Delete Quotation</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Quote Submission Modal */}
      {activeEnquiry && (
        <Modal
          visible={Boolean(activeEnquiry)}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveEnquiry(null)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[85%] pb-6">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                <Text className="font-poppins font-bold text-base text-dark">Send Quotation</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveEnquiry(null)
                    setQuoteFile(null)
                    setQuoteAmount("")
                    setQuoteNotes("")
                  }}
                  className="p-1.5 rounded-full bg-cream-dark/50"
                >
                  <X size={18} color="#1F1F1F" />
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView className="px-5 py-4 space-y-4" contentContainerStyle={{ gap: 14 }}>
                {/* customer requirement reference */}
                <View className="bg-cream/40 rounded-xl p-3.5 border border-gray-light/20">
                  <Text className="font-poppins font-bold text-[9px] uppercase text-gray mb-1">
                    Requirements Summary
                  </Text>
                  <Text className="font-nunito text-xs text-dark" numberOfLines={3}>
                    {activeEnquiry.message}
                  </Text>
                  <Text className="font-nunito text-[10px] text-gray mt-2">
                    Est. Budget: <Text className="font-bold text-primary">₹{activeEnquiry.estimatedValue}</Text>
                  </Text>
                </View>

                {/* Quote Amount input */}
                <View>
                  <Text className="font-poppins font-semibold text-xs text-dark mb-1.5">
                    Quotation Amount (₹)
                  </Text>
                  <TextInput
                    placeholder="Enter final quote price"
                    value={quoteAmount}
                    onChangeText={setQuoteAmount}
                    keyboardType="numeric"
                    className="w-full bg-cream border border-gray-light/50 rounded-xl px-4 py-3 font-nunito text-sm text-dark"
                  />
                </View>

                {/* Quotation file picker */}
                <View>
                  <Text className="font-poppins font-semibold text-xs text-dark mb-1.5">
                    Quotation File (PDF or Image)
                  </Text>
                  <TouchableOpacity
                    onPress={handleFilePick}
                    className="w-full py-3.5 bg-cream border border-dashed border-primary/45 rounded-xl items-center justify-center flex-row gap-2"
                  >
                    <FileUp size={16} color="#0B6B3A" />
                    <Text className="font-poppins font-semibold text-xs text-primary">
                      {quoteFile ? quoteFile.name : "Choose File"}
                    </Text>
                  </TouchableOpacity>
                  {quoteFile ? (
                    <Text className="font-nunito text-[10px] text-gray mt-1 text-center" numberOfLines={1}>
                      Selected: {quoteFile.name}
                    </Text>
                  ) : null}
                </View>

                {/* Additional Notes */}
                <View>
                  <Text className="font-poppins font-semibold text-xs text-dark mb-1.5">
                    Additional Notes (Optional)
                  </Text>
                  <TextInput
                    placeholder="Describe delivery timeline, special details, etc."
                    value={quoteNotes}
                    onChangeText={setQuoteNotes}
                    multiline
                    numberOfLines={3}
                    style={{ textAlignVertical: "top" }}
                    className="w-full bg-cream border border-gray-light/50 rounded-xl px-4 py-3 font-nunito text-sm text-dark h-24"
                  />
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  onPress={handleUploadQuotation}
                  disabled={uploadingId === activeEnquiry.id}
                  className="w-full py-3 bg-primary rounded-xl items-center justify-center flex-row gap-2 mt-4"
                >
                  {uploadingId === activeEnquiry.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Upload size={16} color="#FFFFFF" />
                      <Text className="font-poppins font-bold text-sm text-white">Send Quote</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {/* Success Quotation Sent Popup */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 items-center w-full max-w-xs shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center mb-4">
              <CheckCircle size={36} color="#059669" />
            </View>
            <Text className="font-poppins font-bold text-lg text-dark text-center mb-2">
              Quotation Sent!
            </Text>
            <Text className="font-nunito text-sm text-gray text-center mb-6 leading-5">
              Your quotation has been sent to the customer successfully. They can now view and download your quote in their chat details.
            </Text>
            <TouchableOpacity
              onPress={() => setSuccessModalVisible(false)}
              className="w-full py-3 bg-primary rounded-xl items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="font-poppins font-bold text-sm text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
