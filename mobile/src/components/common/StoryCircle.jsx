import { TouchableOpacity, View, Image, Text } from "react-native"
import { Play } from "lucide-react-native"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"
import { LinearGradient } from "expo-linear-gradient"

const SIZES = {
  md: {
    width: 72,
    height: 72,
    text: "text-xl",
    label: "w-[78px]",
  },
  sm: {
    width: 44,
    height: 44,
    text: "text-sm",
    label: "w-11",
  },
}

export default function StoryCircle({ story, className, onPress, showLabel = true, size = "md" }) {
  const logoUrl = resolveMediaUrl(story.image)
  const previewUrl = resolveMediaUrl(story.previewImage)
  const initial = story.name?.[0]?.toUpperCase() || "K"
  const s = SIZES[size] || SIZES.md
  const mediaUrl = previewUrl || logoUrl
  const isVideo = story.mediaType === "video" || story.isVideo

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={cn("items-center flex-col shrink-0", className)}
      style={{ width: s.width + 10 }}
    >
      <LinearGradient
        colors={["#F4C400", "#FF6B00", "#0B6B3A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 9999, width: s.width, height: s.height }}
        className="p-[3px] items-center justify-center"
      >
        <View className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-primary/10 items-center justify-center">
          {mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#0B6B3A", "#064d29"]}
              className="w-full h-full items-center justify-center"
            >
              <Text className={cn("text-white font-poppins font-bold", s.text)}>
                {initial}
              </Text>
            </LinearGradient>
          )}
          {isVideo ? (
            <View className="absolute inset-0 bg-black/20 items-center justify-center">
              <View className="w-7 h-7 rounded-full bg-white/90 items-center justify-center">
                <Play size={14} color="#0B6B3A" fill="#0B6B3A" />
              </View>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      {showLabel && (
        <Text
          className={cn("text-[10px] font-nunito text-dark-light mt-2 text-center", s.label)}
          numberOfLines={1}
        >
          {story.name}
        </Text>
      )}
    </TouchableOpacity>
  )
}
