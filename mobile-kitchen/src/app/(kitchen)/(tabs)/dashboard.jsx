import { useEffect, useState, useRef } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image, Alert, Platform, Modal, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import {
  Clock, CheckCircle, XCircle, RefreshCw, Star, ShoppingBag, ChefHat,
  Circle, FileCheck, Shield, Sparkles, UtensilsCrossed, ChevronRight,
  PlusCircle, Bell, LogOut, Image as ImageIcon, IndianRupee, Video, Trash2, AlertTriangle, Play, MessageSquare, Mail, Phone, X, ShieldCheck, FileText
} from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as DocumentPicker from "expo-document-picker"
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera"
import { useVideoPlayer, VideoView } from "expo-video"
import KitchenHomeImageSection from "../../../components/kitchen/KitchenHomeImageSection"
import HygieneUploadSection from "../../../components/kitchen/HygieneUploadSection"
import KitchenStoryModal from "../../../components/kitchen/KitchenStoryModal"
import StoryViewerModal from "../../../components/kitchen/StoryViewerModal"
import PayoutSettingsSection from "../../../components/kitchen/PayoutSettingsSection"
import FestivalSpecialsSection from "../../../components/kitchen/FestivalSpecialsSection"
import PolicyModal from "../../../components/kitchen/PolicyModal"
import { useAuth } from "../../../context/AuthContext"
import { useBadges } from "../../../context/BadgeContext"
import { api, uploadKitchenCover, uploadHygieneVideo, deleteHygieneVideo } from "../../../lib/api"
import { cn } from "../../../lib/utils"
import { resolveMediaUrl } from "../../../lib/media"


const kitchenTypeLabel = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }
const HYGIENE_WINDOW_MS = 24 * 60 * 60 * 1000
const HYGIENE_EXPIRED_PROMPT =
  "Your daily hygiene video has completed 24 hours. Record and upload today's daily hygiene video to stay visible to customers."

const onboardingSteps = [
  { key: "register", label: "Application submitted" },
  { key: "hygiene", label: "Upload hygiene proof" },
  { key: "review", label: "Admin review" },
  { key: "approved", label: "Go live on Atleast80" },
]

function Detail({ label, value }) {
  return (
    <View className="mb-4">
      <Text className="font-nunito text-[10px] text-gray uppercase">{label}</Text>
      {typeof value === "string" ? (
        <Text className="font-nunito text-sm text-dark mt-0.5">{value || "—"}</Text>
      ) : (
        <View className="mt-1">{value}</View>
      )}
    </View>
  )
}

function DailyVideoPlayer({ videoUrl }) {
  const player = useVideoPlayer(videoUrl, (playerInstance) => {
    playerInstance.loop = false
  })
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 8 }}
      resizeMode="contain"
    />
  )
}

function isFreshHygieneVideo(video, now = Date.now()) {
  if (!video?.mediaUrl || !video?.recordedAt) return false
  const recordedAt = new Date(video.recordedAt).getTime()
  if (Number.isNaN(recordedAt)) return false
  return now - recordedAt < HYGIENE_WINDOW_MS
}

function getDashboardHygieneStatus(status, now = Date.now()) {
  if (!status) return null
  const videoStatus = status.video?.status || status.status

  if (videoStatus === "rejected") {
    return {
      ...status,
      compliant: false,
      uploaded: false,
      requiresUpload: true,
      uploadMessage: status.uploadMessage || "Daily video rejected by Admin. Please re-upload a clear video.",
      video: null,
    }
  }

  if (isFreshHygieneVideo(status.video, now)) return status

  return {
    ...status,
    compliant: false,
    uploaded: false,
    requiresUpload: true,
    uploadMessage: status.uploadMessage || HYGIENE_EXPIRED_PROMPT,
    video: null,
  }
}

export default function KitchenDashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { kitchen, refreshKitchen, logout } = useAuth()
  const { setOrderActiveCount, enquiryUnreadCount, setEnquiryUnreadCount } = useBadges()
  const [refreshing, setRefreshing] = useState(false)
  const [menuCount, setMenuCount] = useState(null)
  const [hygieneCount, setHygieneCount] = useState(0)

  // New interactive states
  const [stories, setStories] = useState([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [storyModalVisible, setStoryModalVisible] = useState(false)
  const [viewerModalVisible, setViewerModalVisible] = useState(false)
  const [policyType, setPolicyType] = useState(null)

  // Daily hygiene & order stats states
  const [hygieneStatus, setHygieneStatus] = useState(null)
  const [hygieneClock, setHygieneClock] = useState(0)
  const [loadingHygiene, setLoadingHygiene] = useState(false)
  const [uploadingHygiene, setUploadingHygiene] = useState(false)
  const [deletingHygiene, setDeletingHygiene] = useState(false)
  const [hygieneError, setHygieneError] = useState("")
  const [orderStats, setOrderStats] = useState({ todayOrders: 0, todayRevenue: 0, activeOrders: 0 })

  // Camera recorder states and refs
  const [cameraModalVisible, setCameraModalVisible] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const cameraRef = useRef(null)
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [micPermission, requestMicPermission] = useMicrophonePermissions()

  // Alerts states & handlers
  const [alerts, setAlerts] = useState([])
  const [alertsModalVisible, setAlertsModalVisible] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)

  // Payouts states
  const [payoutsModalVisible, setPayoutsModalVisible] = useState(false)
  const [payoutsList, setPayoutsList] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)

  const handleOpenPayoutsModal = async () => {
    setPayoutsModalVisible(true)
    setPayoutsLoading(true)
    try {
      const data = await api("/api/kitchens/me/payouts")
      setPayoutsList(data.payouts || [])
    } catch (err) {
      console.log("Failed to load payouts:", err)
    } finally {
      setPayoutsLoading(false)
    }
  }

  const loadAlerts = async (showLoader = false) => {
    try {
      if (showLoader) {
        setAlertsLoading(true)
      }
      const data = await api("/api/alerts")
      setAlerts(data.alerts || [])
    } catch (err) {
      console.log("Failed to load alerts:", err)
    } finally {
      if (showLoader) {
        setAlertsLoading(false)
      }
    }
  }

  const handleDismissAlert = async (alertId) => {
    try {
      await api(`/api/alerts/${alertId}/dismiss`, { method: "POST" })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    } catch (err) {
      console.log("Failed to dismiss alert:", err)
    }
  }

  const loadMenuCount = () => {
    if (kitchen?.status === "approved") {
      api("/api/menu/me")
        .then((d) => setMenuCount(d.items?.length || 0))
        .catch(() => setMenuCount(0))
    }
  }

  const loadStories = async () => {
    if (kitchen?.status === "approved") {
      try {
        const data = await api("/api/stories/me")
        setStories(data.stories || [])
      } catch (err) {
        console.log("Failed to load stories:", err)
      }
    }
  }

  const loadHygieneStatus = async () => {
    if (kitchen?.status !== "approved") return
    setLoadingHygiene(true)
    setHygieneError("")
    try {
      const data = await api("/api/hygiene/me/status")
      setHygieneClock(Date.now())
      setHygieneStatus(data)
    } catch (err) {
      console.log("Failed to load hygiene status:", err)
      setHygieneError(err.message || "Failed to load hygiene status")
    } finally {
      setLoadingHygiene(false)
    }
  }

  const loadOrderStats = async () => {
    if (kitchen?.status !== "approved") return
    try {
      const stats = await api("/api/orders/kitchen/stats")
      setOrderStats(stats)
      // Sync active order count to badge context for nav tab
      setOrderActiveCount(stats.activeOrders || 0)
    } catch (err) {
      console.log("Failed to load order stats:", err)
    }
  }

  const loadEnquiryUnread = async () => {
    if (kitchen?.status !== "approved") return
    try {
      const data = await api("/api/bulk-enquiries/partner", {}, "kitchen")
      const list = data.enquiries || []
      const unread = list.reduce((sum, e) => {
        if (e.kitchenUnreadCount > 0 && e.messageCount > 0 && e.lastMessageSenderId === e.customerId) {
          return sum + e.kitchenUnreadCount
        }
        return sum
      }, 0)
      setEnquiryUnreadCount(unread)
    } catch (err) {
      // silent fail — badge just stays as last known value
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshKitchen().catch(() => { })
      loadStories().catch(() => { })
      loadHygieneStatus().catch(() => { })
      loadOrderStats().catch(() => { })
      loadAlerts(true).catch(() => { })
      loadEnquiryUnread().catch(() => { })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMenuCount()
      loadStories()
      loadHygieneStatus()
      loadOrderStats()
      loadAlerts(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [kitchen?.status])

  useEffect(() => {
    if (kitchen?.status !== "approved") return

    const interval = setInterval(() => {
      loadAlerts(false)
      loadOrderStats()
      loadEnquiryUnread()
    }, 15000)

    return () => clearInterval(interval)
  }, [kitchen?.status])

  useEffect(() => {
    if (kitchen?.status !== "approved") return

    const interval = setInterval(() => {
      setHygieneClock(Date.now())
      loadHygieneStatus()
    }, 60000)

    return () => clearInterval(interval)
  }, [kitchen?.status])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshKitchen()
      loadMenuCount()
      await loadStories()
      await loadHygieneStatus()
      await loadOrderStats()
      await loadAlerts()
    } catch (err) {
      console.log(err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleHygieneVideoPick = () => {
    setCameraModalVisible(true)
  }

  // Effect to manage recording timer
  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            handleStopRecording()
            return 60
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const handleStartRecording = async () => {
    setRecordingDuration(0)
    setIsRecording(true)
    setHygieneError("")

    if (Platform.OS === "web") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" })
        mediaRecorderRef.current = mediaRecorder

        const chunks = []
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "video/webm" })
          const file = new File([blob], `hygiene_video_${Date.now()}.webm`, { type: "video/webm" })

          setUploadingHygiene(true)
          try {
            await uploadHygieneVideo({
              uri: URL.createObjectURL(blob),
              name: file.name,
              type: file.type,
              file: file,
            })
            await loadHygieneStatus()
            Alert.alert("Success", "Daily hygiene video recorded and uploaded successfully!")
            setCameraModalVisible(false)
          } catch (err) {
            setHygieneError(err.message || "Failed to upload video")
            Alert.alert("Upload Failed", err.message || "Failed to upload video")
          } finally {
            setUploadingHygiene(false)
          }

          stream.getTracks().forEach((track) => track.stop())
        }

        mediaRecorder.start()
      } catch (err) {
        setIsRecording(false)
        Alert.alert("Camera Error", "Failed to access camera: " + err.message)
      }
    } else {
      if (cameraRef.current) {
        try {
          const recordPromise = cameraRef.current.recordAsync({
            maxDuration: 60,
            quality: "720p",
          })

          recordPromise.then(async (result) => {
            if (result && result.uri) {
              setUploadingHygiene(true)
              try {
                const videoFile = {
                  uri: result.uri,
                  name: `hygiene_video_${Date.now()}.mp4`,
                  type: "video/mp4",
                }
                await uploadHygieneVideo(videoFile)
                await loadHygieneStatus()
                Alert.alert("Success", "Daily hygiene video recorded and uploaded successfully!")
                setCameraModalVisible(false)
              } catch (err) {
                setHygieneError(err.message || "Failed to upload video")
                Alert.alert("Upload Failed", err.message || "Failed to upload hygiene video")
              } finally {
                setUploadingHygiene(false)
              }
            }
          }).catch((err) => {
            console.error("Recording promise error:", err)
          })
        } catch (err) {
          setIsRecording(false)
          Alert.alert("Camera Error", "Failed to start recording: " + err.message)
        }
      }
    }
  }

  const handleStopRecording = async () => {
    setIsRecording(false)
    if (Platform.OS === "web") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    } else {
      if (cameraRef.current) {
        await cameraRef.current.stopRecording()
      }
    }
  }

  const handleCloseCameraModal = () => {
    if (isRecording) {
      handleStopRecording()
    }
    setCameraModalVisible(false)
  }

  const handleHygieneVideoDelete = () => {
    const doDelete = async () => {
      setDeletingHygiene(true)
      setHygieneError("")
      try {
        await deleteHygieneVideo()
        await loadHygieneStatus()
        if (Platform.OS === "web") {
          window.alert("Daily hygiene video removed successfully.")
        } else {
          Alert.alert("Deleted", "Daily hygiene video removed successfully.")
        }
      } catch (err) {
        setHygieneError(err.message || "Failed to delete video")
        if (Platform.OS === "web") {
          window.alert(err.message || "Failed to delete video")
        } else {
          Alert.alert("Error", err.message || "Failed to delete video")
        }
      } finally {
        setDeletingHygiene(false)
      }
    }

    if (Platform.OS === "web") {
      if (window.confirm("Delete your current daily hygiene video?")) {
        doDelete()
      }
    } else {
      Alert.alert("Delete daily video?", "This will remove your daily hygiene video compliance status.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ])
    }
  }


  const handleLogout = () => {
    const performLogout = () => {
      logout()
        .then(() => {
          router.replace("/(kitchen)/login")
        })
        .catch((err) => {
          console.log("Logout failed:", err)
        })
    }

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) {
        performLogout()
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: performLogout,
        },
      ])
    }
  }

  const handleCoverPick = async () => {
    setUploadingCover(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets?.length) {
        await uploadKitchenCover(result.assets[0])
        await refreshKitchen()
        Alert.alert("Success", "Home card image uploaded successfully!")
      }
    } catch (err) {
      Alert.alert("Upload Failed", err.message || "Failed to upload cover image")
    } finally {
      setUploadingCover(false)
    }
  }

  const [resubmitting, setResubmitting] = useState(false)

  const handleResubmit = async () => {
    if (!hasHomeImage || !hasCookingPhotos) {
      Alert.alert(
        "Photos Required",
        "Please upload your home card image and at least 2 cooking area setup photos below before re-submitting."
      )
      return
    }
    setResubmitting(true)
    try {
      await api("/api/kitchens/me/resubmit", { method: "POST" })
      await refreshKitchen()
      Alert.alert("Success", "Your application has been re-submitted for Admin review!")
    } catch (err) {
      Alert.alert("Re-submission Failed", err.message || "Failed to re-submit application")
    } finally {
      setResubmitting(false)
    }
  }

  const firstName = kitchen?.owner_name?.split(" ")[0] || "Partner"
  const status = kitchen?.status || "pending"
  const isApproved = status === "approved"
  const isPending = status === "pending"
  const isRejected = status === "rejected"
  const hasHomeImage = Boolean(kitchen?.cover_image || kitchen?.cover)
  const hasCookingPhotos = (kitchen?.kitchenImages?.length || 0) >= 2
  const dashboardHygieneStatus = getDashboardHygieneStatus(hygieneStatus, hygieneClock)

  const currentStep = isApproved
    ? 4
    : isRejected
      ? 3
      : isPending && hasHomeImage && hasCookingPhotos
        ? 3
        : 2

  const logoUrl = resolveMediaUrl(kitchen?.logo || kitchen?.image)
  const initial = kitchen?.name?.[0]?.toUpperCase() || "K"
  const hasActiveStories = stories.length > 0
  const menuActive = isApproved && (menuCount ?? 0) > 0

  const handleAvatarPress = () => {
    if (hasActiveStories) {
      setViewerModalVisible(true)
    } else {
      Alert.alert(
        kitchen?.name || "Kitchen Partner",
        isApproved
          ? "Upload stories from the 'Add story' button to show them to your customers."
          : "Your kitchen is currently pending approval. Complete your checklist below."
      )
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Interactive Web-Equivalent Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-light/30">
        {/* Left Side: Avatar/Ring & Kitchen Details */}
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <TouchableOpacity
            onPress={handleAvatarPress}
            activeOpacity={0.85}
            className="relative"
          >
            {hasActiveStories ? (
              <LinearGradient
                colors={["#F4C400", "#FF6B00", "#0B6B3A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 9999,
                  width: 46,
                  height: 46,
                  padding: 2.5,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-primary/10 items-center justify-center">
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <Text className="font-poppins font-bold text-primary text-sm">{initial}</Text>
                  )}
                </View>
              </LinearGradient>
            ) : (
              <View
                style={{ width: 42, height: 42 }}
                className="rounded-full overflow-hidden border border-primary/15 bg-primary/10 items-center justify-center"
              >
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Text className="font-poppins font-bold text-primary text-sm">{initial}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="font-poppins font-bold text-[15px] text-dark" numberOfLines={1}>
              {kitchen?.name || "Kitchen"}
            </Text>
            <Text className="font-nunito text-[10px] text-gray mt-0.5" numberOfLines={1}>
              {kitchen?.city ? `${kitchen.city}, ${kitchen.state}` : "Update details"}
            </Text>
          </View>
        </View>

        {/* Right Side: Quick Action Row */}
        <View className="flex-row items-center gap-2 shrink-0">
          {/* Home Image Uploader */}
          <TouchableOpacity
            onPress={handleCoverPick}
            disabled={uploadingCover}
            style={{ width: 36, height: 36 }}
            className="rounded-full bg-cream-dark/60 items-center justify-center border border-gray-light/25"
            activeOpacity={0.7}
          >
            {uploadingCover ? (
              <ActivityIndicator size="small" color="#0B6B3A" />
            ) : (
              <ImageIcon size={18} color="#0B6B3A" />
            )}
          </TouchableOpacity>

          {/* Add Story */}
          {isApproved && (
            <TouchableOpacity
              onPress={() => setStoryModalVisible(true)}
              style={{ width: 36, height: 36 }}
              className="rounded-full bg-cream-dark/60 items-center justify-center border border-gray-light/25"
              activeOpacity={0.7}
            >
              <PlusCircle size={18} color="#0B6B3A" />
            </TouchableOpacity>
          )}

          {/* Alerts */}
          <TouchableOpacity
            onPress={() => {
              loadAlerts()
              setAlertsModalVisible(true)
            }}
            style={{ width: 36, height: 36 }}
            className="rounded-full bg-cream-dark/60 items-center justify-center border border-gray-light/25 relative"
            activeOpacity={0.7}
          >
            <Bell size={18} color={alerts.length > 0 ? "#0B6B3A" : "#7A7A7A"} />
            {alerts.length > 0 && (
              <View className="absolute top-0.5 right-0.5 bg-red-500 rounded-full w-2 h-2" />
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{ width: 36, height: 36 }}
            className="rounded-full bg-red-50 items-center justify-center border border-red-100"
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(110, insets.bottom + 80) }}
      >
        {/* Welcome */}
        <View className="flex-row items-center justify-between gap-3 mb-4">
          <Text className="font-poppins font-bold text-xl text-dark flex-1" numberOfLines={1}>
            Welcome {firstName}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            className="flex-row items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-gray-light/40"
            activeOpacity={0.75}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0B6B3A" />
            ) : (
              <RefreshCw size={14} color="#1F1F1F" />
            )}
            <Text className="font-poppins font-semibold text-xs text-dark">Refresh</Text>
          </TouchableOpacity>
        </View>

        {isApproved && (
          <FestivalSpecialsSection kitchen={kitchen} onUpdated={refreshKitchen} />
        )}

        {/* Stats — approved */}
        {isApproved ? (
          <View className="flex-row flex-wrap gap-3 mb-5 justify-between">
            {[
              {
                label: "Today's Orders",
                value: String(orderStats.todayOrders || 0),
                icon: ShoppingBag,
                color: "#2563EB",
                iconBg: "bg-blue-50",
              },
              {
                label: "Today's Revenue",
                value: `₹${orderStats.todayRevenue || 0}`,
                icon: IndianRupee,
                color: "#10B981",
                iconBg: "bg-emerald-50",
              },
              {
                label: "Total Revenue",
                value: `₹${orderStats.totalRevenue || 0}`,
                icon: Sparkles,
                color: "#7C3AED",
                iconBg: "bg-purple-50",
              },
              {
                label: "Rating",
                value: kitchen?.rating ? Number(kitchen.rating).toFixed(1) : "—",
                icon: Star,
                color: "#F59E0B",
                iconBg: "bg-amber-50",
              },
              {
                label: "Menu Items",
                value: menuCount ?? "—",
                icon: UtensilsCrossed,
                color: "#0B6B3A",
                iconBg: "bg-emerald-50",
              },
            ].map((m, i) => {
              const IconComp = m.icon
              return (
                <View
                  key={i}
                  style={{
                    width: "47%",
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E8E8E8",
                  }}
                  className="shadow-sm mb-1"
                >
                  <View className="flex-row items-center justify-between mb-3.5">
                    <View className={cn("w-9 h-9 rounded-xl items-center justify-center", m.iconBg)}>
                      <IconComp size={18} color={m.color} />
                    </View>
                    <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  </View>
                  <Text className="font-poppins font-bold text-xl text-dark" style={{ lineHeight: 24 }}>
                    {m.value}
                  </Text>
                  <Text className="font-nunito text-[10px] text-gray font-bold uppercase mt-1 tracking-wider">
                    {m.label}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}

        {/* Onboarding progress tracker */}
        {!isApproved ? (
          <View className="bg-white rounded-2xl border border-gray-light/35 p-4 mb-4">
            <Text className="font-poppins font-semibold text-sm text-dark mb-4">Application Progress</Text>
            <View className="space-y-4">
              {onboardingSteps.map((step, i) => {
                const done = i + 1 < currentStep
                const active = i + 1 === currentStep
                return (
                  <View key={step.key} className="flex-row items-center gap-3">
                    <View
                      className={cn(
                        "w-8 h-8 rounded-full items-center justify-center border",
                        done && "bg-primary border-primary",
                        active && !isRejected && "border-primary bg-primary/10",
                        active && isRejected && "border-red-500 bg-red-50",
                        !done && !active && "border-gray-light bg-white"
                      )}
                    >
                      {done ? (
                        <CheckCircle size={15} color="#FFFFFF" />
                      ) : active && isRejected ? (
                        <XCircle size={15} color="#EF4444" />
                      ) : active ? (
                        <Clock size={15} color="#0B6B3A" />
                      ) : (
                        <Circle size={12} color="#7A7A7A" />
                      )}
                    </View>
                    <Text
                      className={cn(
                        "font-nunito text-xs",
                        active ? "text-dark font-semibold" : "text-gray"
                      )}
                    >
                      {step.label}
                    </Text>
                  </View>
                )
              })}
            </View>

            {isPending ? (
              <View className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
                <Text className="font-nunito text-xs text-amber-800 leading-5">
                  {!hasHomeImage && !hasCookingPhotos
                    ? "Upload your home card image and at least 2 cooking area setup photos below to submit your application for Admin approval."
                    : !hasHomeImage
                      ? "Upload your kitchen home card image below to complete your application."
                      : !hasCookingPhotos
                        ? "Upload at least 2 cooking area setup photos below for Admin approval."
                        : "Your application, home card image, and cooking area setup photos have been submitted. Admin will review your kitchen for approval soon."}
                </Text>
              </View>
            ) : null}

            {isRejected ? (
              <View className="mt-4 bg-red-50 rounded-xl p-4 border border-red-200">
                <Text className="font-poppins font-bold text-xs text-red-800 uppercase tracking-wide">
                  Application Needs Changes
                </Text>
                <Text className="font-nunito text-xs text-red-700 leading-5 mt-1">
                  <Text className="font-bold">Reason from Admin: </Text>
                  {kitchen?.rejection_reason || "Please update your home card image or cooking area setup photos below."}
                </Text>
                <Text className="font-nunito text-[11px] text-gray-700 mt-2">
                  👉 Update your Home image or Cooking area setup photos below, then tap Re-Submit Application.
                </Text>
                <TouchableOpacity
                  onPress={handleResubmit}
                  disabled={resubmitting || !hasHomeImage || !hasCookingPhotos}
                  activeOpacity={0.8}
                  className="mt-3 bg-primary py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2"
                  style={{ opacity: resubmitting || !hasHomeImage || !hasCookingPhotos ? 0.6 : 1 }}
                >
                  {resubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : null}
                  <Text className="font-poppins font-bold text-xs text-white">
                    {resubmitting ? "Re-submitting..." : "🚀 Re-Submit Application for Review"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {(isPending || isRejected) ? (
          <>
            <KitchenHomeImageSection kitchen={kitchen} onUploaded={refreshKitchen} />
            <HygieneUploadSection onChange={setHygieneCount} />
          </>
        ) : null}

        {/* Daily Hygiene Video Section */}
        {isApproved ? (
          <View className="bg-white rounded-2xl border border-primary/15 p-4 mb-5 shadow-sm">
            <View className="flex-row items-start gap-3 mb-4">
              <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
                <Video size={22} color="#0B6B3A" />
              </View>
              <View className="flex-1">
                <Text className="font-poppins font-semibold text-sm text-dark">Daily hygiene video</Text>
                <Text className="font-nunito text-xs text-gray mt-1 leading-5">
                  Record one short video covering your washing area, refrigerator, and cooking area every 24 hours.
                </Text>
              </View>
            </View>

            {hygieneError ? (
              <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex-row items-center gap-2">
                <AlertTriangle size={15} color="#EF4444" />
                <Text className="font-nunito text-xs text-red-700 flex-1">{hygieneError}</Text>
              </View>
            ) : null}

            {dashboardHygieneStatus?.requiresUpload && (
              <View className="mb-4 flex-row items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <AlertTriangle size={15} color="#D97706" className="mt-0.5" />
                <Text className="font-nunito text-xs text-amber-800 flex-1">
                  {dashboardHygieneStatus.uploadMessage || HYGIENE_EXPIRED_PROMPT}
                </Text>
              </View>
            )}

            {dashboardHygieneStatus?.uploaded && (
              <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                <CheckCircle size={15} color="#059669" />
                <Text className="font-nunito text-xs text-emerald-800 font-semibold flex-1">
                  {dashboardHygieneStatus.status === "approved"
                    ? "Daily hygiene video approved and active"
                    : "Daily hygiene video uploaded. Waiting for Admin approval."}
                </Text>
              </View>
            )}

            {dashboardHygieneStatus?.video?.mediaUrl ? (
              <View className="mb-4 rounded-xl border border-gray-light bg-cream/20 p-3">
                <Text className="font-poppins text-xs font-semibold text-dark mb-2">Current Daily Video</Text>
                <DailyVideoPlayer videoUrl={resolveMediaUrl(dashboardHygieneStatus.video.mediaUrl)} />
                {dashboardHygieneStatus.video.recordedAt ? (
                  <Text className="font-nunito text-[10px] text-gray mt-2">
                    Uploaded: {new Date(dashboardHygieneStatus.video.recordedAt).toLocaleString("en-IN")}
                  </Text>
                ) : null}
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={handleHygieneVideoPick}
                    disabled={uploadingHygiene || deletingHygiene}
                    className="flex-1 py-2.5 bg-primary/10 rounded-xl border border-primary/20 items-center justify-center"
                  >
                    <Text className="font-poppins font-bold text-xs text-primary">Record New</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleHygieneVideoDelete}
                    disabled={uploadingHygiene || deletingHygiene}
                    className="flex-1 py-2.5 bg-red-50 rounded-xl border border-red-100 items-center justify-center"
                  >
                    <Text className="font-poppins font-bold text-xs text-red-600">Delete Video</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleHygieneVideoPick}
                disabled={uploadingHygiene || deletingHygiene}
                className="w-full py-4 bg-primary/5 rounded-xl border border-dashed border-primary/30 flex-row justify-center items-center gap-2 mb-2"
              >
                {uploadingHygiene ? (
                  <ActivityIndicator size="small" color="#0B6B3A" />
                ) : (
                  <Video size={16} color="#0B6B3A" />
                )}
                <Text className="font-poppins font-bold text-xs text-primary">
                  {uploadingHygiene ? "Uploading video..." : "Record / Upload Daily Video"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Quick Actions Dock */}
        {isApproved ? (
          <View className="mb-6">
            <Text className="font-poppins font-semibold text-base text-dark mb-3">Quick Actions</Text>
            <View className="flex-row justify-between items-center py-4 px-2 bg-white rounded-2xl border border-gray-light/35 shadow-sm">
              {[
                {
                  label: "Menu",
                  icon: UtensilsCrossed,
                  color: "#0B6B3A",
                  iconBg: "bg-emerald-50 border-emerald-100",
                  action: () => router.push("/(kitchen)/(tabs)/menu"),
                },
                {
                  label: "Orders",
                  icon: ShoppingBag,
                  color: "#2563EB",
                  iconBg: "bg-blue-50 border-blue-100",
                  action: () => router.push("/(kitchen)/(tabs)/orders"),
                  badge: orderStats.activeOrders,
                },
                {
                  label: "Enquiries",
                  icon: MessageSquare,
                  color: "#D97706",
                  iconBg: "bg-amber-50 border-amber-100",
                  action: () => router.push("/(kitchen)/(tabs)/enquiries"),
                  badge: enquiryUnreadCount,
                },
                {
                  label: "Payouts",
                  icon: IndianRupee,
                  color: "#059669",
                  iconBg: "bg-emerald-50 border-emerald-100",
                  action: handleOpenPayoutsModal,
                },
              ].map((item, i) => {
                const IconComp = item.icon
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={item.action}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                    className={cn("items-center flex-1", item.disabled && "opacity-50")}
                  >
                    <View
                      style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1 }}
                      className={cn("items-center justify-center relative shadow-sm", item.iconBg)}
                    >
                      <IconComp size={22} color={item.color} />

                      {/* Active count badge */}
                      {item.badge && item.badge > 0 ? (
                        <View className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full px-1.5 py-0.5 min-w-[18px] items-center justify-center border border-white">
                          <Text className="font-poppins font-bold text-[9px] text-white">
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="font-poppins font-semibold text-xs text-dark mt-2.5 text-center">
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ) : null}

        {/* Payout & Bank Details Section */}
        <PayoutSettingsSection />

        {/* Business details */}
        <View className="bg-white rounded-2xl border border-gray-light/35 p-5 mb-5 shadow-sm">
          <Text className="font-poppins font-bold text-base text-dark mb-4">Business Details</Text>

          <View className="space-y-4">
            {/* Kitchen Type */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                  <UtensilsCrossed size={16} color="#0B6B3A" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">Kitchen Type</Text>
              </View>
              <Text className="font-poppins font-bold text-sm text-dark">
                {kitchenTypeLabel[kitchen?.kitchen_type] || "Veg"}
              </Text>
            </View>

            {/* Signature Dish */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-amber-50 items-center justify-center">
                  <Sparkles size={16} color="#D97706" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">Signature Dish</Text>
              </View>
              <Text className="font-poppins font-bold text-sm text-dark">
                {kitchen?.best_item || "—"}
              </Text>
            </View>

            {/* Operating Hours */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                  <Clock size={16} color="#2563EB" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">Operating Hours</Text>
              </View>
              <Text className="font-poppins font-bold text-sm text-dark">
                {kitchen?.opening_time || "—"} hrs
              </Text>
            </View>

            {/* Phone */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center">
                  <Phone size={16} color="#0D9488" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">Phone</Text>
              </View>
              <Text className="font-poppins font-bold text-sm text-dark">
                {kitchen?.phone || "—"}
              </Text>
            </View>

            {/* Email */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3 flex-1 mr-2">
                <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center">
                  <Mail size={16} color="#4F46E5" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">Email</Text>
              </View>
              <Text className="font-poppins font-bold text-sm text-dark flex-1 text-right" numberOfLines={1}>
                {kitchen?.email || "—"}
              </Text>
            </View>

            {/* FSSAI License */}
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                  <Shield size={16} color="#7C3AED" />
                </View>
                <Text className="font-nunito text-xs text-gray font-semibold">FSSAI License</Text>
              </View>
              {kitchen?.fssai_license ? (
                <TouchableOpacity onPress={() => Linking.openURL(kitchen.fssai_license)}>
                  <Text className="text-primary text-sm font-semibold underline">
                    View uploaded license
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="font-poppins font-bold text-sm text-dark">
                  {kitchen?.fssai_number || "—"}
                </Text>
              )}
            </View>

            {/* About Kitchen */}
            <View className="pt-1">
              <Text className="font-nunito text-xs text-gray font-semibold mb-2">About Kitchen</Text>
              <View className="bg-cream/40 border border-gray-light/20 rounded-xl p-3">
                <Text className="font-nunito text-xs text-dark leading-5 italic">
                  {"\""}{kitchen?.description || "Welcome to our kitchen! Freshly made with love."}{"\""}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Verification band */}
        <View className="bg-white rounded-xl border border-gray-light/30 p-4 mb-8">
          <Text className="font-poppins font-semibold text-base text-dark mb-4">Partner Status</Text>
          <View className="space-y-4">
            {[
              { icon: FileCheck, label: "Application Approved", ok: isApproved },
              { icon: Shield, label: "Hygiene Verified", ok: isApproved && (kitchen?.hygiene_score || 0) > 0 },
              { icon: Sparkles, label: "Live on Platform", ok: isApproved },
              { icon: UtensilsCrossed, label: "Menu Active", ok: menuActive },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <View key={i} className="flex-row items-center gap-3">
                  <View
                    className={cn(
                      "w-8 h-8 rounded-full items-center justify-center",
                      item.ok ? "bg-emerald-100 text-emerald-600" : "bg-cream-dark/40 text-gray"
                    )}
                  >
                    <Icon size={16} color={item.ok ? "#059669" : "#7A7A7A"} />
                  </View>
                  <Text className={cn("font-nunito text-sm flex-1", item.ok ? "text-dark" : "text-gray")}>
                    {item.label}
                  </Text>
                  {item.ok ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <Clock size={16} color="#7A7A7A" />
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Legal & Policies */}
        <View className="bg-white rounded-2xl border border-gray-light/35 p-5 mb-8 shadow-sm">
          <Text className="font-poppins font-bold text-base text-dark mb-4">Legal & Policies</Text>

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => setPolicyType("privacy")}
              activeOpacity={0.8}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-cream/30 border border-gray-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                  <ShieldCheck size={16} color="#0B6B3A" />
                </View>
                <View>
                  <Text className="font-poppins font-bold text-xs text-dark">Privacy Policy</Text>
                  <Text className="font-nunito text-[10px] text-gray mt-0.5">How we handle kitchen data</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#7A7A7A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPolicyType("terms")}
              activeOpacity={0.8}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-cream/30 border border-gray-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                  <FileText size={16} color="#0B6B3A" />
                </View>
                <View>
                  <Text className="font-poppins font-bold text-xs text-dark">Terms of Service</Text>
                  <Text className="font-nunito text-[10px] text-gray mt-0.5">Partner rules & agreement</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#7A7A7A" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <KitchenStoryModal
        visible={storyModalVisible}
        onClose={() => setStoryModalVisible(false)}
        onUploaded={loadStories}
      />

      <StoryViewerModal
        visible={viewerModalVisible}
        stories={stories}
        kitchenName={kitchen?.name || "Kitchen"}
        kitchenImage={logoUrl}
        onClose={() => setViewerModalVisible(false)}
      />

      {/* Live Camera Recorder Modal */}
      <Modal
        visible={cameraModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCameraModal}
      >
        <View className="flex-1 bg-black/85 justify-center items-center px-4 py-8">
          <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl relative">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins font-bold text-base text-dark">Live Hygiene Recorder</Text>
              <TouchableOpacity onPress={handleCloseCameraModal} style={{ padding: 4 }}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            {/* Warning Note */}
            <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <Text className="font-nunito text-xs text-amber-800 leading-4">
                Record your washing area, refrigerator, and cooking area. Max duration: 60 seconds. Only live captures are allowed.
              </Text>
            </View>

            {/* Error Message */}
            {hygieneError ? (
              <View className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                <Text className="font-nunito text-xs text-red-700 leading-4">{hygieneError}</Text>
              </View>
            ) : null}

            {/* Camera Viewport */}
            <View className="relative w-full h-[320px] bg-black rounded-2xl overflow-hidden mb-5 items-center justify-center">
              {Platform.OS === "web" ? (
                /* HTML5 Web Recorder Video */
                <video
                  ref={videoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  playsInline
                  muted
                />
              ) : (
                /* Native Expo Camera View */
                (!cameraPermission?.granted || !micPermission?.granted) ? (
                  <View className="p-4 items-center">
                    <AlertTriangle size={24} color="#7A7A7A" className="mb-2" />
                    <Text className="font-nunito text-xs text-gray text-center mb-4 leading-4">
                      Camera and Microphone permissions are required to record hygiene videos.
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await requestCameraPermission()
                        await requestMicPermission()
                      }}
                      className="px-4 py-2 bg-primary rounded-lg"
                    >
                      <Text className="font-poppins font-bold text-xs text-white">Grant Permissions</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CameraView
                    ref={cameraRef}
                    mode="video"
                    facing="back"
                    style={{ width: "100%", height: "100%" }}
                  />
                )
              )}

              {/* Uploading overlay */}
              {uploadingHygiene && (
                <View className="absolute inset-0 bg-black/75 items-center justify-center">
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text className="font-poppins font-bold text-white text-xs mt-3">Uploading video...</Text>
                </View>
              )}

              {/* Floating recording indicator */}
              {isRecording && (
                <View className="absolute top-4 left-4 bg-red-600 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 shadow-sm">
                  <View className="w-2 h-2 rounded-full bg-white" />
                  <Text className="font-poppins font-bold text-[10px] text-white">REC</Text>
                </View>
              )}

              {/* Floating duration timer */}
              {isRecording && (
                <View className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full">
                  <Text className="font-poppins font-bold text-xs text-white">
                    00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration} / 00:60
                  </Text>
                </View>
              )}
            </View>

            {/* Camera Controls */}
            <View className="items-center">
              {!isRecording ? (
                <TouchableOpacity
                  onPress={handleStartRecording}
                  disabled={uploadingHygiene}
                  className="w-16 h-16 rounded-full border-4 border-gray-light bg-red-600 items-center justify-center shadow-lg active:scale-95"
                >
                  <View className="w-8 h-8 rounded-full bg-red-600 border border-white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStopRecording}
                  disabled={uploadingHygiene}
                  className="w-16 h-16 rounded-full border-4 border-gray-light bg-red-600 items-center justify-center shadow-lg active:scale-95"
                >
                  <View className="w-6 h-6 rounded bg-white" />
                </TouchableOpacity>
              )}
              <Text className="font-poppins font-semibold text-xs text-gray mt-3">
                {isRecording ? "Tap to Stop Recording" : "Tap to Start Live Recording"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alerts / Notifications Modal (Bottom Sheet Design) */}
      <Modal
        visible={alertsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          {/* Backdrop dismiss touch target */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setAlertsModalVisible(false)}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-t-[32px] p-6 max-h-[80%] min-h-[40%] flex-col relative shadow-2xl">
            {/* Top Handle Indicator */}
            <View className="w-12 h-1 bg-gray-light/40 rounded-full self-center mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4 border-b border-gray-light/10 pb-3">
              <View className="flex-row items-center gap-2">
                <Bell size={20} color="#0B6B3A" />
                <Text className="font-poppins font-extrabold text-lg text-dark">
                  Notifications
                </Text>
                {alerts.length > 0 && (
                  <View className="bg-primary/15 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-primary">{alerts.length} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setAlertsModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-100"
              >
                <X size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            {/* List */}
            {alertsLoading ? (
              <View className="flex-grow items-center justify-center py-20">
                <ActivityIndicator size="small" color="#0B6B3A" />
              </View>
            ) : alerts.length === 0 ? (
              <View className="flex-grow items-center justify-center py-16 px-6">
                <View className="w-16 h-16 rounded-full bg-cream items-center justify-center mb-4">
                  <Bell size={28} color="#7A7A7A" />
                </View>
                <Text className="font-poppins font-bold text-base text-dark">All caught up!</Text>
                <Text className="font-nunito text-xs text-gray text-center mt-2 leading-relaxed max-w-[240px]">
                  No new announcements or kitchen broadcasts from the admin right now.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-grow mb-4">
                {alerts.map((alert) => (
                  <View
                    key={alert.id}
                    className="p-4 bg-slate-50/75 rounded-2xl border border-slate-100 mb-3 flex-row gap-3 items-start"
                  >
                    <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center mt-0.5">
                      <Bell size={15} color="#0B6B3A" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-poppins font-bold text-sm text-dark leading-snug">
                        {alert.title}
                      </Text>
                      <Text className="font-nunito text-xs text-gray-dark mt-1 leading-relaxed">
                        {alert.body}
                      </Text>
                      <Text className="font-nunito text-[10px] text-gray mt-2 font-bold">
                        {new Date(alert.createdAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDismissAlert(alert.id)}
                      className="px-2.5 py-1.5 bg-[#FDEDEC] rounded-lg border border-[#FCD2D1] self-start"
                    >
                      <Text className="text-[10px] font-poppins font-bold text-accent">Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payouts History Modal */}
      <Modal
        visible={payoutsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayoutsModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setPayoutsModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "75%", width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyBetween: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F1EF" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#1F1F1F" }}>
                  Payout & Settlement History
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#7A7A7A", marginTop: 2 }}>
                  Bank transfers & settlements credited by Admin
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPayoutsModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              {payoutsLoading ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#0B6B3A" />
                </View>
              ) : payoutsList.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <IndianRupee size={36} color="#CCCCCC" />
                  <Text style={{ fontSize: 13, fontFamily: "Nunito", color: "#7A7A7A", textAlign: "center", marginTop: 8 }}>
                    No payout settlements recorded yet.
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Nunito", color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
                    Admin payouts will appear here with Date and UTR Reference number once processed.
                  </Text>
                </View>
              ) : (
                payoutsList.map((p) => (
                  <View key={p.id} style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "Poppins", color: "#059669" }}>
                        ₹{p.netPayout}
                      </Text>
                      <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", fontFamily: "Poppins", color: "#065F46" }}>
                          PAID ✅
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Nunito", color: "#4B5563" }}>
                        Gross Sales: ₹{p.grossAmount} | Comm (10%): -₹{p.commissionDeduction}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "bold", fontFamily: "monospace", color: "#1F2937" }}>
                        UTR Ref: {p.utrNumber || "—"}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: "Nunito", color: "#9CA3AF", marginTop: 2 }}>
                        Paid on: {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "—"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PolicyModal
        visible={Boolean(policyType)}
        onClose={() => setPolicyType(null)}
        type={policyType || "privacy"}
      />
    </SafeAreaView>
  )
}
