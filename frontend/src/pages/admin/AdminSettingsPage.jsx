import { useEffect, useState, useCallback } from "react"
import { Settings, Upload, FileText, Video, Trash2, Edit2, Check, X, Plus, Phone, Mail, MapPin } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import {
  api,
  uploadPartnerAgreementPdf,
  uploadTrainingVideo,
  deletePartnerAgreementPdf,
  deleteTrainingVideo,
  uploadRiderAgreementPdf,
  deleteRiderAgreementPdf,
  uploadUserAgreementPdf,
  deleteUserAgreementPdf,
  getAdminCmsPolicy,
  updateAdminCmsPolicy,
  getAdminContactSettings,
  updateAdminContactSettings,
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

function PolicyEditor() {
  const [activeTab, setActiveTab] = useState("privacy")
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  // Edit state for specific section
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")

  const loadPolicy = useCallback((type) => {
    setLoading(true)
    setMsg("")
    setEditingId(null)
    getAdminCmsPolicy(type)
      .then((data) => {
        setSections(data.sections || [])
      })
      .catch((err) => {
        setMsg(err.message || "Failed to load policy")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPolicy(activeTab)
  }, [activeTab, loadPolicy])

  const handleStartEdit = (sec) => {
    setEditingId(sec.id)
    setEditTitle(sec.title || "")
    setEditContent(sec.content || "")
    setMsg("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
    setEditContent("")
  }

  const handleSaveEdit = async (index) => {
    if (!editTitle.trim()) {
      alert("Please enter a section title.")
      return
    }

    const updated = [...sections]
    updated[index] = {
      ...updated[index],
      title: editTitle,
      content: editContent,
    }
    setSections(updated)
    setEditingId(null)

    setSaving(true)
    setMsg("")
    try {
      await updateAdminCmsPolicy(activeTab, updated)
      setMsg(`Section updated and ${activeTab === "privacy" ? "Privacy Policy" : "Terms of Service"} saved successfully!`)
    } catch (err) {
      setMsg(err.message || "Failed to save section update")
    } finally {
      setSaving(false)
    }
  }

  const handleAddSection = () => {
    const newNum = String(sections.length + 1).padStart(2, "0")
    const newId = `section_${Date.now()}`
    const newSection = {
      id: newId,
      num: newNum,
      title: "New Section Title",
      content: "Enter your policy text content here...",
    }

    const updated = [...sections, newSection]
    setSections(updated)

    setEditingId(newId)
    setEditTitle(newSection.title)
    setEditContent(newSection.content)
  }

  const handleDeleteSection = async (index) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return
    const updated = sections.filter((_, i) => i !== index)
    const renumbered = updated.map((sec, i) => ({
      ...sec,
      num: String(i + 1).padStart(2, "0"),
    }))
    setSections(renumbered)
    if (editingId === sections[index]?.id) {
      setEditingId(null)
    }

    setSaving(true)
    setMsg("")
    try {
      await updateAdminCmsPolicy(activeTab, renumbered)
      setMsg(`Section deleted and ${activeTab === "privacy" ? "Privacy Policy" : "Terms of Service"} updated successfully!`)
    } catch (err) {
      setMsg(err.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleMove = async (index, direction) => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === sections.length - 1) return
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    const renumbered = updated.map((sec, i) => ({
      ...sec,
      num: String(i + 1).padStart(2, "0"),
    }))
    setSections(renumbered)

    setSaving(true)
    setMsg("")
    try {
      await updateAdminCmsPolicy(activeTab, renumbered)
      setMsg("Sections reordered and saved successfully!")
    } catch (err) {
      setMsg(err.message || "Failed to save order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">Website Legal &amp; Policy Manager</h2>
          <p className="font-nunito text-sm text-gray mt-0.5">
            Manage Privacy Policy and Terms of Service sections displayed live on the website.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`px-4 py-2 text-xs font-poppins font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "privacy" ? "bg-white text-primary shadow-sm" : "text-gray hover:text-dark"
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2 text-xs font-poppins font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "terms" ? "bg-white text-primary shadow-sm" : "text-gray hover:text-dark"
            }`}
          >
            Terms of Service
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg text-sm font-nunito ${
            msg.includes("successfully") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, idx) => {
            const isEditing = editingId === sec.id

            if (isEditing) {
              return (
                <div key={sec.id || idx} className="border-2 border-primary/40 rounded-xl p-4 bg-primary/5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-poppins font-bold text-sm text-primary bg-primary/20 px-2.5 py-1 rounded-lg">
                        {sec.num}
                      </span>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Section Title..."
                        className="font-poppins font-semibold text-dark text-base bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary w-full max-w-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-poppins font-semibold text-gray mb-1">Section Content Text:</label>
                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Section paragraph content..."
                      className="w-full font-nunito text-sm text-dark bg-white border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray hover:bg-gray-100 font-poppins text-xs font-semibold cursor-pointer"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(idx)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-poppins text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} /> {saving ? "Saving..." : "Save & OK"}
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={sec.id || idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-poppins font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {sec.num}
                    </span>
                    <h3 className="font-poppins font-semibold text-dark text-base truncate">{sec.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, "up")}
                      disabled={idx === 0}
                      className="p-1.5 text-xs text-gray hover:text-dark disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, "down")}
                      disabled={idx === sections.length - 1}
                      className="p-1.5 text-xs text-gray hover:text-dark disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sec)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-poppins font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer ml-2 transition-colors"
                      title="Edit Section"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer ml-1"
                      title="Delete Section"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="font-nunito text-sm text-gray/80 line-clamp-2 leading-relaxed pl-1">
                  {sec.content}
                </p>
              </div>
            )
          })}

          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleAddSection}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-primary text-primary hover:bg-primary/5 rounded-xl font-poppins font-semibold text-sm cursor-pointer transition-colors"
            >
              <Plus size={16} /> Add New Section
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactSettingsCard() {
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    getAdminContactSettings()
      .then((data) => {
        setPhone(data.supportPhone || "+91 40 3559 4439")
        setEmail(data.supportEmail || "contact@elifelo.com")
        setAddress(data.supportAddress || "Maharashtra, India")
      })
      .catch((err) => {
        console.error("Failed to load contact settings:", err)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim() || !email.trim()) {
      setIsError(true)
      setMessage("Please enter both support phone number and email address.")
      return
    }

    setSaving(true)
    setMessage("")
    setIsError(false)

    try {
      const res = await updateAdminContactSettings({
        supportPhone: phone.trim(),
        supportEmail: email.trim(),
        supportAddress: address.trim(),
      })
      setPhone(res.supportPhone)
      setEmail(res.supportEmail)
      setAddress(res.supportAddress)
      setIsError(false)
      setMessage("Contact details updated successfully! These changes reflect immediately on the Mobile App (About section) and Website Footer.")
    } catch (err) {
      setIsError(true)
      setMessage(err.message || "Failed to update contact details")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Phone size={18} />
            </span>
            <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">Platform Contact &amp; Support Info</h2>
          </div>
          <p className="font-nunito text-sm text-gray mt-1">
            Manage the official phone number and email address displayed in the Mobile App (About &amp; Contact page) and Website Footer.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm font-nunito flex items-center gap-2 ${
            !isError ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {!isError ? <Check size={16} className="text-emerald-600 flex-shrink-0" /> : <X size={16} className="text-red-600 flex-shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-primary" /> Support Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 40 3559 4439"
                className="w-full font-nunito text-sm text-dark bg-gray-50/60 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                required
              />
              <span className="text-[11px] font-nunito text-gray/70 mt-1 block">
                Shown under &quot;Call Us&quot; in Mobile App &amp; Web Footer
              </span>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-primary" /> Support Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@elifelo.com"
                className="w-full font-nunito text-sm text-dark bg-gray-50/60 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                required
              />
              <span className="text-[11px] font-nunito text-gray/70 mt-1 block">
                Shown under &quot;Email Us&quot; in Mobile App &amp; Web Footer
              </span>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" /> Office Location / Region
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Maharashtra, India"
                className="w-full font-nunito text-sm text-dark bg-gray-50/60 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
              <span className="text-[11px] font-nunito text-gray/70 mt-1 block">
                Shown under &quot;Locate Us&quot; in Mobile App
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs font-nunito text-gray">
              Changes update live in both Mobile Apps and Website.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-poppins font-semibold text-sm cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              <Check size={16} />
              {saving ? "Saving Changes..." : "Save Contact Info"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function AdminSettingsPage() {
  const [agreement, setAgreement] = useState(null)
  const [riderAgreement, setRiderAgreement] = useState(null)
  const [userAgreement, setUserAgreement] = useState(null)
  const [trainingVideo, setTrainingVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [riderFile, setRiderFile] = useState(null)
  const [userFile, setUserFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [riderUploading, setRiderUploading] = useState(false)
  const [userUploading, setUserUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [riderMessage, setRiderMessage] = useState("")
  const [userMessage, setUserMessage] = useState("")
  const [videoMessage, setVideoMessage] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api("/api/admin/settings/partner-agreement", {}, "admin").catch(() => null),
      api("/api/admin/settings/rider-agreement", {}, "admin").catch(() => null),
      api("/api/admin/settings/user-agreement", {}, "admin").catch(() => null),
      api("/api/admin/settings/training-video", {}, "admin").catch(() => null),
    ])
      .then(([agreementData, riderAgreementData, userAgreementData, videoData]) => {
        setAgreement(agreementData)
        setRiderAgreement(riderAgreementData)
        setUserAgreement(userAgreementData)
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

  const handleRiderAgreementUpload = async (e) => {
    e.preventDefault()
    if (!riderFile) return
    setRiderUploading(true)
    setRiderMessage("")
    try {
      const data = await uploadRiderAgreementPdf(riderFile)
      setRiderAgreement({ url: data.url, version: data.version, updatedAt: data.updatedAt })
      setRiderFile(null)
      setRiderMessage("Rider Agreement updated successfully")
    } catch (err) {
      setRiderMessage(err.message || "Failed to upload Rider Agreement")
    } finally {
      setRiderUploading(false)
    }
  }

  const handleDeleteRiderAgreement = async () => {
    if (!window.confirm("Are you sure you want to delete the Rider Agreement? Riders won't be able to complete registration.")) return
    setRiderUploading(true)
    setRiderMessage("")
    try {
      await deleteRiderAgreementPdf()
      setRiderAgreement(null)
      setRiderMessage("Rider Agreement deleted successfully")
    } catch (err) {
      setRiderMessage(err.message || "Failed to delete Rider Agreement")
    } finally {
      setRiderUploading(false)
    }
  }

  const handleUserAgreementUpload = async (e) => {
    e.preventDefault()
    if (!userFile) return
    setUserUploading(true)
    setUserMessage("")
    try {
      const data = await uploadUserAgreementPdf(userFile)
      setUserAgreement({ url: data.url, version: data.version, updatedAt: data.updatedAt })
      setUserFile(null)
      setUserMessage("User Agreement updated successfully")
    } catch (err) {
      setUserMessage(err.message || "Failed to upload User Agreement")
    } finally {
      setUserUploading(false)
    }
  }

  const handleDeleteUserAgreement = async () => {
    if (!window.confirm("Are you sure you want to delete the User Agreement? Users will not see any PDF agreement during registration.")) return
    setUserUploading(true)
    setUserMessage("")
    try {
      await deleteUserAgreementPdf()
      setUserAgreement(null)
      setUserMessage("User Agreement deleted successfully")
    } catch (err) {
      setUserMessage(err.message || "Failed to delete User Agreement")
    } finally {
      setUserUploading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} className="text-primary" />
          <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Settings</h1>
        </div>

        {/* Platform Contact & Support Info */}
        <ContactSettingsCard />

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

          {/* Card 3: Rider Agreement */}
          <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">Rider Agreement &amp; Terms</h2>
                <p className="font-nunito text-sm text-gray mt-1">
                  Riders must read and accept this PDF during onboarding. Uploading a new file replaces the version shown to new sign-ups.
                </p>
              </div>

              {loading ? (
                <div className="h-28 rounded-lg bg-[#f8f8f8] animate-pulse" />
              ) : riderAgreement?.url ? (
                <div className="rounded-lg border border-[#e8e8e8] p-4 flex items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} className="text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={riderAgreement.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-poppins text-sm font-medium text-primary hover:underline truncate block max-w-[200px] sm:max-w-xs"
                      >
                        View current rider agreement
                      </a>
                      <p className="font-nunito text-xs text-gray mt-0.5">
                        Version {riderAgreement.version}
                        {riderAgreement.updatedAt ? ` · Updated ${formatDate(riderAgreement.updatedAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteRiderAgreement}
                    disabled={riderUploading}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete Rider Agreement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e8e8e8] p-4 text-sm font-nunito text-gray bg-gray-50/50">
                  No Rider Agreement uploaded yet. Riders won&apos;t be able to complete registration until one is added.
                </div>
              )}
            </div>

            <form onSubmit={handleRiderAgreementUpload} className="space-y-3 mt-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setRiderFile(e.target.files?.[0] || null)}
                />
                <Upload size={20} className="text-gray" />
                <span className="font-nunito text-sm text-gray text-center max-w-[250px] truncate">
                  {riderFile ? riderFile.name : "Choose a PDF to upload"}
                </span>
              </label>

              {riderMessage && (
                <p className={`text-xs font-nunito ${riderMessage.includes("success") ? "text-primary" : "text-red-600"}`}>
                  {riderMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!riderFile || riderUploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                {riderUploading ? "Uploading..." : "Upload new PDF"}
              </button>
            </form>
          </div>

          {/* Card 4: User Agreement & Terms */}
          <div className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="font-poppins font-semibold text-[#1c1c1c] text-lg">User Agreement &amp; Terms</h2>
                <p className="font-nunito text-sm text-gray mt-1">
                  Customers view and accept this PDF during registration. Uploading a new file replaces the version shown to new user sign-ups.
                </p>
              </div>

              {loading ? (
                <div className="h-28 rounded-lg bg-[#f8f8f8] animate-pulse" />
              ) : userAgreement?.url ? (
                <div className="rounded-lg border border-[#e8e8e8] p-4 flex items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} className="text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={userAgreement.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-poppins text-sm font-medium text-primary hover:underline truncate block max-w-[200px] sm:max-w-xs"
                      >
                        View current user agreement
                      </a>
                      <p className="font-nunito text-xs text-gray mt-0.5">
                        Version {userAgreement.version}
                        {userAgreement.updatedAt ? ` · Updated ${formatDate(userAgreement.updatedAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteUserAgreement}
                    disabled={userUploading}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete User Agreement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e8e8e8] p-4 text-sm font-nunito text-gray bg-gray-50/50">
                  No User Agreement uploaded yet. Users will see standard terms during registration until a PDF is added.
                </div>
              )}
            </div>

            <form onSubmit={handleUserAgreementUpload} className="space-y-3 mt-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setUserFile(e.target.files?.[0] || null)}
                />
                <Upload size={20} className="text-gray" />
                <span className="font-nunito text-sm text-gray text-center max-w-[250px] truncate">
                  {userFile ? userFile.name : "Choose a PDF to upload"}
                </span>
              </label>

              {userMessage && (
                <p className={`text-xs font-nunito ${userMessage.includes("success") ? "text-primary" : "text-red-600"}`}>
                  {userMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!userFile || userUploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                {userUploading ? "Uploading..." : "Upload new PDF"}
              </button>
            </form>
          </div>
        </div>

        {/* Website Policy & CMS Editor */}
        <PolicyEditor />
      </div>
    </AdminLayout>
  )
}
