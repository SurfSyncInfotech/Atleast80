import React, { useEffect, useRef } from "react"
import { Platform, Image } from "react-native"
import { useVideoPlayer, VideoView } from "expo-video"

export default function VideoHero() {
  const videoSource = require("../../../assets/images/atleast80.mp4")
  const videoRef = useRef(null)

  // Web (Chrome / DevTools): Standard HTML5 video with direct autoplay & muted
  if (Platform.OS === "web") {
    const asset = Image.resolveAssetSource ? Image.resolveAssetSource(videoSource) : null
    const src = (asset && asset.uri) ? asset.uri : (videoSource?.default || videoSource)

    return (
      <video
        ref={(el) => {
          if (el) {
            el.muted = true
            el.play().catch(() => {})
          }
        }}
        src={typeof src === "string" ? src : String(src)}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
    )
  }

  // Native (Android / iOS): expo-video player
  const player = useVideoPlayer(videoSource, (playerInstance) => {
    if (playerInstance) {
      playerInstance.showNowPlayingNotification = false
      playerInstance.staysActiveInBackground = false
      playerInstance.audioMixingMode = "mixWithOthers"
      playerInstance.loop = true
      playerInstance.muted = true
      playerInstance.volume = 0
      playerInstance.play()
    }
  })

  useEffect(() => {
    if (player) {
      player.showNowPlayingNotification = false
      player.muted = true
      player.volume = 0
      player.play()
    }
  }, [player])

  return (
    <VideoView
      player={player}
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" }}
      contentFit="cover"
      allowsFullscreen={false}
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  )
}
