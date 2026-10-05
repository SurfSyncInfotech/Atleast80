import { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { X } from "lucide-react-native"
import { api } from "../../lib/api"
import { resolveStoryGroups, resolveMediaUrl } from "../../lib/media"
import { getCachedStoryGroups, setCachedStoryGroups } from "../../lib/storyCache"
import { useVideoPlayer, VideoView } from "expo-video"
import { useEvent } from "expo"

const IMAGE_DURATION = 5000
const { width, height } = Dimensions.get("window")

export default function StoryViewerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const initialGroups = getCachedStoryGroups()
  const initialGroupIndex = Math.max(0, Number(params.groupIndex || 0) || 0)

  const [groups, setGroups] = useState(initialGroups)
  const [loading, setLoading] = useState(initialGroups.length === 0)
  const [groupIndex, setGroupIndex] = useState(
    initialGroups[initialGroupIndex] ? initialGroupIndex : 0
  )
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [imageLoading, setImageLoading] = useState(false)
  const timerRef = useRef(null)
  const closeStories = useCallback(() => {
    router.replace("/(customer)/(tabs)/stories")
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      api("/api/stories")
      .then((data) => {
        const resolved = resolveStoryGroups(data.groups || data)
        setCachedStoryGroups(resolved)
        setGroups(resolved)
        if (resolved.length === 0) {
          closeStories()
          return
        }
        if (resolved[initialGroupIndex]) {
          setGroupIndex(initialGroupIndex)
        }
      })
      .catch(() => {
        if (initialGroups.length === 0) {
          closeStories()
        }
      })
      .finally(() => setLoading(false))
    }, 0)

    return () => clearTimeout(timer)
  }, [closeStories, initialGroupIndex, initialGroups.length])

  const currentGroup = groups[groupIndex]
  const currentStory = currentGroup?.stories[storyIndex]
  const mediaUrl = currentStory ? resolveMediaUrl(currentStory.mediaUrl) : null

  const isVideo = currentStory && (
    currentStory.mediaType === "video" || 
    mediaUrl?.toLowerCase().endsWith(".mp4") || 
    mediaUrl?.toLowerCase().endsWith(".mov")
  )


  const goNext = useCallback(() => {
    if (groups.length === 0) return
    const group = groups[groupIndex]
    if (!group) return

    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1)
      setProgress(0)
      return
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1)
      setStoryIndex(0)
      setProgress(0)
      return
    }
    // Finished all stories
    closeStories()
  }, [groups, groupIndex, storyIndex, closeStories])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      setProgress(0)
      return
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1]
      setGroupIndex((i) => i - 1)
      setStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [storyIndex, groupIndex, groups])

  useEffect(() => {
    const nextStory = currentGroup?.stories?.[storyIndex + 1] || groups[groupIndex + 1]?.stories?.[0]
    const nextUrl = nextStory?.mediaUrl ? resolveMediaUrl(nextStory.mediaUrl) : null
    const nextIsImage = nextUrl && !nextUrl.toLowerCase().endsWith(".mp4") && !nextUrl.toLowerCase().endsWith(".mov")
    if (nextIsImage) {
      Image.prefetch(nextUrl).catch(() => {})
    }
  }, [currentGroup, groups, groupIndex, storyIndex])

  // Setup video player
  const player = useVideoPlayer(isVideo ? mediaUrl : null, (playerInstance) => {
    if (playerInstance) {
      playerInstance.showNowPlayingNotification = false
      playerInstance.staysActiveInBackground = false
      playerInstance.audioMixingMode = "mixWithOthers"
      playerInstance.loop = false
      playerInstance.play()
    }
  })

  // Track video player status
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  })

  const isMediaLoading = mediaUrl && (
    isVideo
      ? (status !== "readyToPlay")
      : imageLoading
  )

  // Listen to video completion to goNext
  useEffect(() => {
    if (!player || !isVideo) return

    const subscription = player.addListener("playToEnd", () => {
      goNext()
    })

    return () => {
      subscription.remove()
    }
  }, [player, isVideo, goNext])

  // Track video progress
  useEffect(() => {
    if (!player || !isVideo) return

    const progressTimer = setInterval(() => {
      const duration = player.duration
      const currentTime = player.currentTime
      if (duration > 0) {
        setProgress((currentTime / duration) * 100)
      }
    }, 50)

    return () => clearInterval(progressTimer)
  }, [player, isVideo])

  // Progress Timer for images
  useEffect(() => {
    if (loading || !currentStory || isVideo || imageLoading) return

    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / IMAGE_DURATION) * 100, 100)
      setProgress(pct)
      if (elapsed >= IMAGE_DURATION) {
        clearInterval(timerRef.current)
        goNext()
      }
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [currentStory, groupIndex, storyIndex, goNext, loading, isVideo, imageLoading])

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    )
  }

  if (!currentGroup || !currentStory) return null

  return (
    <View className="flex-1 bg-black">
      {/* Media Image / Video */}
      <View className="absolute inset-0 items-center justify-center">
        {mediaUrl ? (
          isVideo ? (
            <VideoView
              player={player}
              style={{ width: width, height: height }}
              resizeMode="cover"
            />
          ) : (
            <Image
              key={mediaUrl}
              source={{ uri: mediaUrl }}
              style={{ width: width, height: height }}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
          )
        ) : null}
        {isMediaLoading ? (
          <View className="absolute inset-0 items-center justify-center bg-black z-20">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {/* Absolute Tap zones behind header but in front of media */}
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, flexDirection: "row", zIndex: 10 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={goPrev}
          style={{ flex: 1, height: "100%" }}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={goNext}
          style={{ flex: 1, height: "100%" }}
        />
      </View>

      <SafeAreaView pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 20 }}>
        <View pointerEvents="box-none">
          {/* Progress Indicators */}
          <View className="flex-row gap-1 px-3 pt-3">
            {currentGroup.stories.map((s, i) => (
              <View key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <View
                  style={{
                    height: "100%",
                    backgroundColor: "#FFFFFF",
                    width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                  }}
                />
              </View>
            ))}
          </View>

          {/* Header containing kitchen info and close button */}
          <View className="flex-row items-center justify-between px-4 mt-4">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center overflow-hidden">
                {currentGroup.kitchenImage ? (
                  <Image
                    source={{ uri: currentGroup.kitchenImage }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-white text-xs font-bold font-poppins">
                    {currentGroup.kitchenName?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View>
                <Text className="font-poppins font-semibold text-white text-sm">
                  {currentGroup.kitchenName}
                </Text>
                <Text className="font-nunito text-white/60 text-[10px]">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={closeStories} className="p-2">
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}
