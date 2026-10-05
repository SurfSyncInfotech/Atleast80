const fs = require("fs")
const path = require("path")

// 1. Patch ExpoVideoPlaybackService.kt
const videoServicePath = path.join(
  __dirname,
  "../node_modules/expo-video/android/src/main/java/expo/modules/video/playbackService/ExpoVideoPlaybackService.kt"
)

if (fs.existsSync(videoServicePath)) {
  let content = fs.readFileSync(videoServicePath, "utf8")
  if (!content.includes("// PERMANENTLY_DISABLED_MEDIA_SESSION")) {
    content = content.replace(
      /fun registerPlayer\(videoPlayer: VideoPlayer\) \{[\s\S]*?\n  \}/,
      "fun registerPlayer(videoPlayer: VideoPlayer) {\n    // PERMANENTLY_DISABLED_MEDIA_SESSION\n    return\n  }"
    )
    content = content.replace(
      /override fun onUpdateNotification\(session: MediaSession, startInForegroundRequired: Boolean\) \{[\s\S]*?\n  \}/,
      "override fun onUpdateNotification(session: MediaSession, startInForegroundRequired: Boolean) {\n    return\n  }"
    )
    fs.writeFileSync(videoServicePath, content, "utf8")
    console.log("✔ Expo Video Native MediaSession notifications permanently disabled in Service!")
  }
}

// 2. Patch VideoPlayer.kt for C.USAGE_UNKNOWN audio attributes
const videoPlayerPath = path.join(
  __dirname,
  "../node_modules/expo-video/android/src/main/java/expo/modules/video/player/VideoPlayer.kt"
)

if (fs.existsSync(videoPlayerPath)) {
  let content = fs.readFileSync(videoPlayerPath, "utf8")
  if (!content.includes("C.USAGE_UNKNOWN")) {
    content = content.replace(
      "setAudioAttributes(AudioAttributes.DEFAULT, false)",
      `setAudioAttributes(
        androidx.media3.common.AudioAttributes.Builder()
          .setContentType(C.AUDIO_CONTENT_TYPE_UNKNOWN)
          .setUsage(C.USAGE_UNKNOWN)
          .build(),
        false
      )`
    )
    fs.writeFileSync(videoPlayerPath, content, "utf8")
    console.log("✔ Expo Video Native AudioAttributes patched with C.USAGE_UNKNOWN!")
  }
}
