import { useState } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Alert, Platform } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import {
  Upload,
  Send,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react-native"
import { useAuth } from "../../context/AuthContext"
import { api, uploadKitchenImages } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

export default function HygieneUploadSection({ onChange }) {
  const { kitchen, refreshKitchen } = useAuth()
  const [pendingFiles, setPendingFiles] = useState([])
  const [selecting, setSelecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const existingImages = kitchen?.kitchenImages || []
  const totalCount = existingImages.length + pendingFiles.length

  const pickFiles = async () => {
    setSelecting(true)
    setError("")
    setSuccess("")
    try {
      const remainingAllowed = 5 - existingImages.length
      if (remainingAllowed <= 0) {
        setError("Maximum 5 cooking area photos allowed.")
        return
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets?.length) {
        const selected = result.assets.slice(0, remainingAllowed)
        const combinedCount = existingImages.length + selected.length

        if (combinedCount < 2) {
          setError("At least 2 cooking area setup photos are required. Please select at least 2 photos.")
        }
        setPendingFiles((prev) => [...prev, ...selected])
      }
    } catch (err) {
      setError(err.message || "Failed to choose photos")
    } finally {
      setSelecting(false)
    }
  }

  const submitFiles = async () => {
    if (pendingFiles.length === 0) return
    if (existingImages.length === 0 && pendingFiles.length < 2) {
      setError("At least 2 cooking area setup photos are required for submission.")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      await uploadKitchenImages(pendingFiles)
      setPendingFiles([])
      await refreshKitchen()
      setSuccess("Cooking area setup photos uploaded successfully for admin review!")
      onChange?.(kitchen?.kitchenImages?.length || pendingFiles.length)
    } catch (err) {
      setError(err.message || "Failed to upload cooking area photos")
    } finally {
      setSubmitting(false)
    }
  }

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const performDelete = async (imageUrl) => {
    setDeletingUrl(imageUrl)
    setError("")
    setSuccess("")
    try {
      await api("/api/kitchens/me/images", {
        method: "DELETE",
        body: JSON.stringify({ imageUrl }),
      })
      await refreshKitchen()
      setSuccess("Photo deleted successfully")
      onChange?.(kitchen?.kitchenImages?.length ? kitchen.kitchenImages.length - 1 : 0)
    } catch (err) {
      setError(err.message || "Failed to delete photo")
    } finally {
      setDeletingUrl(null)
    }
  }

  const deleteExisting = (imageUrl) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Remove this cooking area setup photo?")) {
        performDelete(imageUrl)
      }
      return
    }

    Alert.alert(
      "Delete photo?",
      "Remove this cooking area setup photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(imageUrl),
        },
      ]
    )
  }

  return (
    <View className="bg-white rounded-2xl border border-primary/15 p-4 mb-4 shadow-sm">
      <View className="flex-row items-start gap-3 mb-4">
        <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
          <ShieldCheck size={22} color="#0B6B3A" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-poppins font-semibold text-sm text-dark">Cooking Area Setup Photos</Text>
            <View className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5">
              <Text className="font-poppins font-bold text-[9px] text-amber-800 uppercase">
                Min 2 Required
              </Text>
            </View>
          </View>
          <Text className="font-nunito text-xs text-gray mt-1 leading-5">
            Upload at least 2 clear photos of your cooking area and kitchen setup for Admin approval.
          </Text>
        </View>
      </View>

      {error ? (
        <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex-row items-center gap-2">
          <ShieldAlert size={15} color="#EF4444" />
          <Text className="font-nunito text-xs text-red-700 flex-1">{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 flex-row items-center gap-2">
          <CheckCircle2 size={15} color="#059669" />
          <Text className="font-nunito text-xs text-emerald-700 flex-1">{success}</Text>
        </View>
      ) : null}

      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={pickFiles}
          disabled={selecting || submitting || existingImages.length >= 5}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 ${
            existingImages.length >= 5 ? "opacity-50" : ""
          }`}
        >
          {selecting ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <Upload size={15} color="#0B6B3A" />
          )}
          <Text className="font-poppins font-bold text-xs text-primary">
            {selecting ? "Selecting..." : "Add Photos"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submitFiles}
          disabled={submitting || pendingFiles.length === 0}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
            pendingFiles.length > 0 ? "bg-primary" : "bg-gray-light"
          }`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={15} color="#FFFFFF" />
          )}
          <Text className="font-poppins font-bold text-xs text-white">
            {submitting ? "Uploading..." : "Submit Photos"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Uploaded & Pending Photos Grid */}
      <View className="mb-2">
        {existingImages.length === 0 && pendingFiles.length === 0 ? (
          <View className="rounded-xl border border-dashed border-gray-light bg-cream/60 px-4 py-6 items-center">
            <ImageIcon size={28} color="#7A7A7A" />
            <Text className="font-nunito text-sm font-semibold text-dark text-center mt-2">
              No cooking area photos uploaded yet.
            </Text>
            <Text className="font-nunito text-xs text-gray mt-1 text-center">
              Please upload at least 2 clear photos of your cooking area for Admin review.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {/* Already Uploaded Images */}
            {existingImages.map((url, index) => (
              <View key={url} className="w-[30%] aspect-square rounded-xl overflow-hidden bg-cream border border-emerald-500/40 relative">
                <Image source={{ uri: resolveMediaUrl(url) }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute top-1 left-1 bg-emerald-600 px-1.5 py-0.5 rounded">
                  <Text className="font-poppins font-bold text-[8px] text-white uppercase">Setup {index + 1}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteExisting(url)}
                  disabled={deletingUrl === url}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 items-center justify-center border border-red-100"
                >
                  {deletingUrl === url ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={12} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </View>
            ))}

            {/* Pending Files (Selected but not submitted) */}
            {pendingFiles.map((file, index) => (
              <View key={`${file.uri}-${index}`} className="w-[30%] aspect-square rounded-xl overflow-hidden bg-primary/5 border border-dashed border-primary relative">
                <Image source={{ uri: file.uri }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute top-1 left-1 bg-amber-500 px-1.5 py-0.5 rounded">
                  <Text className="font-poppins font-bold text-[8px] text-white uppercase">Ready</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removePending(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 items-center justify-center border border-gray-200"
                >
                  <Trash2 size={12} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text className="font-nunito text-[11px] text-gray mt-2">
        {totalCount}/5 photos selected. {totalCount < 2 ? "Minimum 2 photos required." : "Photos ready for Admin review."}
      </Text>
    </View>
  )
}

