import { useEffect, useState, useCallback, useRef } from "react"
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
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Dimensions,
  Keyboard,
  BackHandler,
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
  CheckCircle,
  Send,
  User
} from "lucide-react-native"
import { api, uploadQuotation } from "../../../lib/api"
import { resolveMediaUrl } from "../../../lib/media"
import { cn } from "../../../lib/utils"
import { useAuth } from "../../../context/AuthContext"
import { useBadges } from "../../../context/BadgeContext"

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

function showAlert(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`)
  } else {
    Alert.alert(title, message)
  }
}

export default function KitchenEnquiriesScreen() {
  const { user } = useAuth()
  const { setEnquiryUnreadCount } = useBadges()
  const { height: SCREEN_HEIGHT } = Dimensions.get("screen")
  const modalSheetHeight = Math.max(480, Math.round((SCREEN_HEIGHT || 700) * 0.85))
  const chatScrollViewRef = useRef(null)
  
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
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Chat state
  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [selectedEnquiryForChat, setSelectedEnquiryForChat] = useState(null)

  useEffect(() => {
    if (!chatModalVisible || !selectedEnquiryForChat?.id) return

    let active = true

    const fetchChatMessages = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/${selectedEnquiryForChat.id}/chat`, {}, "kitchen")
        if (active) {
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to load chat messages:", err)
      }
    }

    fetchChatMessages()
    const interval = setInterval(fetchChatMessages, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [chatModalVisible, selectedEnquiryForChat?.id])

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedEnquiryForChat?.id) return
    const msg = chatInput.trim()
    setChatInput("")
    try {
      const data = await api(`/api/bulk-enquiries/${selectedEnquiryForChat.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      }, "kitchen")
      setChatMessages((prev) => [...prev, data.chatMessage])
    } catch (err) {
      showAlert("Error", err.message || "Failed to send message")
    }
  }

  const handleOpenChat = (enquiry) => {
    setSelectedEnquiryForChat(enquiry)
    setChatModalVisible(true)
  }

  const loadEnquiries = useCallback(async () => {
    setError("")
    try {
      const data = await api("/api/bulk-enquiries/partner", {}, "kitchen")
      const list = data.enquiries || []
      setEnquiries(list)
      // Update badge count: active enquiries and unread chat messages
      const activeCount = list.filter((e) => !["completed", "rejected", "cancelled"].includes(e.status)).length
      const unreadMessages = list.reduce((sum, e) => sum + (e.kitchenUnreadCount || 0), 0)
      const count = Math.max(activeCount, unreadMessages)
      setEnquiryUnreadCount(count)
    } catch (err) {
      console.log("Failed to load enquiries:", err)
      setError(err.message || "Failed to load enquiries")
      setEnquiries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setEnquiryUnreadCount])

  const handleCloseChat = useCallback(() => {
    setChatModalVisible(false)
    loadEnquiries()
  }, [loadEnquiries])

  const closeQuotationModal = useCallback(() => {
    setActiveEnquiry(null)
    setQuoteFile(null)
    setQuoteAmount("")
    setQuoteNotes("")
  }, [])

  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const isKeyboardVisible = useRef(false)

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const showSub = Keyboard.addListener(showEvent, (e) => {
      isKeyboardVisible.current = true
      setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 0)
      if (chatModalVisible) {
        setTimeout(() => {
          chatScrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      isKeyboardVisible.current = false
      setKeyboardHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [chatModalVisible])

  useEffect(() => {
    if (!activeEnquiry && !chatModalVisible) return

    const onBackPress = () => {
      if (isKeyboardVisible.current) {
        Keyboard.dismiss()
        return true
      }
      if (activeEnquiry) {
        closeQuotationModal()
        return true
      }
      if (chatModalVisible) {
        handleCloseChat()
        return true
      }
      return false
    }

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => sub.remove()
  }, [activeEnquiry, chatModalVisible, closeQuotationModal, handleCloseChat])

  useEffect(() => {
    loadEnquiries()
    const interval = setInterval(loadEnquiries, 15000)
    return () => clearInterval(interval)
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
      showAlert("File selection error", err.message || "Failed to select file")
    }
  }

  const handleUploadQuotation = async () => {
    if (!activeEnquiry) return
    if (!quoteAmount || Number(quoteAmount) <= 0) {
      showAlert("Required", "Please enter a valid quotation amount")
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
      showAlert("Upload Failed", err.message || "Failed to upload quotation")
    } finally {
      setUploadingId(null)
    }
  }

  const performDeleteQuotation = async (enquiryId) => {
    setDeletingId(enquiryId)
    try {
      await api(`/api/bulk-enquiries/${enquiryId}/quotation`, { method: "DELETE" }, "kitchen")
      await loadEnquiries(false)
      showAlert("Success", "Quotation deleted successfully.")
    } catch (err) {
      showAlert("Error", err.message || "Failed to delete quotation")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteQuotation = (enquiryId) => {
    setDeleteConfirmId(enquiryId)
  }

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    } else {
      showAlert("Error", "Customer contact number not available")
    }
  }

  const pending = enquiries.filter((e) => e.status === "pending")
  const quoted = enquiries.filter((e) => e.status !== "pending")

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
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-poppins text-[10px] text-gray uppercase">Offered budget</Text>
                <Text className="font-poppins font-bold text-xs text-primary">
                  ₹{enquiry.estimatedValue}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-poppins text-[10px] text-gray uppercase">Number of Guests</Text>
                <Text className="font-poppins font-bold text-xs text-dark-light">
                  {enquiry.peopleCount || 1} {enquiry.peopleCount === 1 ? "Person" : "People"}
                </Text>
              </View>

              {/* Quoted / Accepted / Rejected / Completed specific details */}
              {(enquiry.status === "quoted" || enquiry.status === "accepted" || enquiry.status === "rejected" || enquiry.status === "completed") && (
                <View className="border-t border-gray-light/20 pt-3 mb-3 gap-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-poppins font-semibold text-xs text-dark">Your quote amount</Text>
                      {/* Status Badge */}
                      <View className={cn(
                        "px-2 py-0.5 rounded-lg border",
                        enquiry.status === "quoted" ? "bg-blue-50 border-blue-100" :
                        enquiry.status === "accepted" ? "bg-green-50 border-green-100" :
                        enquiry.status === "completed" ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                      )}>
                        <Text className={cn(
                          "font-poppins font-bold text-[9px] uppercase",
                          enquiry.status === "quoted" ? "text-blue-700" :
                          enquiry.status === "accepted" ? "text-green-700" :
                          enquiry.status === "completed" ? "text-emerald-700" : "text-red-700"
                        )}>
                          {enquiry.status === "completed" ? "paid" : enquiry.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-poppins font-bold text-sm text-primary">₹{enquiry.quotationAmount}</Text>
                  </View>
                  {enquiry.quotationNotes ? (
                    <View className="bg-gray-50 border-l-2 border-primary rounded-r-lg p-2.5 my-1.5">
                      <Text className="font-poppins font-bold text-[9px] text-primary uppercase tracking-wider mb-0.5">Notes</Text>
                      <Text className="font-nunito text-xs text-gray-700 italic">"{enquiry.quotationNotes}"</Text>
                    </View>
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
              ) : enquiry.status === "completed" ? (
                <View className="w-full py-2.5 bg-emerald-550/10 border border-emerald-200 rounded-xl items-center justify-center flex-row gap-1.5 bg-emerald-50">
                  <CheckCircle size={14} color="#0F5132" />
                  <Text className="font-poppins font-bold text-xs text-emerald-800">Order Confirmed</Text>
                </View>
              ) : (
                <View className="flex-row gap-2 w-full">
                  <TouchableOpacity
                    onPress={() => {
                      setQuoteAmount(String(enquiry.quotationAmount || ""))
                      setQuoteNotes(enquiry.quotationNotes || "")
                      setActiveEnquiry(enquiry)
                    }}
                    className="flex-1 py-2.5 bg-primary rounded-xl items-center justify-center flex-row gap-1"
                  >
                    <Upload size={13} color="#FFFFFF" />
                    <Text className="font-poppins font-bold text-xs text-white">Update Quote</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteQuotation(enquiry.id)}
                    disabled={deletingId === enquiry.id}
                    className="flex-1 py-2.5 bg-red-50 border border-red-100 rounded-xl items-center justify-center flex-row gap-1"
                  >
                    {deletingId === enquiry.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Trash2 size={13} color="#EF4444" />
                        <Text className="font-poppins font-bold text-xs text-red-600">Delete Quote</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Last Chat Message Preview & Unread Badge */}
              {(() => {
                const hasNewCustomerMsg = Boolean(
                  enquiry.kitchenUnreadCount > 0 &&
                  enquiry.messageCount > 0 &&
                  enquiry.lastMessageSenderId === enquiry.customerId
                )
                const hasAnyChat = Boolean(enquiry.messageCount > 0 && enquiry.lastMessage)

                return (
                  <>
                    {hasAnyChat && (
                      <View className={cn(
                        "p-3 rounded-xl border mt-3.5",
                        hasNewCustomerMsg
                          ? "bg-green-50 border-green-300 shadow-sm" 
                          : "bg-gray-50 border-gray-150"
                      )}>
                        <View className="flex-row justify-between items-center mb-1">
                          <View className="flex-row items-center gap-1.5">
                            {hasNewCustomerMsg && (
                              <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            )}
                            <Text className={cn(
                              "font-poppins font-bold text-[10px] uppercase tracking-wide",
                              hasNewCustomerMsg ? "text-green-800" : "text-gray-500"
                            )}>
                              {hasNewCustomerMsg 
                                ? `🔴 New Message from Customer (${enquiry.kitchenUnreadCount})` 
                                : enquiry.lastMessageSenderId === enquiry.customerId 
                                ? "Message from Customer" 
                                : "Your last reply"}
                            </Text>
                          </View>
                        </View>
                        {enquiry.lastMessage ? (
                          <Text className="font-nunito text-xs text-gray-800" numberOfLines={2}>
                            "{enquiry.lastMessage}"
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* In-App Chat Option */}
                    <TouchableOpacity
                      onPress={() => handleOpenChat(enquiry)}
                      className={cn(
                        "w-full py-2.5 border rounded-xl items-center justify-center flex-row gap-1.5 mt-2",
                        hasNewCustomerMsg
                          ? "bg-green-700 border-green-700 shadow-sm" 
                          : "bg-cream-dark/15 border-primary/20"
                      )}
                    >
                      <MessageSquare 
                        size={15} 
                        color={hasNewCustomerMsg ? "#FFFFFF" : "#0B6B3A"} 
                      />
                      <Text className={cn(
                        "font-poppins font-bold text-xs",
                        hasNewCustomerMsg ? "text-white" : "text-primary"
                      )}>
                        {hasNewCustomerMsg ? `Chat with Customer (${enquiry.kitchenUnreadCount} New)` : "Chat with Customer"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
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
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (isKeyboardVisible.current) {
              Keyboard.dismiss()
            } else {
              closeQuotationModal()
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
              onPress={closeQuotationModal}
            >
              <Pressable
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  maxHeight: (Platform.OS === "android" && keyboardHeight > 0)
                    ? Math.max(300, SCREEN_HEIGHT - keyboardHeight - 40)
                    : Math.round(SCREEN_HEIGHT * 0.88),
                  width: "100%",
                  overflow: "hidden",
                  marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
                }}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                  <Text className="font-poppins font-bold text-base text-dark">Send Quotation</Text>
                  <TouchableOpacity
                    onPress={closeQuotationModal}
                    className="p-1.5 rounded-full bg-cream-dark/50"
                  >
                    <X size={18} color="#1F1F1F" />
                  </TouchableOpacity>
                </View>

                {/* Form Content */}
                <ScrollView
                  className="px-5 py-4 space-y-4"
                  contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
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
                      Quotation Amount (₹) <Text className="text-accent">*</Text>
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
                      Quotation File (PDF or Image, Optional)
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
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
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

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl items-center">
            <Text className="font-poppins font-bold text-lg text-dark mb-2 text-center">
              Delete Quotation?
            </Text>
            <Text className="font-nunito text-sm text-gray mb-6 leading-5 text-center">
              Are you sure you want to delete this quotation? The enquiry will move back to Pending.
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center justify-center"
              >
                <Text className="font-poppins font-bold text-sm text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const id = deleteConfirmId
                  setDeleteConfirmId(null)
                  performDeleteQuotation(id)
                }}
                className="flex-1 py-3 bg-red-500 rounded-xl items-center justify-center"
              >
                <Text className="font-poppins font-bold text-sm text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* In-App Chat Modal */}
      <Modal
        visible={chatModalVisible}
        transparent
        statusBarTranslucent={true}
        animationType="slide"
        onRequestClose={() => {
          if (isKeyboardVisible.current) {
            Keyboard.dismiss()
          } else {
            handleCloseChat()
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Pressable 
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            onPress={handleCloseChat}
          >
            <Pressable 
              style={{ 
                backgroundColor: "#FFFFFF", 
                borderTopLeftRadius: 28, 
                borderTopRightRadius: 28, 
                height: modalSheetHeight,
                maxHeight: "88%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                justifyContent: "space-between", 
                paddingHorizontal: 20, 
                paddingVertical: 16, 
                borderBottomWidth: 1, 
                borderBottomColor: "#F1F1EF" 
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" }}>
                    <User size={20} color="#0B6B3A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }} numberOfLines={1}>
                      Customer: {selectedEnquiryForChat?.customerName || "User"}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#8A8A8A" }}>
                      Enquiry Chat #{selectedEnquiryForChat?.id}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCloseChat} style={{ padding: 4 }}>
                  <X size={20} color="#7A7A7A" />
                </TouchableOpacity>
              </View>

              {/* Message History */}
              <ScrollView 
                ref={chatScrollViewRef}
                style={{ flex: 1, backgroundColor: "#ECE5DD" }}
                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                contentContainerStyle={{ padding: 16, gap: 12, backgroundColor: "#ECE5DD", flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {chatMessages.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#8A8A8A", textAlign: "center" }}>
                      No messages yet. Reply to the customer's enquiry to start the discussion!
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id
                    const msgDate = new Date(msg.created_at)
                    const timeStr = isNaN(msgDate.getTime()) ? "" : msgDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    
                    return (
                      <View 
                        key={msg.id} 
                        style={{ 
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "75%",
                          backgroundColor: isMe ? "#DCF8C6" : "#FFFFFF",
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderBottomRightRadius: isMe ? 2 : 12,
                          borderBottomLeftRadius: isMe ? 12 : 2,
                          shadowColor: "#000000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.12,
                          shadowRadius: 1,
                          elevation: 1,
                        }}
                      >
                        {!isMe && (
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0B6B3A", fontFamily: "Poppins", marginBottom: 2 }}>
                            {msg.sender_name} ({msg.sender_role})
                          </Text>
                        )}
                        <Text style={{ fontSize: 13, color: "#303030", fontFamily: "Nunito" }}>
                          {msg.message}
                        </Text>
                        {timeStr ? (
                          <Text style={{ fontSize: 9, color: "#8A8A8A", fontFamily: "Nunito", alignSelf: "flex-end", marginTop: 4 }}>
                            {timeStr}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })
                )}
              </ScrollView>

              {/* Input Footer */}
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                paddingHorizontal: 16, 
                paddingTop: 12,
                paddingBottom: 12 + (Platform.OS === "android" ? keyboardHeight : 0),
                borderTopWidth: 1, 
                borderTopColor: "#F1F1EF", 
                backgroundColor: "#FFFFFF",
                gap: 10
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "#F7F7F5",
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontFamily: "Nunito",
                    color: "#1F1F1F",
                    maxHeight: 100,
                  }}
                  multiline
                  placeholder="Type a message..."
                  placeholderTextColor="#7A7A7A"
                  value={chatInput}
                  onChangeText={setChatInput}
                />
                <TouchableOpacity 
                  onPress={handleSendChatMessage}
                  disabled={!chatInput.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: chatInput.trim() ? "#0B6B3A" : "#E8E8E8",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
