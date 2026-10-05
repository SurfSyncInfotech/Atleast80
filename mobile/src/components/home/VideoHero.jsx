import React, { useEffect } from "react"
import { useVideoPlayer, VideoView } from "expo-video"

export default function VideoHero() {
  const videoSource = require("../../../assets/images/atleast80.mp4")
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
      // Force disable media notification after mount (expo-video Android bug workaround)
      player.showNowPlayingNotification = false
      player.muted = true
      player.volume = 0
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
