import { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, Image, TouchableOpacity, Modal, SafeAreaView, Dimensions, ActivityIndicator } from "react-native"
import { X, ChevronLeft, ChevronRight } from "lucide-react-native"
import { resolveMediaUrl } from "../../lib/media"
import { useVideoPlayer, VideoView } from "expo-video"
import { useEvent } from "expo"

const IMAGE_DURATION = 5000
const { width, height } = Dimensions.get("window")

export default function StoryViewerModal({ visible, stories, kitchenName, kitchenImage, onClose }) {
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [imageLoading, setImageLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setStoryIndex(0)
        setProgress(0)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [visible])

  const currentStory = stories?.[storyIndex]
  const mediaUrl = currentStory ? resolveMediaUrl(currentStory.mediaUrl) : null

  const isVideo = currentStory && (
    currentStory.mediaType === "video" || 
    mediaUrl?.toLowerCase().endsWith(".mp4") || 
    mediaUrl?.toLowerCase().endsWith(".mov")
  )

  const goNext = useCallback(() => {
    if (!stories || stories.length === 0) return
    if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1)
      setProgress(0)
      return
    }
    // Finished all stories
    onClose()
  }, [stories, storyIndex, onClose])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      setProgress(0)
    }
  }, [storyIndex])

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
    if (!visible || !currentStory || isVideo || imageLoading) return

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
  }, [currentStory, storyIndex, goNext, isVideo, visible, imageLoading])

  if (!visible || !stories || stories.length === 0) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {/* Media Image / Video */}
        <View className="absolute inset-0 items-center justify-center">
          {mediaUrl ? (
            isVideo ? (
              <VideoView
                player={player}
                style={{ width: width, height: height }}
                resizeMode="contain"
              />
            ) : (
              <Image
                key={mediaUrl}
                source={{ uri: mediaUrl }}
                style={{ width: width, height: height }}
                resizeMode="contain"
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

        <SafeAreaView pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 20 }} className="justify-between">
          <View pointerEvents="box-none">
            {/* Progress Indicators */}
            <View className="flex-row gap-1 px-3 pt-3">
              {stories.map((s, i) => (
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
                  {kitchenImage ? (
                    <Image
                      source={{ uri: kitchenImage }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-white text-xs font-bold font-poppins">
                      {kitchenName?.[0]?.toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text className="font-poppins font-semibold text-white text-sm">
                    {kitchenName}
                  </Text>
                  <Text className="font-nunito text-white/60 text-[10px]">
                    {new Date(currentStory.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation helpers at bottom */}
          <View pointerEvents="box-none" className="flex-row justify-between px-6 pb-6">
            <TouchableOpacity
              onPress={goPrev}
              disabled={storyIndex === 0}
              className={`w-10 h-10 rounded-full bg-white/10 items-center justify-center ${
                storyIndex === 0 ? "opacity-30" : ""
              }`}
            >
              <ChevronLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goNext}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}
