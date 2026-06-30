import { useEffect, useRef, useState } from "react"
import {
  Video, Circle, Square, CheckCircle, AlertTriangle, SwitchCamera, Trash2,
} from "lucide-react"
import Button from "../ui/Button"
import { api, uploadHygieneVideo, deleteHygieneVideo } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"

export default function HygieneRecordSection({ onUpdated }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const [status, setStatus] = useState(null)
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [cameraReady, setCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState("environment")

  const loadStatus = async () => {
    try {
      const data = await api("/api/hygiene/me/status", {}, "kitchen")
      setStatus(data)
      onUpdated?.(data)
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    loadStatus()
    return () => stopCamera()
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  const startCamera = async (mode) => {
    setError("")
    stopCamera()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
      setFacingMode(mode)
    } catch {
      setError("Camera access is required. Allow camera permission and try again.")
      setCameraReady(false)
    }
  }

  const openRecorder = async () => {
    setPreviewUrl(null)
    setRecordingOpen(true)
    await startCamera("environment")
  }

  const closeRecorder = () => {
    stopCamera()
    setRecordingOpen(false)
    setPreviewUrl(null)
    setRecording(false)
    setFacingMode("environment")
  }

  const flipCamera = async () => {
    if (recording || previewUrl) return
    const next = facingMode === "environment" ? "user" : "environment"
    await startCamera(next)
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      setPreviewUrl(URL.createObjectURL(blob))
      stopCamera()
    }
    recorder.start()
    setRecording(true)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  const submitVideo = async () => {
    if (!previewUrl) return
    setUploading(true)
    setError("")
    try {
      const blob = await fetch(previewUrl).then((r) => r.blob())
      await uploadHygieneVideo(blob)
      setPreviewUrl(null)
      closeRecorder()
      await loadStatus()
    } catch (err) {
      setError(err.message || "Failed to upload video")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete your current hygiene video?")) return
    setDeleting(true)
    setError("")
    try {
      await deleteHygieneVideo()
      await loadStatus()
    } catch (err) {
      setError(err.message || "Failed to delete video")
    } finally {
      setDeleting(false)
    }
  }

  const uploaded = status?.uploaded
  const savedVideoUrl = status?.video?.mediaUrl ? resolveMediaUrl(status.video.mediaUrl) : null

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-secondary/10 p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Video size={22} className="text-primary" />
        </div>
        <div>
          <h3 className="font-poppins font-semibold text-dark">Daily hygiene video</h3>
          <p className="font-nunito text-sm text-gray mt-1 leading-relaxed">
            Record one short video covering your washing area, refrigerator, and cooking area every 24 hours.
          </p>
        </div>
      </div>

      {status && status.requiresUpload && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800 font-nunito">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {status.uploadMessage ||
            "Your daily hygiene video is missing or older than 24 hours. Record and upload a new video to stay visible to customers."}
        </div>
      )}

      {uploaded && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-sm text-primary font-nunito">
          <CheckCircle size={16} />
          Daily video uploaded in the last 24 hours
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
          {error}
        </div>
      )}

      {savedVideoUrl && !recordingOpen && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-poppins text-sm font-semibold text-dark mb-2">Current video</p>
          <video
            src={savedVideoUrl}
            className="w-full max-w-lg rounded-xl aspect-video bg-black mb-3"
            controls
            playsInline
          />
          {status?.video?.recordedAt && (
            <p className="font-nunito text-xs text-gray mb-3">
              Uploaded {new Date(status.video.recordedAt).toLocaleString("en-IN")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={openRecorder} disabled={uploading || deleting}>
              <Video size={16} />
              Record new video
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting || uploading}
              className="!text-red-600 hover:!bg-red-50"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete video"}
            </Button>
          </div>
        </div>
      )}

      {!recordingOpen && !savedVideoUrl && (
        <div>
          <p className="font-nunito text-sm text-gray mb-3">
            Upload a short video covering your washing area, refrigerator, and cooking area. Videos are removed automatically after 24 hours.
          </p>
          <Button type="button" onClick={openRecorder} disabled={uploading || deleting}>
            <Video size={16} />
            Record daily video
          </Button>
        </div>
      )}

      {recordingOpen && (
        <div className="rounded-xl border border-gray-200 bg-black/5 p-4">
          <p className="font-poppins text-sm font-semibold text-dark mb-3">
            Show washing area, fridge, and cooking area in one video
          </p>

          {!previewUrl ? (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-lg mx-auto mb-4">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {cameraReady && !recording && (
                  <button
                    type="button"
                    onClick={flipCamera}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                    aria-label="Flip camera"
                  >
                    <SwitchCamera size={20} />
                  </button>
                )}
              </div>
              <p className="text-center font-nunito text-xs text-gray mb-3">
                {facingMode === "environment" ? "Back camera" : "Front camera"} · tap flip to switch
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {!recording ? (
                  <Button type="button" onClick={startRecording} disabled={!cameraReady}>
                    <Circle size={16} className="fill-red-500 text-red-500" />
                    Start recording
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={stopRecording}>
                    <Square size={16} />
                    Stop recording
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={closeRecorder}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <video src={previewUrl} className="w-full max-w-lg mx-auto rounded-xl aspect-video bg-black mb-4" controls />
              <div className="flex flex-wrap gap-3 justify-center">
                <Button type="button" onClick={submitVideo} disabled={uploading}>
                  {uploading ? "Saving..." : "Save video"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewUrl(null)
                    startCamera(facingMode)
                  }}
                >
                  Re-record
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
