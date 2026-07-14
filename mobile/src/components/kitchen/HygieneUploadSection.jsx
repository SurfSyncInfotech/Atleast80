import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Alert, ScrollView } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import {
  Upload,
  Send,
  Trash2,
  Image as ImageIcon,
  Video,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react-native"
import { api, uploadFiles } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

function MediaTile({ item, pending = false, onRemove }) {
  const mediaType = item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image")
  const uri = item.mediaUrl ? resolveMediaUrl(item.mediaUrl) : item.uri
  const isImage = mediaType === "image"

  return (
    <View className="w-[31%] aspect-square rounded-xl overflow-hidden bg-cream border border-gray-light/50 relative">
      {isImage && uri ? (
        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="w-full h-full items-center justify-center bg-dark/5">
          <Video size={22} color="#0B6B3A" />
          <Text className="font-nunito text-[9px] text-gray mt-1 text-center px-1" numberOfLines={2}>
            {item.name || "Video"}
          </Text>
        </View>
      )}

      <View className="absolute top-1.5 left-1.5 w-7 h-7 rounded-lg bg-black/55 items-center justify-center">
        {isImage ? <ImageIcon size={14} color="#FFFFFF" /> : <Video size={14} color="#FFFFFF" />}
      </View>

      {pending ? (
        <View className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-primary px-1 py-0.5">
          <Text className="font-nunito font-bold text-[9px] text-white text-center">Ready</Text>
        </View>
      ) : null}

      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-red-600/90 items-center justify-center"
        >
          <Trash2 size={13} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default function HygieneUploadSection({ onChange }) {
  const [items, setItems] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const data = await api("/api/stories/verification/me")
      const nextItems = data.stories || []
      setItems(nextItems)
      onChange?.(nextItems.length)
    } catch {
      setItems([])
      onChange?.(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickFiles = async () => {
    setSelecting(true)
    setError("")
    setSuccess("")
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets?.length) {
        setPendingFiles((prev) => [...prev, ...result.assets])
      }
    } catch (err) {
      setError(err.message || "Failed to choose files")
    } finally {
      setSelecting(false)
    }
  }

  const submitFiles = async () => {
    if (pendingFiles.length === 0) return

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      await uploadFiles("/api/stories/verification", pendingFiles)
      const count = pendingFiles.length
      setPendingFiles([])
      setSuccess(`${count} file(s) submitted for admin review.`)
      await load()
    } catch (err) {
      setError(err.message || "Failed to submit hygiene proof")
    } finally {
      setSubmitting(false)
    }
  }

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const deleteSubmitted = (id) => {
    Alert.alert(
      "Remove media?",
      "This will remove the submitted hygiene proof from admin review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/stories/verification/${id}`, { method: "DELETE" })
              await load()
            } catch (err) {
              setError(err.message || "Failed to remove media")
            }
          },
        },
      ]
    )
  }

  const hasPending = pendingFiles.length > 0
  const hasSubmitted = items.length > 0

  return (
    <View className="bg-white rounded-2xl border border-primary/15 p-4 mb-4 shadow-sm">
      <View className="flex-row items-start gap-3 mb-4">
        <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
          <ShieldCheck size={22} color="#0B6B3A" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-poppins font-semibold text-sm text-dark">Hygiene proof</Text>
            <View className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5">
              <Text className="font-poppins font-bold text-[9px] text-amber-800 uppercase">
                Required
              </Text>
            </View>
          </View>
          <Text className="font-nunito text-xs text-gray mt-1 leading-5">
            Add clear photos or short videos of your kitchen, cooking area, and food preparation.
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
          disabled={selecting || submitting}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3"
        >
          {selecting ? (
            <ActivityIndicator size="small" color="#0B6B3A" />
          ) : (
            <Upload size={15} color="#0B6B3A" />
          )}
          <Text className="font-poppins font-bold text-xs text-primary">
            {selecting ? "Opening..." : "Add media"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submitFiles}
          disabled={submitting || !hasPending}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
            hasPending ? "bg-primary" : "bg-gray-light"
          }`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={15} color="#FFFFFF" />
          )}
          <Text className="font-poppins font-bold text-xs text-white">
            {submitting ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="items-center py-5">
          <ActivityIndicator size="small" color="#0B6B3A" />
          <Text className="font-nunito text-xs text-gray mt-2">Loading uploads...</Text>
        </View>
      ) : !hasPending && !hasSubmitted ? (
        <View className="rounded-xl border border-dashed border-gray-light bg-cream/60 px-4 py-6 items-center">
          <Text className="font-nunito text-sm text-gray text-center">No hygiene media submitted yet.</Text>
          <Text className="font-nunito text-xs text-gray mt-1 text-center">
            Add at least one photo or video, then submit for admin review.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal={false} scrollEnabled={false}>
          {hasPending ? (
            <View className="mb-4">
              <Text className="font-poppins font-bold text-[10px] text-primary uppercase mb-2">
                Ready to submit ({pendingFiles.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {pendingFiles.map((item, index) => (
                  <MediaTile
                    key={`${item.uri}-${index}`}
                    item={item}
                    pending
                    onRemove={() => removePending(index)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {hasSubmitted ? (
            <View>
              <Text className="font-poppins font-bold text-[10px] text-gray uppercase mb-2">
                Submitted ({items.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {items.map((item) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    onRemove={() => deleteSubmitted(item.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}
