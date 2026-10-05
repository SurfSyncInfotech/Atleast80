import React, { useState, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
} from "react-native"
import {
  Sparkles,
  Check,
  Edit2,
  Plus,
  X,
  Zap,
  Calendar,
  AlertCircle,
  Upload,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react-native"
import * as ImagePicker from "expo-image-picker"
import { api, uploadKitchenFestivalOfferImage } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const DEFAULT_FESTIVAL_IMG = require("../../../assets/images/festival_offer_default.jpg")
const GUIDELINES_IMG = require("../../../assets/images/festival_seller_guidelines.jpg")

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function FestivalOfferThumb({ uri, style, resizeMode = "cover" }) {
  const [hasError, setHasError] = useState(false)
  const isCustom = Boolean(
    uri &&
    typeof uri === "string" &&
    !uri.includes("festival_offer_default") &&
    !hasError
  )

  if (!isCustom) {
    return <Image source={DEFAULT_FESTIVAL_IMG} style={style} resizeMode={resizeMode} />
  }

  return (
    <Image
      source={{ uri: resolveMediaUrl(uri) }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  )
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

function formatDateTimeForInput(dateStr) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const pad = (n) => String(n).padStart(2, "0")
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return dateStr || ""
  }
}

function parseInputToIso(val) {
  if (!val || !val.trim()) return null
  try {
    const cleaned = val.trim().replace(" ", "T")
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) {
      return d.toISOString()
    }
    return val.trim()
  } catch {
    return val.trim()
  }
}

// Interactive Visual Calendar Modal Component
function CalendarPickerModal({
  visible,
  onClose,
  onSelect,
  initialValue,
  title = "Select Date & Time",
  minDate = null,
}) {
  const pad = (n) => String(n).padStart(2, "0")
  
  const parseInitial = () => {
    if (initialValue) {
      const d = new Date(initialValue.replace(" ", "T"))
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  }

  const [currentDate, setCurrentDate] = useState(parseInitial)
  const [selectedDay, setSelectedDay] = useState(() => parseInitial().getDate())
  const [viewMonth, setViewMonth] = useState(() => parseInitial().getMonth())
  const [viewYear, setViewYear] = useState(() => parseInitial().getFullYear())
  const [selectedHour, setSelectedHour] = useState(() => parseInitial().getHours())
  const [selectedMinute, setSelectedMinute] = useState(() => parseInitial().getMinutes())

  useEffect(() => {
    if (visible) {
      const d = parseInitial()
      setCurrentDate(d)
      setSelectedDay(d.getDate())
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
      setSelectedHour(d.getHours())
      setSelectedMinute(d.getMinutes())
    }
  }, [visible, initialValue])

  // Calendar grid calculations
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate()
  }, [viewYear, viewMonth])

  const startDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay()
  }, [viewYear, viewMonth])

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleApplyPreset = (preset) => {
    const now = new Date()
    if (preset === "today") {
      setViewYear(now.getFullYear())
      setViewMonth(now.getMonth())
      setSelectedDay(now.getDate())
      setSelectedHour(now.getHours())
      setSelectedMinute(now.getMinutes())
    } else if (preset === "today_end") {
      setViewYear(now.getFullYear())
      setViewMonth(now.getMonth())
      setSelectedDay(now.getDate())
      setSelectedHour(23)
      setSelectedMinute(59)
    } else if (preset === "tomorrow") {
      const tom = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      setViewYear(tom.getFullYear())
      setViewMonth(tom.getMonth())
      setSelectedDay(tom.getDate())
      setSelectedHour(23)
      setSelectedMinute(59)
    } else if (preset === "3days") {
      const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      setViewYear(d3.getFullYear())
      setViewMonth(d3.getMonth())
      setSelectedDay(d3.getDate())
      setSelectedHour(23)
      setSelectedMinute(59)
    } else if (preset === "7days") {
      const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      setViewYear(d7.getFullYear())
      setViewMonth(d7.getMonth())
      setSelectedDay(d7.getDate())
      setSelectedHour(23)
      setSelectedMinute(59)
    }
  }

  const handleConfirm = () => {
    const formatted = `${viewYear}-${pad(viewMonth + 1)}-${pad(selectedDay)} ${pad(selectedHour)}:${pad(selectedMinute)}`
    onSelect(formatted)
    onClose()
  }

  const today = new Date()
  const isTodayMonth = today.getMonth() === viewMonth && today.getFullYear() === viewYear

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[92%] border-t border-gray-100 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Calendar size={18} color="#047857" />
              <Text className="font-poppins font-bold text-base text-dark">{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1.5 bg-gray-100 rounded-full">
              <X size={16} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
            {/* Quick Presets Row */}
            <Text className="font-poppins font-bold text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">
              Quick Shortcuts
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 mb-3">
              <TouchableOpacity
                onPress={() => handleApplyPreset("today")}
                className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mr-1.5"
              >
                <Text className="font-poppins font-bold text-xs text-emerald-900">⚡ Right Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset("today_end")}
                className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mr-1.5"
              >
                <Text className="font-poppins font-bold text-xs text-amber-900">🌙 Tonight (11:59 PM)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset("tomorrow")}
                className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mr-1.5"
              >
                <Text className="font-poppins font-bold text-xs text-blue-900">🌅 Tomorrow End</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset("3days")}
                className="px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 mr-1.5"
              >
                <Text className="font-poppins font-bold text-xs text-purple-900">🎉 3 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset("7days")}
                className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200"
              >
                <Text className="font-poppins font-bold text-xs text-orange-900">📅 7 Days</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Month & Year Navigation */}
            <View className="bg-gray-50 p-3 rounded-2xl border border-gray-200 mb-3">
              <View className="flex-row items-center justify-between mb-3 px-2">
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  className="p-2 bg-white rounded-xl border border-gray-200 shadow-xs"
                >
                  <ChevronLeft size={16} color="#1f2937" />
                </TouchableOpacity>

                <Text className="font-poppins font-bold text-sm text-dark">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  onPress={handleNextMonth}
                  className="p-2 bg-white rounded-xl border border-gray-200 shadow-xs"
                >
                  <ChevronRight size={16} color="#1f2937" />
                </TouchableOpacity>
              </View>

              {/* Day Headers (Sun - Sat) */}
              <View className="flex-row justify-between mb-1.5">
                {DAYS_SHORT.map((d, i) => (
                  <View key={d} className="flex-1 items-center">
                    <Text className={cn("font-poppins font-bold text-[11px]", i === 0 ? "text-rose-500" : "text-gray-500")}>
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Days Matrix */}
              <View className="flex-row flex-wrap">
                {/* Empty offset days */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} className="w-[14.28%] aspect-square p-0.5" />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1
                  const isSelected = selectedDay === dayNum
                  const isToday = isTodayMonth && today.getDate() === dayNum

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      onPress={() => setSelectedDay(dayNum)}
                      className="w-[14.28%] aspect-square p-0.5"
                    >
                      <View
                        className={cn(
                          "w-full h-full rounded-xl items-center justify-center border",
                          isSelected
                            ? "bg-primary border-primary shadow-xs"
                            : isToday
                            ? "bg-amber-100 border-amber-300"
                            : "bg-white border-transparent hover:bg-gray-100"
                        )}
                      >
                        <Text
                          className={cn(
                            "font-poppins text-xs font-semibold",
                            isSelected
                              ? "text-white font-bold"
                              : isToday
                              ? "text-amber-900 font-bold"
                              : "text-dark"
                          )}
                        >
                          {dayNum}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Time Selection */}
            <View className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 mb-4">
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <Clock size={15} color="#047857" />
                <Text className="font-poppins font-bold text-xs text-dark">Select Time</Text>
              </View>

              {/* Quick Time Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 mb-3">
                {[
                  { h: 9, m: 0, label: "09:00 AM" },
                  { h: 12, m: 0, label: "12:00 PM" },
                  { h: 18, m: 0, label: "06:00 PM" },
                  { h: 21, m: 0, label: "09:00 PM" },
                  { h: 23, m: 59, label: "11:59 PM (Midnight)" },
                ].map((t) => {
                  const active = selectedHour === t.h && selectedMinute === t.m
                  return (
                    <TouchableOpacity
                      key={t.label}
                      onPress={() => {
                        setSelectedHour(t.h)
                        setSelectedMinute(t.m)
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border mr-1",
                        active ? "bg-primary border-primary text-white" : "bg-white border-gray-200"
                      )}
                    >
                      <Text className={cn("font-poppins text-[10px] font-semibold", active ? "text-white" : "text-gray-700")}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Hour & Minute Custom Steppers */}
              <View className="flex-row gap-3 items-center">
                <View className="flex-1 bg-white p-2.5 rounded-xl border border-gray-200 items-center">
                  <Text className="font-nunito text-[10px] text-gray mb-1">Hour (0-23)</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => setSelectedHour((h) => (h > 0 ? h - 1 : 23))}
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                    >
                      <Text className="font-bold text-sm text-dark">-</Text>
                    </TouchableOpacity>
                    <Text className="font-poppins font-bold text-base text-dark">{pad(selectedHour)}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedHour((h) => (h < 23 ? h + 1 : 0))}
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                    >
                      <Text className="font-bold text-sm text-dark">+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="font-poppins font-bold text-lg text-gray-400">:</Text>

                <View className="flex-1 bg-white p-2.5 rounded-xl border border-gray-200 items-center">
                  <Text className="font-nunito text-[10px] text-gray mb-1">Minute (0-59)</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => setSelectedMinute((m) => (m >= 5 ? m - 5 : 55))}
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                    >
                      <Text className="font-bold text-sm text-dark">-</Text>
                    </TouchableOpacity>
                    <Text className="font-poppins font-bold text-base text-dark">{pad(selectedMinute)}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedMinute((m) => (m <= 54 ? m + 5 : 0))}
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                    >
                      <Text className="font-bold text-sm text-dark">+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Selected Date Summary Display */}
            <View className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 mb-4 flex-row items-center justify-between">
              <View>
                <Text className="font-nunito text-[10px] text-emerald-800 font-semibold">Selected Schedule:</Text>
                <Text className="font-poppins font-bold text-xs text-emerald-950">
                  {selectedDay} {MONTH_NAMES[viewMonth]} {viewYear}, {pad(selectedHour)}:{pad(selectedMinute)}
                </Text>
              </View>
              <View className="bg-emerald-600 p-1 rounded-full">
                <Check size={14} color="#ffffff" strokeWidth={3} />
              </View>
            </View>

            {/* Set Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              className="w-full py-3 bg-primary rounded-xl items-center justify-center flex-row gap-2 mb-4 shadow-sm"
            >
              <Check size={16} color="#fff" />
              <Text className="font-poppins font-bold text-sm text-white">Apply Date & Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function FestivalSpecialsSection({ kitchen, onUpdated }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(null)
  const [error, setError] = useState("")

  // Active Calendar Picker State
  const [calendarPickerTarget, setCalendarPickerTarget] = useState(null) // 'start' | 'end' | null

  const [form, setForm] = useState({
    enabled: true,
    title: "",
    category: "both",
    discountPercent: "10",
    startDate: "",
    endDate: "",
    description: "",
    image: "",
    image2: "",
  })

  useEffect(() => {
    if (kitchen) {
      setForm({
        enabled: Boolean(kitchen.festival_offer_enabled),
        title: kitchen.festival_offer_title || "",
        category: kitchen.festival_offer_category || "both",
        discountPercent: String(kitchen.festival_offer_discount_percent || "10"),
        startDate: formatDateTimeForInput(kitchen.festival_offer_start_date),
        endDate: formatDateTimeForInput(kitchen.festival_offer_end_date),
        description: kitchen.festival_offer_description || "",
        image: kitchen.festival_offer_image || "",
        image2: kitchen.festival_offer_image_2 || "",
      })
    }
  }, [kitchen])

  const isEnabled = Boolean(kitchen?.festival_offer_enabled)
  const discount = Number(kitchen?.festival_offer_discount_percent || 0)
  const category = kitchen?.festival_offer_category || "both"
  const title = kitchen?.festival_offer_title || "Festival Special"

  // Live status calculation
  const now = new Date()
  const start = kitchen?.festival_offer_start_date ? new Date(kitchen.festival_offer_start_date) : null
  const end = kitchen?.festival_offer_end_date ? new Date(kitchen.festival_offer_end_date) : null

  let statusLabel = "Disabled"
  let statusBadgeBg = "bg-gray-100"
  let statusTextColor = "text-gray-600"

  if (isEnabled && discount > 0) {
    if (start && !isNaN(start.getTime()) && now < start) {
      statusLabel = "Scheduled"
      statusBadgeBg = "bg-blue-50"
      statusTextColor = "text-blue-700"
    } else if (end && !isNaN(end.getTime()) && now > end) {
      statusLabel = "Expired"
      statusBadgeBg = "bg-amber-50"
      statusTextColor = "text-amber-700"
    } else {
      statusLabel = "Active Live"
      statusBadgeBg = "bg-emerald-50"
      statusTextColor = "text-emerald-700"
    }
  }

  const categoryLabel = {
    food: "Food Items",
    grocery: "Grocery Items",
    both: "Food & Grocery",
  }[category] || "All Items"

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      const nextEnabled = !isEnabled
      await api(
        "/api/kitchens/me/festival-offer",
        {
          method: "PUT",
          body: JSON.stringify({
            enabled: nextEnabled,
            title: form.title || "Festival Special",
            category: form.category || "both",
            discountPercent: Number(form.discountPercent) || 10,
            startDate: parseInputToIso(form.startDate),
            endDate: parseInputToIso(form.endDate),
            description: form.description || null,
            image: form.image || null,
            image2: form.image2 || null,
          }),
        },
        "kitchen"
      )
      Alert.alert("Success", nextEnabled ? "Festival offer enabled!" : "Festival offer disabled!")
      if (onUpdated) onUpdated()
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to toggle offer")
    } finally {
      setToggling(false)
    }
  }

  const handlePickImage = async (slot = 1) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to upload banner image.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setUploadingImage(slot)
        setError("")
        try {
          const res = await uploadKitchenFestivalOfferImage(asset, slot)
          if (res?.imageUrl) {
            if (slot === 2) {
              setForm((prev) => ({ ...prev, image2: res.imageUrl }))
            } else {
              setForm((prev) => ({ ...prev, image: res.imageUrl }))
            }
          }
        } catch (err) {
          setError(err.message || `Failed to upload image ${slot}`)
        } finally {
          setUploadingImage(null)
        }
      }
    } catch (err) {
      setError("Failed to open image picker")
      setUploadingImage(null)
    }
  }

  const handleUseDefaultImage = () => {
    setForm((prev) => ({ ...prev, image: "/festival_offer_default.jpg" }))
  }

  const applyQuickDates = (preset) => {
    const pad = (n) => String(n).padStart(2, "0")
    const format = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

    const current = new Date()
    const startStr = format(current)

    if (preset === "today") {
      const endToday = new Date()
      endToday.setHours(23, 59, 0, 0)
      setForm((prev) => ({ ...prev, startDate: startStr, endDate: format(endToday) }))
    } else if (preset === "3days") {
      const end3 = new Date(current.getTime() + 3 * 24 * 60 * 60 * 1000)
      setForm((prev) => ({ ...prev, startDate: startStr, endDate: format(end3) }))
    } else if (preset === "7days") {
      const end7 = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
      setForm((prev) => ({ ...prev, startDate: startStr, endDate: format(end7) }))
    } else if (preset === "clear") {
      setForm((prev) => ({ ...prev, startDate: "", endDate: "" }))
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please enter a festival offer title")
      return
    }
    const percent = Number(form.discountPercent)
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      setError("Discount percentage must be between 1 and 100")
      return
    }

    setSaving(true)
    setError("")
    try {
      await api(
        "/api/kitchens/me/festival-offer",
        {
          method: "PUT",
          body: JSON.stringify({
            enabled: form.enabled,
            title: form.title.trim(),
            category: form.category,
            discountPercent: percent,
            startDate: parseInputToIso(form.startDate),
            endDate: parseInputToIso(form.endDate),
            description: form.description.trim() || null,
            image: form.image || null,
            image2: form.image2 || null,
          }),
        },
        "kitchen"
      )
      setModalOpen(false)
      Alert.alert("Success", "Festival offer updated successfully!")
      if (onUpdated) onUpdated()
    } catch (err) {
      setError(err.message || "Failed to save festival offer")
    } finally {
      setSaving(false)
    }
  }

  const isCustomImage = Boolean(
    form.image &&
    typeof form.image === "string" &&
    !form.image.includes("festival_offer_default") &&
    form.image.trim() !== ""
  )

  return (
    <View className="mb-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
          <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center shadow-sm">
            <Sparkles size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-poppins font-bold text-dark text-sm">Festival Specials</Text>
              <View className={cn("px-2 py-0.5 rounded-full", statusBadgeBg)}>
                <Text className={cn("font-poppins font-semibold text-[10px]", statusTextColor)}>
                  {statusLabel}
                </Text>
              </View>
            </View>
            <Text className="font-nunito text-[11px] text-gray mt-0.5">
              Category-wise discounts with custom banner & auto-expiry
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setGuidelinesModalOpen(true)}
          className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 flex-row items-center gap-1 shadow-xs"
        >
          <Info size={12} color="#d97706" />
          <Text className="font-poppins font-bold text-[10px] text-amber-800">Guidelines</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons Row */}
      <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-amber-200/60">
        <TouchableOpacity
          onPress={handleToggle}
          disabled={toggling}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl flex-row items-center justify-center gap-1.5 border",
            isEnabled ? "bg-emerald-600 border-emerald-600" : "bg-white border-gray-300"
          )}
        >
          {toggling ? (
            <ActivityIndicator size="small" color={isEnabled ? "#fff" : "#22c55e"} />
          ) : (
            <View className="flex-row items-center gap-1.5">
              <Zap size={14} color={isEnabled ? "#fff" : "#4b5563"} />
              <Text className={cn("font-poppins font-semibold text-xs", isEnabled ? "text-white" : "text-gray-700")}>
                {isEnabled ? "Offer ON" : "Turn ON"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setError("")
            setModalOpen(true)
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-primary flex-row items-center justify-center gap-1.5 shadow-xs"
        >
          {kitchen?.festival_offer_title ? <Edit2 size={13} color="#fff" /> : <Plus size={14} color="#fff" />}
          <Text className="font-poppins font-bold text-xs text-white">
            {kitchen?.festival_offer_title ? "Edit Offer" : "Create Offer"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offer Summary if exists */}
      {Boolean(kitchen?.festival_offer_title) ? (
        <View className="mt-3 p-3 bg-white/95 rounded-xl border border-amber-100 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-xl overflow-hidden border border-amber-200 bg-amber-50">
            <FestivalOfferThumb
              uri={kitchen?.festival_offer_image}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="font-poppins font-bold text-xs text-dark" numberOfLines={1}>{title}</Text>
            <Text className="font-nunito text-[11px] text-primary font-bold mt-0.5">
              Flat {discount}% OFF • <Text className="font-semibold text-gray-700">{categoryLabel}</Text>
            </Text>
            {kitchen?.festival_offer_end_date ? (
              <Text className="font-nunito text-[10px] text-amber-700 mt-0.5">
                Expires: {formatDisplayDate(kitchen.festival_offer_end_date)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Seller Guidelines Modal */}
      <Modal visible={guidelinesModalOpen} transparent animationType="fade" onRequestClose={() => setGuidelinesModalOpen(false)}>
        <View className="flex-1 bg-black/70 justify-center p-4">
          <View className="bg-white rounded-3xl overflow-hidden max-h-[85%] border border-gray-100 shadow-2xl">
            <View className="flex-row items-center justify-between p-4 bg-[#0a1f13] border-b border-white/10">
              <View className="flex-row items-center gap-2">
                <Info size={18} color="#22c55e" />
                <Text className="font-poppins font-bold text-sm text-white">Seller Offer Guidelines</Text>
              </View>
              <TouchableOpacity onPress={() => setGuidelinesModalOpen(false)} className="p-1">
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4 bg-gray-50" showsVerticalScrollIndicator={false}>
              <Image
                source={GUIDELINES_IMG}
                style={{ width: "100%", height: 360, borderRadius: 16 }}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Form */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#f59e0b" />
                <Text className="font-poppins font-bold text-base text-dark">Festival Offer Setup</Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)} className="p-1">
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {error ? (
                <View className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-2">
                  <AlertCircle size={15} color="#dc2626" />
                  <Text className="font-nunito text-xs text-red-700 flex-1">{error}</Text>
                </View>
              ) : null}

              {/* Offer Image Selection / Upload (2 Images) */}
              <Text className="font-poppins font-bold text-xs text-dark mb-1.5">Festival Offer Visual Images (Up to 2 Posters)</Text>
              
              {/* Slot 1: Primary Banner */}
              <View className="p-3 bg-gray-50 border border-gray-200 rounded-2xl mb-2.5 flex-row items-center gap-3">
                <View className="w-16 h-16 rounded-xl overflow-hidden border border-amber-200 bg-white shadow-xs">
                  <FestivalOfferThumb
                    key={form.image || "default"}
                    uri={form.image}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="font-poppins font-bold text-xs text-dark">
                    Image 1: Main Banner
                  </Text>
                  <Text className="font-nunito text-[11px] text-gray mt-0.5 leading-snug">
                    {isCustomImage ? "Custom banner uploaded" : "Default festive banner"}
                  </Text>

                  <View className="flex-row items-center gap-2 mt-2">
                    <TouchableOpacity
                      onPress={() => handlePickImage(1)}
                      disabled={uploadingImage === 1}
                      className="px-3 py-1.5 rounded-lg bg-primary flex-row items-center gap-1 shadow-xs"
                    >
                      {uploadingImage === 1 ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Upload size={12} color="#fff" />
                      )}
                      <Text className="font-poppins font-bold text-[10px] text-white">
                        {uploadingImage === 1 ? "Uploading..." : "Upload 1"}
                      </Text>
                    </TouchableOpacity>

                    {Boolean(isCustomImage) ? (
                      <TouchableOpacity
                        onPress={handleUseDefaultImage}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200"
                      >
                        <Text className="font-poppins font-semibold text-[10px] text-gray-700">Use Default</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Slot 2: Secondary Flyer / Combo Flyer */}
              <View className="p-3 bg-gray-50 border border-gray-200 rounded-2xl mb-4 flex-row items-center gap-3">
                <View className="w-16 h-16 rounded-xl overflow-hidden border border-amber-200 bg-white shadow-xs items-center justify-center">
                  {form.image2 ? (
                    <FestivalOfferThumb
                      key={form.image2}
                      uri={form.image2}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <ImageIcon size={22} color="#9ca3af" />
                  )}
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="font-poppins font-bold text-xs text-dark">
                    Image 2: Flyer / Combo (Optional)
                  </Text>
                  <Text className="font-nunito text-[11px] text-gray mt-0.5 leading-snug">
                    {form.image2 ? "Secondary flyer uploaded" : "Add 2nd flyer/combo poster"}
                  </Text>

                  <View className="flex-row items-center gap-2 mt-2">
                    <TouchableOpacity
                      onPress={() => handlePickImage(2)}
                      disabled={uploadingImage === 2}
                      className="px-3 py-1.5 rounded-lg bg-primary flex-row items-center gap-1 shadow-xs"
                    >
                      {uploadingImage === 2 ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Upload size={12} color="#fff" />
                      )}
                      <Text className="font-poppins font-bold text-[10px] text-white">
                        {uploadingImage === 2 ? "Uploading..." : "Upload 2"}
                      </Text>
                    </TouchableOpacity>

                    {Boolean(form.image2) ? (
                      <TouchableOpacity
                        onPress={() => setForm((prev) => ({ ...prev, image2: "" }))}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200"
                      >
                        <Text className="font-poppins font-semibold text-[10px] text-rose-600">Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Title */}
              <Text className="font-poppins font-bold text-xs text-dark mb-1">Festival / Offer Title *</Text>
              <TextInput
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="e.g. Ganapati festive offer / Diwali Dhamaka"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-nunito text-xs text-dark mb-3"
              />

              {/* Category */}
              <Text className="font-poppins font-bold text-xs text-dark mb-1.5">Apply Discount To Category *</Text>
              <View className="flex-row gap-2 mb-3">
                {[
                  { id: "food", label: "Food Only" },
                  { id: "grocery", label: "Grocery" },
                  { id: "both", label: "Both (All)" },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setForm({ ...form, category: c.id })}
                    className={cn(
                      "flex-1 py-2 rounded-xl border items-center",
                      form.category === c.id ? "bg-primary border-primary" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <Text className={cn("font-poppins font-semibold text-xs", form.category === c.id ? "text-white" : "text-dark")}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Discount Percent */}
              <Text className="font-poppins font-bold text-xs text-dark mb-1">Discount (% OFF) *</Text>
              <TextInput
                keyboardType="numeric"
                value={form.discountPercent}
                onChangeText={(t) => setForm({ ...form, discountPercent: t })}
                placeholder="10"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-poppins font-bold text-xs text-dark mb-3"
              />

              {/* Offer Timing & Auto-Expiry */}
              <View className="mb-3">
                <Text className="font-poppins font-bold text-xs text-dark mb-1">Offer Timing & Auto-Expiry</Text>
                
                {/* Quick Presets */}
                <View className="flex-row gap-1.5 mb-2.5 flex-wrap">
                  <TouchableOpacity
                    onPress={() => applyQuickDates("today")}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <Text className="font-poppins font-bold text-[10px] text-amber-800">⚡ Today Only</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => applyQuickDates("3days")}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <Text className="font-poppins font-bold text-[10px] text-amber-800">📅 3 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => applyQuickDates("7days")}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <Text className="font-poppins font-bold text-[10px] text-amber-800">🎉 7 Days</Text>
                  </TouchableOpacity>
                  {Boolean(form.startDate || form.endDate) ? (
                    <TouchableOpacity
                      onPress={() => applyQuickDates("clear")}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200"
                    >
                      <Text className="font-poppins font-semibold text-[10px] text-gray-700">Clear Dates</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Interactive Visual Calendar Triggers */}
                <View className="flex-row gap-2">
                  {/* Start Date Trigger */}
                  <TouchableOpacity
                    onPress={() => setCalendarPickerTarget("start")}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-nunito font-semibold text-[10px] text-gray-500">Start Date & Time</Text>
                      <Calendar size={13} color="#047857" />
                    </View>
                    <Text className={cn("font-poppins text-xs", form.startDate ? "text-dark font-bold" : "text-gray-400 font-normal")} numberOfLines={1}>
                      {form.startDate ? formatDisplayDate(form.startDate) : "Tap to choose start"}
                    </Text>
                  </TouchableOpacity>

                  {/* End Date Trigger */}
                  <TouchableOpacity
                    onPress={() => setCalendarPickerTarget("end")}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-nunito font-semibold text-[10px] text-gray-500">End Date (Auto-Expires)</Text>
                      <Calendar size={13} color="#d97706" />
                    </View>
                    <Text className={cn("font-poppins text-xs", form.endDate ? "text-dark font-bold" : "text-gray-400 font-normal")} numberOfLines={1}>
                      {form.endDate ? formatDisplayDate(form.endDate) : "Tap to choose end"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Description */}
              <Text className="font-poppins font-bold text-xs text-dark mb-1">Offer Description / Note (Optional)</Text>
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                placeholder="e.g. Special festive discounts on homemade food"
                multiline
                numberOfLines={2}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-nunito text-xs text-dark mb-3"
              />

              {/* Toggle */}
              <TouchableOpacity
                onPress={() => setForm({ ...form, enabled: !form.enabled })}
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4"
              >
                <Text className="font-poppins font-bold text-xs text-dark">Enable Festival Offer Now</Text>
                <View className={cn("w-5 h-5 rounded border items-center justify-center", form.enabled ? "bg-primary border-primary" : "border-gray-300")}>
                  {form.enabled ? <Check size={14} color="#fff" /> : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="w-full py-3 bg-primary rounded-xl items-center justify-center flex-row gap-2 mb-6"
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={16} color="#fff" />}
                <Text className="font-poppins font-bold text-sm text-white">Save Festival Offer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visual Interactive Calendar Picker Modal */}
      <CalendarPickerModal
        visible={calendarPickerTarget !== null}
        onClose={() => setCalendarPickerTarget(null)}
        title={calendarPickerTarget === "start" ? "Select Start Date & Time" : "Select Expiry Date & Time"}
        initialValue={calendarPickerTarget === "start" ? form.startDate : form.endDate}
        onSelect={(val) => {
          if (calendarPickerTarget === "start") {
            setForm((p) => ({ ...p, startDate: val }))
          } else if (calendarPickerTarget === "end") {
            setForm((p) => ({ ...p, endDate: val }))
          }
        }}
      />
    </View>
  )
}
