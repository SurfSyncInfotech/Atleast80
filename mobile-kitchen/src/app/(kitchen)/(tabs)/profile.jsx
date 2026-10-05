import { useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Store,
  User,
  MapPin,
  Mail,
  Clock,
  Save,
  CheckCircle2,
  Camera,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Phone,
  FileText,
  LocateFixed,
  ImagePlus,
  Trash2,
  CreditCard,
  Wallet,
  Building2
} from "lucide-react-native"
import * as Location from "expo-location"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import LocationMapModal from "../../../components/common/LocationMapModal"
import Button from "../../../components/ui/Button"
import { useAuth } from "../../../context/AuthContext"
import { api, uploadKitchenLogo, uploadKitchenImages } from "../../../lib/api"
import { resolveMediaUrl } from "../../../lib/media"
import { cn } from "../../../lib/utils"

const steps = [
  { id: 1, title: "Kitchen", icon: Store },
  { id: 2, title: "Owner & Contact", icon: User },
  { id: 3, title: "Location & Hours", icon: MapPin },
  { id: 4, title: "Bank & Payout", icon: CreditCard },
]

function kitchenToForm(kitchen) {
  if (!kitchen) return null
  return {
    name: kitchen.name || "",
    ownerName: kitchen.owner_name || kitchen.user_name || kitchen.ownerName || "",
    phone: kitchen.phone || "",
    email: kitchen.email || kitchen.user_email || "",
    speciality: kitchen.speciality || "",
    kitchenType: kitchen.kitchen_type || kitchen.kitchenType || "veg",
    bestItem: kitchen.best_item || kitchen.bestItem || "",
    fssaiNumber: kitchen.fssai_number || kitchen.fssaiNumber || "",
    address: kitchen.address || "",
    city: kitchen.city || "",
    state: kitchen.state || "",
    pincode: kitchen.pincode || "",
    openingTime: kitchen.opening_time || kitchen.openingTime || "",
    description: kitchen.description || "",
    payoutMode: kitchen.payout_mode || kitchen.payoutMode || "upi",
    bankAccountName: kitchen.bank_account_name || kitchen.bankAccountName || "",
    bankName: kitchen.bank_name || kitchen.bankName || "",
    bankAccountNumber: kitchen.bank_account_number || kitchen.bankAccountNumber || "",
    confirmBankAccountNumber: kitchen.bank_account_number || kitchen.bankAccountNumber || "",
    bankIfsc: kitchen.bank_ifsc || kitchen.bankIfsc || "",
    upiId: kitchen.upi_id || kitchen.upiId || "",
  }
}

function ToggleSwitch({ label, description, value, onValueChange, disabled }) {
  return (
    <View className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-white mb-3 shadow-sm">
      <View className="flex-1 pr-4">
        <Text className="font-poppins font-bold text-sm text-dark">{label}</Text>
        <Text className="font-nunito text-[11.5px] text-gray mt-1 leading-relaxed">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E8E8E8", true: "#EAF7EE" }}
        thumbColor={value ? "#0B6B3A" : "#7A7A7A"}
      />
    </View>
  )
}

export default function KitchenProfileScreen() {
  const { kitchen, refreshKitchen } = useAuth()
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleStatusToggle = async (field, value) => {
    setUpdatingStatus(true)
    setError("")
    setSuccess("")
    try {
      const payload = {}
      if (field === "is_active") payload.isActive = value
      if (field === "is_fresh_food_active") payload.isFreshFoodActive = value
      if (field === "is_grocery_active") payload.isGroceryActive = value

      await api("/api/kitchens/me/status", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      await refreshKitchen()
      setSuccess("Visibility settings updated successfully")
    } catch (err) {
      setError(err.message || "Failed to update visibility settings")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const [form, setForm] = useState(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [detectingLocation, setDetectingLocation] = useState(false)

  const handleDetectLocation = async () => {
    setDetectingLocation(true)
    setError("")
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setError("Location permission denied")
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = loc.coords
      const data = await api(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`)
      if (data) {
        const addr = data.address || {}
        const rawState = data.state || addr.state || ""
        let rawCity = data.city || addr.city || ""
        let town = data.town || addr.town || ""
        let district = data.district || addr.district || addr.county || ""

        const societyKeywords = ["society", "housing", "co-operative", "co-op", "apartment", "apt", "colony", "towers", "tower", "residency", "enclave", "chsl", "complex", "villas", "flat", "building", "layout"]
        const isSocietyName = rawCity && societyKeywords.some(kw => rawCity.toLowerCase().includes(kw))

        let city = isSocietyName ? (town || district || rawCity) : (rawCity || town || district || addr.village || "")
        let suburb = data.suburb || addr.suburb || addr.neighbourhood || (isSocietyName ? rawCity : "") || ""
        const postcode = data.postcode || addr.postcode || ""

        let streetAddress = data.formattedAddress || data.displayName || [suburb, city, rawState, postcode].filter(Boolean).join(", ")
        if (!streetAddress && data.display_name) {
          streetAddress = data.display_name.split(",").slice(0, 2).map((s) => s.trim()).join(", ")
        }

        setForm((prev) => ({
          ...prev,
          address: streetAddress || prev.address,
          state: rawState || prev.state,
          city: city || prev.city,
          pincode: postcode || prev.pincode,
        }))
      }
    } finally {
      setDetectingLocation(false)
    }
  }

  const [isMapModalVisible, setIsMapModalVisible] = useState(false)

  const handleConfirmMapLocation = (data) => {
    if (!data) return
    const { address, city, state, pincode } = data
    setForm((prev) => ({
      ...prev,
      address: address || prev.address,
      state: state || prev.state,
      city: city || prev.city,
      pincode: pincode || prev.pincode,
    }))
  }

  const [payoutsList, setPayoutsList] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)

  const fetchPayoutsHistory = async () => {
    setPayoutsLoading(true)
    try {
      const data = await api("/api/kitchens/me/payouts")
      setPayoutsList(data.payouts || [])
    } catch (err) {
      console.log("Failed to load payouts history:", err)
    } finally {
      setPayoutsLoading(false)
    }
  }

  const fetchPayoutSettings = async () => {
    try {
      const data = await api("/api/kitchens/me/payout-settings")
      if (data) {
        setForm((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            payoutMode: data.payoutMode || prev.payoutMode || "upi",
            bankAccountName: data.bankAccountName || prev.bankAccountName || "",
            bankName: data.bankName || prev.bankName || "",
            bankAccountNumber: data.bankAccountNumber || prev.bankAccountNumber || "",
            confirmBankAccountNumber: data.bankAccountNumber || prev.confirmBankAccountNumber || "",
            bankIfsc: data.bankIfsc || prev.bankIfsc || "",
            upiId: data.upiId || prev.upiId || "",
          }
        })
      }
    } catch (err) {
      console.log("Failed to load payout settings:", err)
    }
  }

  useEffect(() => {
    refreshKitchen().catch(() => {})
    fetchPayoutsHistory().catch(() => {})
    fetchPayoutSettings().catch(() => {})
  }, [])

  const [prevKitchen, setPrevKitchen] = useState(null)

  // Sync form state when kitchen object changes
  if (kitchen && kitchen !== prevKitchen) {
    setPrevKitchen(kitchen)
    setForm(kitchenToForm(kitchen))
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSuccess("")
    setError("")
  }

  const validateStep = () => {
    if (step === 1) {
      if (
        !form.name.trim() ||
        !form.speciality.trim() ||
        !form.bestItem.trim() ||
        !form.description.trim()
      ) {
        setError("Kitchen name, speciality, signature dish, and description are required")
        return false
      }
      if ((kitchen?.kitchenImages?.length || 0) < 2) {
        setError("Upload at least 2 cooking area setup photos before continuing")
        return false
      }
    }
    if (step === 2) {
      if (!form.ownerName.trim() || !form.phone.trim() || !form.fssaiNumber.trim()) {
        setError("Owner name, phone, and FSSAI number are required")
        return false
      }
      if (form.phone.length !== 10) {
        setError("Phone number must be 10 digits")
        return false
      }
      if (form.fssaiNumber.trim().length < 10) {
        setError("Enter a valid FSSAI license number")
        return false
      }
    }
    if (step === 3) {
      if (
        !form.address.trim() ||
        !form.city.trim() ||
        !form.state.trim() ||
        !form.pincode.trim()
      ) {
        setError("Full address, city, state, and pincode are required")
        return false
      }
      if (form.pincode.length !== 6) {
        setError("Pincode must be 6 digits")
        return false
      }
      if (!form.openingTime.trim()) {
        setError("Operating hours are required")
        return false
      }
    }
    if (step === 4) {
      if (form.payoutMode === "bank") {
        if (!form.bankAccountName.trim()) {
          setError("Account Holder Name is required")
          return false
        }
        if (!form.bankName.trim()) {
          setError("Bank Name is required")
          return false
        }
        if (!form.bankAccountNumber.trim()) {
          setError("Account Number is required")
          return false
        }
        if (form.bankAccountNumber.trim() !== form.confirmBankAccountNumber.trim()) {
          setError("Account Number and Confirm Account Number do not match")
          return false
        }
        if (!form.bankIfsc.trim() || form.bankIfsc.trim().length !== 11) {
          setError("Valid 11-character IFSC Code is required (e.g. HDFC0001234)")
          return false
        }
      } else {
        if (!form.upiId.trim() || !form.upiId.includes("@")) {
          setError("Valid UPI ID / VPA is required (e.g. name@upi)")
          return false
        }
      }
    }
    setError("")
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleLogoUpload = async () => {
    setUploadingLogo(true)
    setError("")
    setSuccess("")
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0]
        await uploadKitchenLogo({
          uri: fileAsset.uri,
          name: fileAsset.name || "logo.jpg",
          type: fileAsset.mimeType || "image/jpeg",
        })
        await refreshKitchen()
        setSuccess("Logo updated successfully")
      }
    } catch (err) {
      setError(err.message || "Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleImagesUpload = async () => {
    const existingCount = kitchen?.kitchenImages?.length || 0
    if (existingCount >= 5) {
      setError("You can upload at most 5 kitchen images")
      return
    }
    setError("")
    setSuccess("")
    try {
      const remaining = 5 - existingCount
      let selectedFiles = []

      try {
        const imageResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 0.8,
        })
        if (!imageResult.canceled && imageResult.assets && imageResult.assets.length > 0) {
          selectedFiles = imageResult.assets.slice(0, remaining).map((a) => ({
            uri: a.uri,
            name: a.fileName || a.name || `cooking_photo_${Date.now()}.jpg`,
            mimeType: a.mimeType || a.type || "image/jpeg",
          }))
        } else if (imageResult.canceled) {
          return
        }
      } catch (pickerErr) {
        // Fallback to DocumentPicker if ImagePicker fails
        const result = await DocumentPicker.getDocumentAsync({ type: "image/*", multiple: true })
        if (!result.canceled && result.assets && result.assets.length > 0) {
          selectedFiles = result.assets.slice(0, remaining)
        } else {
          return
        }
      }

      if (selectedFiles.length > 0) {
        setUploadingImages(true)
        await uploadKitchenImages(selectedFiles)
        await refreshKitchen()
        setSuccess("Kitchen images uploaded")
      }
    } catch (err) {
      setError(err.message || "Failed to upload kitchen images")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleDeleteImage = async (imageUrl) => {
    setError("")
    setSuccess("")
    try {
      await api("/api/kitchens/me/images", {
        method: "DELETE",
        body: JSON.stringify({ imageUrl }),
      })
      await refreshKitchen()
      setSuccess("Image deleted")
    } catch (err) {
      setError(err.message || "Failed to delete image")
    }
  }

  const handleSave = async () => {
    if (!validateStep()) return

    setError("")
    setSuccess("")
    setSaving(true)
    try {
      await api("/api/kitchens/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          ownerName: form.ownerName,
          phone: form.phone,
          speciality: form.speciality,
          kitchenType: form.kitchenType,
          bestItem: form.bestItem,
          fssaiNumber: form.fssaiNumber,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          openingTime: form.openingTime,
          description: form.description,
        }),
      })

      // Save Bank & Payout settings
      await api("/api/kitchens/me/payout-settings", {
        method: "PUT",
        body: JSON.stringify({
          payoutMode: form.payoutMode,
          bankAccountName: form.bankAccountName,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankIfsc: form.bankIfsc,
          upiId: form.upiId,
        }),
      })

      await refreshKitchen()
      setSuccess("Profile and payout settings saved successfully")
    } catch (err) {
      setError(err.message || "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <SafeAreaView className="flex-1 bg-cream justify-center items-center">
        <ActivityIndicator size="large" color="#0B6B3A" />
      </SafeAreaView>
    )
  }

  const logoUrl = resolveMediaUrl(kitchen?.logo || kitchen?.image)

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-light/35 flex-row items-center justify-between">
        <View>
          <Text className="font-poppins font-bold text-lg text-dark">Kitchen Profile</Text>
          <Text className="font-nunito text-xs text-gray">
            Step {step} of 4 · Update operational & payout details
          </Text>
        </View>
        <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          <Text className="text-[10px] font-poppins font-bold text-primary capitalize">
            {kitchen?.status || "pending"}
          </Text>
        </View>
      </View>

      {/* Step Indicators */}
      <View className="flex-row items-center justify-between px-6 py-3 bg-white border-b border-gray-light/20">
        {steps.map((s, idx) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <View key={s.id} className="flex-row items-center flex-1">
              <View className="items-center flex-1">
                <View
                  className={cn(
                    "w-8 h-8 rounded-xl items-center justify-center",
                    isDone && "bg-primary",
                    isActive && "bg-primary shadow-sm",
                    !isActive && !isDone && "bg-cream-dark text-gray"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} color="#FFF" />
                  ) : (
                    <Icon size={15} color={isActive || isDone ? "#FFF" : "#7A7A7A"} />
                  )}
                </View>
                <Text
                  className={cn(
                    "font-poppins text-[9px] font-bold mt-1",
                    isActive ? "text-primary" : "text-gray"
                  )}
                >
                  {s.title}
                </Text>
              </View>
              {idx < steps.length - 1 ? (
                <View
                  className={cn(
                    "h-0.5 flex-1 mx-2 mb-4 rounded-full",
                    step > s.id ? "bg-primary" : "bg-gray-light"
                  )}
                />
              ) : null}
            </View>
          )
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Shop Status & Visibility Card */}
          <View className="bg-cream-dark/20 p-1.5 rounded-3xl mb-4 border border-gray-light/20">
            <ToggleSwitch
              label="Shop Status"
              description="Toggle whether your kitchen is active and open for orders."
              value={Boolean(kitchen?.is_active ?? true)}
              onValueChange={(val) => handleStatusToggle("is_active", val)}
              disabled={updatingStatus}
            />
            <ToggleSwitch
              label="Fresh Food Delivery"
              description="Show or hide your Fresh Food items (meals, thalis, etc.)."
              value={Boolean(kitchen?.is_fresh_food_active ?? true)}
              onValueChange={(val) => handleStatusToggle("is_fresh_food_active", val)}
              disabled={updatingStatus}
            />
            <ToggleSwitch
              label="Grocery Delivery"
              description="Show or hide your Grocery products."
              value={Boolean(kitchen?.is_grocery_active ?? true)}
              onValueChange={(val) => handleStatusToggle("is_grocery_active", val)}
              disabled={updatingStatus}
            />
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-100 p-3.5 rounded-xl mb-4 flex-row items-center gap-2">
              <ShieldAlert size={16} color="#EF4444" />
              <Text className="text-red-700 text-xs font-nunito flex-1">{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl mb-4 flex-row items-center gap-2">
              <CheckCircle2 size={16} color="#10B981" />
              <Text className="text-emerald-700 text-xs font-nunito flex-1">{success}</Text>
            </View>
          ) : null}

          {/* Form Step Contents */}
          {step === 1 ? (
            <View className="bg-white rounded-2xl border border-gray-light/40 p-4 gap-4 mb-6">
              {/* Logo Section */}
              <View className="flex-row items-center gap-4 bg-cream/40 p-3 rounded-xl border border-gray-light/20">
                <View className="w-16 h-16 bg-cream rounded-full overflow-hidden border border-gray-light justify-center items-center relative">
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} className="w-full h-full object-cover" />
                  ) : (
                    <Text className="font-poppins font-bold text-dark text-lg">
                      {kitchen?.name?.charAt(0) || "K"}
                    </Text>
                  )}
                  {uploadingLogo && (
                    <View className="absolute inset-0 bg-black/40 items-center justify-center">
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                </View>
                <View className="flex-1 justify-center">
                  <Text className="font-poppins font-bold text-sm text-dark">Kitchen Logo</Text>
                  <TouchableOpacity
                    onPress={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 self-start mt-2"
                  >
                    <Camera size={12} color="#0B6B3A" />
                    <Text className="font-poppins font-bold text-[10px] text-primary">Upload Logo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cooking Area Images */}
              <View className="bg-cream/40 p-3 rounded-xl border border-gray-light/20">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="font-poppins font-bold text-sm text-dark">Cooking Area Photos</Text>
                    <Text className="font-nunito text-[10px] text-gray mt-0.5">Upload 2–5 clear photos of your kitchen setup. You can add or delete anytime.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleImagesUpload}
                    disabled={uploadingImages || (kitchen?.kitchenImages?.length || 0) >= 5}
                    className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 shrink-0"
                  >
                    {uploadingImages
                      ? <ActivityIndicator size="small" color="#0B6B3A" />
                      : <ImagePlus size={12} color="#0B6B3A" />}
                    <Text className="font-poppins font-bold text-[10px] text-primary">
                      {uploadingImages ? "Uploading..." : "Add Photos"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {(kitchen?.kitchenImages || []).length > 0 ? (
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {(kitchen?.kitchenImages || []).map((url, idx) => (
                      <View key={url} className="relative" style={{ width: 80, height: 80 }}>
                        <Image
                          source={{ uri: resolveMediaUrl(url) }}
                          style={{ width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" }}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => handleDeleteImage(url)}
                          style={{
                            position: "absolute", top: 4, right: 4,
                            backgroundColor: "#fff", borderRadius: 12,
                            padding: 3, elevation: 2,
                          }}
                        >
                          <Trash2 size={13} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                                ) : (
                  <Text className="font-nunito text-[11px] text-gray mt-1">No photos uploaded yet. Upload at least 2 for admin approval.</Text>
                )}

                <Text className="font-nunito text-[10px] text-gray mt-2">
                  {Math.min(kitchen?.kitchenImages?.length || 0, 5)}/5 photos uploaded.
                  {(kitchen?.kitchenImages?.length || 0) >= 2 ? " Tap the trash icon on any photo to remove it." : " Upload at least 2 for admin approval."}
                </Text>
              </View>

              {/* Fields */}
              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Kitchen Name <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(val) => updateField("name", val)}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Speciality <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.speciality}
                  onChangeText={(val) => updateField("speciality", val)}
                  placeholder="North Indian, Tiffin..."
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Kitchen Type <Text className="text-accent">*</Text>
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { key: "veg", label: "Pure Veg" },
                    { key: "non_veg", label: "Non-Veg" },
                    { key: "both", label: "Veg & Non-Veg" },
                  ].map((t) => {
                    const isSel = form.kitchenType === t.key
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => updateField("kitchenType", t.key)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl border items-center justify-center",
                          isSel ? "border-primary bg-primary/5" : "border-gray-light bg-white"
                        )}
                      >
                        <Text
                          className={cn(
                            "font-poppins font-bold text-[10px] text-center",
                            isSel ? "text-primary" : "text-gray"
                          )}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Signature Dish <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.bestItem}
                  onChangeText={(val) => updateField("bestItem", val)}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  About your kitchen <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.description}
                  onChangeText={(val) => updateField("description", val)}
                  multiline={true}
                  numberOfLines={4}
                  style={{ textAlignVertical: "top" }}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark min-h-[90px]"
                />
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View className="bg-white rounded-2xl border border-gray-light/40 p-4 gap-4 mb-6">
              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Owner Name <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.ownerName}
                  onChangeText={(val) => updateField("ownerName", val)}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Phone <Text className="text-accent">*</Text>
                </Text>
                <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream/40 h-[48px]">
                  <Phone size={15} color="#7A7A7A" className="mr-2" />
                  <TextInput
                    value={form.phone}
                    onChangeText={(val) => updateField("phone", val)}
                    maxLength={10}
                    keyboardType="numeric"
                    className="flex-1 h-full text-sm font-nunito text-dark"
                  />
                </View>
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Email</Text>
                <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream-dark/30 h-[48px]">
                  <Mail size={15} color="#7A7A7A" className="mr-2" />
                  <TextInput
                    value={form.email}
                    editable={false}
                    className="flex-1 h-full text-sm font-nunito text-gray"
                  />
                </View>
                <Text className="font-nunito text-[10px] text-gray mt-1">Email cannot be changed</Text>
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  FSSAI License <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.fssaiNumber}
                  onChangeText={(val) => updateField("fssaiNumber", val)}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="bg-white rounded-2xl border border-gray-light/40 p-4 gap-4 mb-6">
              <TouchableOpacity
                onPress={() => setIsMapModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#0B6B3A",
                  borderRadius: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                }}
              >
                <MapPin size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 12, color: "#FFFFFF" }}>
                  Pin / Pick Location on Map
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDetectLocation}
                disabled={detectingLocation}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#EAF7EE",
                  borderWidth: 1,
                  borderColor: "#0B6B3A",
                  borderRadius: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                }}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#0B6B3A" />
                ) : (
                  <LocateFixed size={16} color="#0B6B3A" />
                )}
                <Text style={{ fontFamily: "Poppins", fontWeight: "bold", fontSize: 12, color: "#0B6B3A" }}>
                  {detectingLocation ? "Detecting Location..." : "Auto-Detect Current Location"}
                </Text>
              </TouchableOpacity>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Full Address <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.address}
                  onChangeText={(val) => updateField("address", val)}
                  multiline={true}
                  numberOfLines={3}
                  style={{ textAlignVertical: "top" }}
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark min-h-[70px]"
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                    City <Text className="text-accent">*</Text>
                  </Text>
                  <TextInput
                    value={form.city}
                    onChangeText={(val) => updateField("city", val)}
                    className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                    State <Text className="text-accent">*</Text>
                  </Text>
                  <TextInput
                    value={form.state}
                    onChangeText={(val) => updateField("state", val)}
                    className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                  />
                </View>
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Pincode <Text className="text-accent">*</Text>
                </Text>
                <TextInput
                  value={form.pincode}
                  onChangeText={(val) => updateField("pincode", val)}
                  maxLength={6}
                  keyboardType="numeric"
                  className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                />
              </View>

              <View>
                <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                  Operating Hours <Text className="text-accent">*</Text>
                </Text>
                <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream/40 h-[48px]">
                  <Clock size={15} color="#7A7A7A" className="mr-2" />
                  <TextInput
                    value={form.openingTime}
                    onChangeText={(val) => updateField("openingTime", val)}
                    placeholder="8:00 AM - 9:00 PM"
                    className="flex-1 h-full text-sm font-nunito text-dark"
                  />
                </View>
              </View>
            </View>
          ) : step === 4 ? (
            <View className="space-y-4">
              <View className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
                <Text className="font-poppins font-bold text-sm text-emerald-950 flex-row items-center">
                  Bank & Payout Details
                </Text>
                <Text className="font-nunito text-xs text-emerald-800 mt-1 leading-relaxed">
                  Choose your preferred payout method. Admin will transfer your weekly order earnings directly to this account or UPI ID.
                </Text>
              </View>

              {/* Mode Selection Tabs */}
              <View className="flex-row bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                <TouchableOpacity
                  onPress={() => updateField("payoutMode", "upi")}
                  className={cn(
                    "flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2",
                    form.payoutMode === "upi" ? "bg-white shadow-sm" : "bg-transparent"
                  )}
                >
                  <Wallet size={16} color={form.payoutMode === "upi" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text
                    className={cn(
                      "font-poppins text-xs font-bold",
                      form.payoutMode === "upi" ? "text-primary" : "text-gray"
                    )}
                  >
                    Instant UPI VPA
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateField("payoutMode", "bank")}
                  className={cn(
                    "flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2",
                    form.payoutMode === "bank" ? "bg-white shadow-sm" : "bg-transparent"
                  )}
                >
                  <Building2 size={16} color={form.payoutMode === "bank" ? "#0B6B3A" : "#7A7A7A"} />
                  <Text
                    className={cn(
                      "font-poppins text-xs font-bold",
                      form.payoutMode === "bank" ? "text-primary" : "text-gray"
                    )}
                  >
                    Bank Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields based on Mode */}
              {form.payoutMode === "upi" ? (
                <View className="bg-white p-4 rounded-2xl border border-gray-light/60 space-y-3">
                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Primary UPI ID / VPA <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.upiId}
                      onChangeText={(val) => updateField("upiId", val)}
                      placeholder="e.g. 7378647099@ybl or name@okaxis"
                      autoCapitalize="none"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                    <Text className="font-nunito text-[11px] text-gray mt-1">
                      Works with GPay, PhonePe, Paytm, or BHIM UPI apps.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="bg-white p-4 rounded-2xl border border-gray-light/60 space-y-3">
                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Account Holder Name <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.bankAccountName}
                      onChangeText={(val) => updateField("bankAccountName", val)}
                      placeholder="Full Name as per Bank Passbook"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>

                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Bank Name <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.bankName}
                      onChangeText={(val) => updateField("bankName", val)}
                      placeholder="e.g. HDFC Bank / State Bank of India"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>

                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Account Number <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.bankAccountNumber}
                      onChangeText={(val) => updateField("bankAccountNumber", val)}
                      placeholder="Enter Bank Account Number"
                      keyboardType="numeric"
                      secureTextEntry={false}
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>

                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Confirm Account Number <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.confirmBankAccountNumber}
                      onChangeText={(val) => updateField("confirmBankAccountNumber", val)}
                      placeholder="Re-enter Bank Account Number"
                      keyboardType="numeric"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>

                  <View>
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      IFSC Code <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.bankIfsc}
                      onChangeText={(val) => updateField("bankIfsc", val.toUpperCase())}
                      placeholder="11-character IFSC Code (e.g. HDFC0001234)"
                      autoCapitalize="characters"
                      maxLength={11}
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-mono font-bold text-sm text-dark uppercase"
                    />
                  </View>
                </View>
              )}

              {/* Recent Payout Settlements History Ledger */}
              <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-light/60 space-y-3">
                <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
                  <View>
                    <Text className="font-poppins font-bold text-sm text-dark">
                      Payout & Settlement History
                    </Text>
                    <Text className="font-nunito text-[11px] text-gray mt-0.5">
                      Transfers & settlements credited by Admin
                    </Text>
                  </View>
                </View>

                {payoutsLoading ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator size="small" color="#0B6B3A" />
                  </View>
                ) : payoutsList.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="font-nunito text-xs text-gray text-center">
                      No payout settlements recorded yet.
                    </Text>
                    <Text className="font-nunito text-[11px] text-gray/70 text-center mt-1">
                      Admin payouts will appear here with Date, Amount, and UTR Reference number once processed.
                    </Text>
                  </View>
                ) : (
                  <View className="space-y-3">
                    {payoutsList.map((p) => (
                      <View key={p.id} className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="font-poppins font-bold text-base text-emerald-700">
                            ₹{p.netPayout}
                          </Text>
                          <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <Text className="font-poppins font-bold text-[10px] text-emerald-800">
                              PAID ✅
                            </Text>
                          </View>
                        </View>
                        <Text className="font-nunito text-xs text-gray-700">
                          Gross: ₹{p.grossAmount} | Comm. (10%): -₹{p.commissionDeduction} | Rider Fee: -₹{p.riderFeeDeduction || Math.max(0, p.grossAmount - p.commissionDeduction - p.netPayout)}
                        </Text>
                        <Text className="font-mono text-xs font-bold text-dark mt-1">
                          UTR Ref: {p.utrNumber || "N/A"}
                        </Text>
                        <Text className="font-nunito text-[10px] text-gray mt-1">
                          Paid Date: {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "N/A"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Step Navigation Button Strip */}
      <View className="flex-row gap-3 px-4 py-3 border-t border-gray-light/30 bg-white">
        {step > 1 ? (
          <TouchableOpacity
            onPress={prevStep}
            className="flex-row items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-gray-light bg-white"
          >
            <ArrowLeft size={16} color="#7A7A7A" />
            <Text className="font-poppins font-bold text-sm text-gray">Back</Text>
          </TouchableOpacity>
        ) : null}

        {step < 4 ? (
          <TouchableOpacity
            onPress={nextStep}
            className="flex-1 flex-row items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-primary"
          >
            <Text className="font-poppins font-bold text-sm text-white">Next</Text>
            <ArrowRight size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <Button
            onPress={handleSave}
            loading={saving}
            className="flex-1 rounded-xl py-3"
          >
            <Save size={16} color="#FFF" />
            <Text className="font-poppins font-bold text-sm text-white">Save Profile & Payouts</Text>
          </Button>
        )}
      </View>
      {/* Location Map Modal */}
      <LocationMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        onConfirmLocation={handleConfirmMapLocation}
        initialAddress={form.address}
        initialCity={form.city}
        initialState={form.state}
      />
    </SafeAreaView>
  )
}
