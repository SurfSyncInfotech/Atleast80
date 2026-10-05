import { useEffect, useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Alert,
} from "react-native"
import * as DocumentPicker from "expo-document-picker"
import {
  X,
  Upload,
  PlusCircle,
  Trash2,
  Image as ImageIcon,
  Film,
  ShieldAlert,
} from "lucide-react-native"
import { api, uploadStoryFiles } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

function StoryTile({ item, pending = false, onRemove }) {
  const type = item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image")
  const uri = item.mediaUrl ? resolveMediaUrl(item.mediaUrl) : item.uri
  const isImage = type === "image"

  return (
    <View className="w-[31%] aspect-[9/16] rounded-xl overflow-hidden bg-cream border border-gray-light/50 relative">
      {isImage && uri ? (
        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="w-full h-full items-center justify-center bg-primary/5 px-2">
          <Film size={22} color="#0B6B3A" />
          <Text className="font-nunito text-[9px] text-gray mt-1 text-center" numberOfLines={2}>
            {item.name || "Video story"}
          </Text>
        </View>
      )}

      <View className="absolute top-1.5 left-1.5 flex-row items-center gap-1 rounded-md bg-black/55 px-1.5 py-1">
        {isImage ? <ImageIcon size={10} color="#FFFFFF" /> : <Film size={10} color="#FFFFFF" />}
        <Text className="font-poppins text-[8px] text-white capitalize">{type}</Text>
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
          {pending ? <X size={13} color="#FFFFFF" /> : <Trash2 size={13} color="#FFFFFF" />}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default function KitchenStoryModal({ visible, onClose, onUploaded }) {
  const [stories, setStories] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const loadStories = async () => {
    setLoading(true)
    try {
      const data = await api("/api/stories/me")
      setStories(data.stories || [])
    } catch (err) {
      setError(err.message || "Failed to load stories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      setError("")
      setPending([])
      loadStories()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const pickFiles = async () => {
    setSelecting(true)
    setError("")
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets?.length) {
        setPending((prev) => [...prev, ...result.assets])
      }
    } catch (err) {
      setError(err.message || "Failed to choose story media")
    } finally {
      setSelecting(false)
    }
  }

  const uploadPending = async () => {
    if (!pending.length) return

    setUploading(true)
    setError("")
    try {
      await uploadStoryFiles(pending)
      setPending([])
      await loadStories()
      onUploaded?.()
    } catch (err) {
      setError(err.message || "Story upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removePending = (index) => {
    setPending((prev) => prev.filter((_, i) => i !== index))
  }

  const deleteStory = (id) => {
    Alert.alert("Delete story?", "This story will be removed from your kitchen profile.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/stories/${id}`, { method: "DELETE" })
            setStories((prev) => prev.filter((s) => s.id !== id))
            onUploaded?.()
          } catch (err) {
            setError(err.message || "Failed to delete story")
          }
        },
      },
    ])
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%] overflow-hidden">
          <View className="px-5 py-4 border-b border-gray-light/40 flex-row items-center justify-between">
            <View>
              <Text className="font-poppins font-bold text-lg text-dark">Kitchen Stories</Text>
              <Text className="font-nunito text-xs text-gray mt-0.5">
                Upload photos and videos for customers.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-xl bg-cream items-center justify-center">
              <X size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
            {error ? (
              <View className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex-row items-center gap-2">
                <ShieldAlert size={15} color="#EF4444" />
                <Text className="font-nunito text-xs text-red-700 flex-1">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={pickFiles}
              disabled={selecting || uploading}
              className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-5 py-7 items-center mb-5"
            >
              <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-3">
                {selecting ? (
                  <ActivityIndicator size="small" color="#0B6B3A" />
                ) : (
                  <PlusCircle size={24} color="#0B6B3A" />
                )}
              </View>
              <Text className="font-poppins font-semibold text-sm text-dark">
                {selecting ? "Opening picker..." : "Add story photos or videos"}
              </Text>
              <Text className="font-nunito text-xs text-gray text-center mt-1">
                Multiple files supported
              </Text>
            </TouchableOpacity>

            {pending.length > 0 ? (
              <View className="mb-5">
                <Text className="font-poppins font-bold text-[10px] text-primary uppercase mb-2">
                  Ready to upload ({pending.length})
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {pending.map((item, index) => (
                    <StoryTile
                      key={`${item.uri}-${index}`}
                      item={item}
                      pending
                      onRemove={() => removePending(index)}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  onPress={uploadPending}
                  disabled={uploading}
                  className="mt-3 h-12 rounded-xl bg-primary flex-row items-center justify-center gap-2"
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Upload size={17} color="#FFFFFF" />
                  )}
                  <Text className="font-poppins font-bold text-sm text-white">
                    {uploading ? "Uploading..." : `Upload ${pending.length} item${pending.length > 1 ? "s" : ""}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="pb-6">
              <Text className="font-poppins font-bold text-[10px] text-gray uppercase mb-2">
                Live stories ({stories.length})
              </Text>
              {loading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color="#0B6B3A" />
                  <Text className="font-nunito text-xs text-gray mt-2">Loading stories...</Text>
                </View>
              ) : stories.length === 0 ? (
                <View className="rounded-xl bg-cream border border-gray-light/40 px-4 py-6">
                  <Text className="font-nunito text-sm text-gray text-center">
                    No stories yet. Upload your first story above.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {stories.map((story) => (
                    <StoryTile key={story.id} item={story} onRemove={() => deleteStory(story.id)} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
