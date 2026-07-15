import { useEffect, useState, useCallback } from "react"
import { Settings, Upload, FileText, Video, Trash2 } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import {
  api,
  uploadPartnerAgreementPdf,
  uploadTrainingVideo,
  deletePartnerAgreementPdf,
  deleteTrainingVideo,
} from "../../lib/api"

function formatDate(value) {
  if (!value) return ""
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminSettingsPage() {
  const [agreement, setAgreement] = useState(null)
  const [trainingVideo, setTrainingVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [videoMessage, setVideoMessage] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api("/api/admin/settings/partner-agreement", {}, "admin").catch(() => null),
      api("/api/admin/settings/training-video", {}, "admin").catch(() => null),
    ])
      .then(([agreementData, videoData]) => {
        setAgreement(agreementData)
        setTrainingVideo(videoData)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setMessage("")
    try {
      const data = await uploadPartnerAgreementPdf(file)
      setAgreement({ url: data.url, version: data.version, updatedAt: data.updatedAt })
      setFile(null)
      setMessage("Partner Agreement updated successfully")
    } catch (err) {
      setMessage(err.message || "Failed to upload Partner Agreement")
    } finally {
      setUploading(false)
    }
  }

  const handleVideoUpload = async (e) => {
    e.preventDefault()
    if (!videoFile) return
    setVideoUploading(true)
    setVideoMessage("")
    try {
      const data = await uploadTrainingVideo(videoFile)
      setTrainingVideo({ url: data.url, version: data.version, updatedAt: data.updatedAt })
      setVideoFile(null)
      setVideoMessage("Training video updated successfully")
    } catch (err) {
      setVideoMessage(err.message || "Failed to upload training video")
    } finally {
      setVideoUploading(false)
    }
  }

  const handleDeleteAgreement = async () => {
    if (!window.confirm("Are you sure you want to delete the Partner Agreement? New signups will not see any agreement.")) return
    setUploading(true)
    setMessage("")
    try {
      await deletePartnerAgreementPdf()
      setAgreement(null)
      setMessage("Partner Agreement deleted successfully")
    } catch (err) {
      setMessage(err.message || "Failed to delete Partner Agreement")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteVideo = async () => {
    if (!window.confirm("Are you sure you want to delete the Training Video? New signups will not see any training video.")) return
    setVideoUploading(true)
    setVideoMessage("")
    try {
      await deleteTrainingVideo()
      setTrainingVideo(null)
      setVideoMessage("Training video deleted successfully")
    } catch (err) {
      setVideoMessage(err.message || "Failed to delete training video")
    } finally {
      setVideoUploading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} className="text-primary" />
          <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Card 1: Partner Agreement */}
          <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">Partner Agreement & Terms</h2>
                <p className="font-nunito text-sm text-gray mt-1">
                  Sellers view and accept this PDF during onboarding. Uploading a new file replaces the version shown to new sign-ups.
                </p>
              </div>

              {loading ? (
                <div className="h-28 rounded-lg bg-[#f8f8f8] animate-pulse" />
              ) : agreement?.url ? (
                <div className="rounded-lg border border-[#e8e8e8] p-4 flex items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} className="text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={agreement.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-poppins text-sm font-medium text-primary hover:underline truncate block max-w-[200px] sm:max-w-xs"
                      >
                        View current agreement
                      </a>
                      <p className="font-nunito text-xs text-gray mt-0.5">
                        Version {agreement.version}
                        {agreement.updatedAt ? ` · Updated ${formatDate(agreement.updatedAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAgreement}
                    disabled={uploading}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete Agreement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e8e8e8] p-4 text-sm font-nunito text-gray bg-gray-50/50">
                  No Partner Agreement uploaded yet. Sellers won&apos;t be able to complete registration until one is added.
                </div>
              )}
            </div>

            <form onSubmit={handleUpload} className="space-y-3 mt-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Upload size={20} className="text-gray" />
                <span className="font-nunito text-sm text-gray text-center max-w-[250px] truncate">
                  {file ? file.name : "Choose a PDF to upload"}
                </span>
              </label>

              {message && (
                <p className={`text-xs font-nunito ${message.includes("success") ? "text-primary" : "text-red-600"}`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload new PDF"}
              </button>
            </form>
          </div>

          {/* Card 2: Training Video */}
          <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">Onboarding Training Video</h2>
                <p className="font-nunito text-sm text-gray mt-1">
                  Sellers must watch this video during onboarding. Uploading a new video replaces the version shown to new sign-ups.
                </p>
              </div>

              {loading ? (
                <div className="h-28 rounded-lg bg-[#f8f8f8] animate-pulse" />
              ) : trainingVideo?.url ? (
                <div className="rounded-lg border border-[#e8e8e8] p-4 flex items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Video size={20} className="text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={trainingVideo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-poppins text-sm font-medium text-primary hover:underline truncate block max-w-[200px] sm:max-w-xs"
                      >
                        Watch current training video
                      </a>
                      <p className="font-nunito text-xs text-gray mt-0.5">
                        Version {trainingVideo.version}
                        {trainingVideo.updatedAt ? ` · Updated ${formatDate(trainingVideo.updatedAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteVideo}
                    disabled={videoUploading}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete Video"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e8e8e8] p-4 text-sm font-nunito text-gray bg-gray-50/50">
                  No Training Video uploaded yet. Sellers won&apos;t be able to complete registration until one is added.
                </div>
              )}
            </div>

            <form onSubmit={handleVideoUpload} className="space-y-3 mt-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
                <Upload size={20} className="text-gray" />
                <span className="font-nunito text-sm text-gray text-center max-w-[250px] truncate">
                  {videoFile ? videoFile.name : "Choose a video (MP4, WebM) to upload"}
                </span>
              </label>

              {videoMessage && (
                <p className={`text-xs font-nunito ${videoMessage.includes("success") ? "text-primary" : "text-red-600"}`}>
                  {videoMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!videoFile || videoUploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                {videoUploading ? "Uploading..." : "Upload new Video"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
