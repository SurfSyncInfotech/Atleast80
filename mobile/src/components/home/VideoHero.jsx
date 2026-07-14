import React from "react"
import { useVideoPlayer, VideoView } from "expo-video"

export default function VideoHero() {
  const videoSource = require("../../../assets/images/atleast80.mp4")
  const player = useVideoPlayer(videoSource, (playerInstance) => {
    if (playerInstance) {
      playerInstance.loop = true
      playerInstance.muted = true
      playerInstance.play()
    }
  })

  return (
    <VideoView
      player={player}
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      resizeMode="cover"
      allowsFullscreen={false}
      nativeControls={false}
    />
  )
}
