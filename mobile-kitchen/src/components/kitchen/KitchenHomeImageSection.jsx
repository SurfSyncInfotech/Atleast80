import { useState } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { ImageIcon, Upload, CheckCircle2, ShieldAlert } from "lucide-react-native"
import { uploadKitchenCover } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

export default function KitchenHomeImageSection({ kitchen, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const coverUrl = resolveMediaUrl(kitchen?.cover_image || kitchen?.cover)
  const hasCover = Boolean(coverUrl)

  const handleUpload = async () => {
    setUploading(true)
    setError("")
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets?.length) {
        await uploadKitchenCover(result.assets[0])
        await onUploaded?.()
      }
    } catch (err) {
      setError(err.message || "Failed to upload home card image")
    } finally {
      setUploading(false)
    }
  }

  return (
    <View className="bg-white rounded-2xl border border-primary/15 p-4 mb-4 shadow-sm">
      <View className="flex-row items-start gap-3 mb-4">
        <View className="w-11 h-11 rounded-xl bg-secondary/20 items-center justify-center">
          <ImageIcon size={22} color="#1F1F1F" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-poppins font-semibold text-sm text-dark">Home card image</Text>
            <View className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5">
              <Text className="font-poppins font-bold text-[9px] text-amber-800 uppercase">
                Required
              </Text>
            </View>
          </View>
          <Text className="font-nunito text-xs text-gray mt-1 leading-5">
            This image appears on customer home and admin approval screens.
          </Text>
        </View>
      </View>

      {error ? (
        <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex-row items-center gap-2">
          <ShieldAlert size={15} color="#EF4444" />
          <Text className="font-nunito text-xs text-red-700 flex-1">{error}</Text>
        </View>
      ) : null}

      {hasCover ? (
        <View className="gap-3">
          <View className="relative rounded-xl overflow-hidden border border-gray-light/50 bg-cream h-44">
            <Image source={{ uri: coverUrl }} className="w-full h-full" resizeMode="cover" />
            <View className="absolute top-3 left-3 flex-row items-center gap-1 rounded-lg bg-primary px-2.5 py-1">
              <CheckCircle2 size={14} color="#FFFFFF" />
              <Text className="font-poppins font-semibold text-xs text-white">Uploaded</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading}
            className="self-start flex-row items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#0B6B3A" />
            ) : (
              <Upload size={15} color="#0B6B3A" />
            )}
            <Text className="font-poppins font-bold text-xs text-primary">
              {uploading ? "Uploading..." : "Replace image"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          className="items-center justify-center rounded-xl border-2 border-dashed border-gray-light bg-cream/60 px-5 py-7"
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <Upload size={26} color="#7A7A7A" />
          )}
          <Text className="font-poppins font-bold text-sm text-dark mt-2">
            {uploading ? "Uploading..." : "Upload home image"}
          </Text>
          <Text className="font-nunito text-xs text-gray mt-1 text-center">
            JPG, PNG, WebP, or GIF
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
