import { useEffect, useState } from "react"
import { MessageSquare, IndianRupee, FileText, Loader2, Upload, Trash2, AlertTriangle, Send, X, Edit3 } from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const MIN_BULK_VALUE = 2000

export default function KitchenBulkEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [forms, setForms] = useState({})
  const [error, setError] = useState("")
  const [confirmModal, setConfirmModal] = useState({ open: false, enquiryId: null })

  // Chat state
  const [chatModal, setChatModal] = useState({ open: false, enquiry: null })
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatSending, setChatSending] = useState(false)

  // Update Price state
  const [updatePriceModal, setUpdatePriceModal] = useState({ open: false, enquiry: null, newAmount: "", notes: "" })
  const [updatingPrice, setUpdatingPrice] = useState(false)

  const handleUpdatePrice = async (e) => {
    if (e) e.preventDefault()
    if (!updatePriceModal.newAmount || Number(updatePriceModal.newAmount) <= 0) {
      alert("Enter a valid quotation amount")
      return
    }

    setUpdatingPrice(true)
    try {
      const body = new FormData()
      body.append("quotationAmount", updatePriceModal.newAmount)
      if (updatePriceModal.notes?.trim()) {
        body.append("quotationNotes", updatePriceModal.notes.trim())
      }
      await uploadQuotation(updatePriceModal.enquiry.id, body)
      setUpdatePriceModal({ open: false, enquiry: null, newAmount: "", notes: "" })
      await load()
    } catch (err) {
      alert(err.message || "Failed to update price")
    } finally {
      setUpdatingPrice(false)
    }
  }

  useEffect(() => {
    if (!chatModal.open || !chatModal.enquiry?.id) return
    let active = true

    const fetchChat = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/${chatModal.enquiry.id}/chat`, {}, "kitchen")
        if (active) {
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to load chat:", err)
      }
    }

    fetchChat()
    const interval = setInterval(fetchChat, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [chatModal.open, chatModal.enquiry?.id])

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || !chatModal.enquiry?.id || chatSending) return
    const text = chatInput.trim()
    setChatInput("")
    setChatSending(true)
    try {
      const data = await api(`/api/bulk-enquiries/${chatModal.enquiry.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      }, "kitchen")
      if (data.chatMessage) {
        setChatMessages((prev) => [...prev, data.chatMessage])
      }
    } catch (err) {
      alert(err.message || "Failed to send message")
    } finally {
      setChatSending(false)
    }
  }

  const load = () => {
    setLoading(true)
    return api("/api/bulk-enquiries/partner", {}, "kitchen")
      .then((data) => setEnquiries(data.enquiries || []))
      .catch((err) => setError(err.message || "Failed to load enquiries"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      api("/api/bulk-enquiries/partner", {}, "kitchen")
        .then((data) => setEnquiries(data.enquiries || []))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const setForm = (id, key, value) => {
    setForms((prev) => ({
      ...prev,
      [id]: { amount: "", notes: "", file: null, ...prev[id], [key]: value },
    }))
  }

  const handleUpload = async (enquiryId) => {
    const form = forms[enquiryId] || {}
    if (!form.file) {
      alert("Select a quotation file (PDF or image)")
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      alert("Enter quotation amount")
      return
    }

    const body = new FormData()
    body.append("quotation", form.file)
    body.append("quotationAmount", form.amount)
    if (form.notes?.trim()) body.append("quotationNotes", form.notes.trim())

    setUploadingId(enquiryId)
    setError("")
    try {
      await uploadQuotation(enquiryId, body)
      await load()
      setForms((prev) => {
        const next = { ...prev }
        delete next[enquiryId]
        return next
      })
    } catch (err) {
      setError(err.message || "Upload failed")
    } finally {
      setUploadingId(null)
    }
  }

  const handleDeleteQuotation = (enquiryId) => {
    setConfirmModal({ open: true, enquiryId })
  }

  const handleConfirmDelete = async () => {
    const enquiryId = confirmModal.enquiryId
    setConfirmModal({ open: false, enquiryId: null })
    setDeletingId(enquiryId)
    setError("")
    try {
      await api(`/api/bulk-enquiries/${enquiryId}/quotation`, { method: "DELETE" }, "kitchen")
      await load()
    } catch (err) {
      setError(err.message || "Failed to delete quotation")
    } finally {
      setDeletingId(null)
    }
  }

  const pending = enquiries.filter((e) => e.status === "pending")
  const quoted = enquiries.filter((e) => e.status === "quoted")
  const accepted = enquiries.filter((e) => e.status === "accepted")
  const completed = enquiries.filter((e) => e.status === "completed")
  const rejected = enquiries.filter((e) => e.status === "rejected")

  return (
    <>
    <KitchenLayout fullBleed>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="font-poppins font-bold text-2xl text-dark flex items-center gap-2">
            <MessageSquare size={24} className="text-primary" />
            Bulk order enquiries
          </h1>
          <p className="font-nunito text-gray text-sm mt-1">
            Customers request quotations for bulk orders (min ₹{MIN_BULK_VALUE}). Upload your quotation here.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : enquiries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
            <MessageSquare size={40} className="text-gray-light mx-auto mb-3" />
            <p className="font-nunito text-gray">No bulk order enquiries yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <section>
                <h2 className="font-poppins font-semibold text-dark mb-3">
                  Pending ({pending.length})
                </h2>
                <div className="space-y-4">
                  {pending.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      form={forms[enquiry.id] || {}}
                      onFormChange={setForm}
                      onUpload={handleUpload}
                      uploading={uploadingId === enquiry.id}
                      onOpenChat={(e) => setChatModal({ open: true, enquiry: e })}
                    />
                  ))}
                </div>
              </section>
            )}

            {quoted.length > 0 && (
              <section>
                <h2 className="font-poppins font-semibold text-dark mb-3">
                  Quoted ({quoted.length})
                </h2>
                <div className="space-y-4">
                  {quoted.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onDeleteQuotation={handleDeleteQuotation}
                      deleting={deletingId === enquiry.id}
                      onOpenChat={(e) => setChatModal({ open: true, enquiry: e })}
                      onUpdatePrice={(e) => setUpdatePriceModal({ open: true, enquiry: e, newAmount: e.quotationAmount || "", notes: e.quotationNotes || "" })}
                    />
                  ))}
                </div>
              </section>
            )}

            {accepted.length > 0 && (
              <section>
                <h2 className="font-poppins font-semibold text-dark mb-3">
                  Accepted & Awaiting Payment ({accepted.length})
                </h2>
                <div className="space-y-4">
                  {accepted.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onOpenChat={(e) => setChatModal({ open: true, enquiry: e })}
                      onUpdatePrice={(e) => setUpdatePriceModal({ open: true, enquiry: e, newAmount: e.quotationAmount || "", notes: e.quotationNotes || "" })}
                    />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="font-poppins font-semibold text-dark mb-3">
                  Confirmed Orders ({completed.length})
                </h2>
                <div className="space-y-4">
                  {completed.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onOpenChat={(e) => setChatModal({ open: true, enquiry: e })}
                    />
                  ))}
                </div>
              </section>
            )}

            {rejected.length > 0 && (
              <section>
                <h2 className="font-poppins font-semibold text-dark mb-3">
                  Rejected ({rejected.length})
                </h2>
                <div className="space-y-4">
                  {rejected.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onOpenChat={(e) => setChatModal({ open: true, enquiry: e })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </KitchenLayout>

    {/* Custom Delete Confirm Modal */}
    {confirmModal.open && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
          style={{ animation: "fadeInScale 0.18s ease-out" }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
          </div>

          {/* Text */}
          <h3 className="font-poppins font-bold text-lg text-dark text-center mb-2">
            Delete Quotation?
          </h3>
          <p className="font-nunito text-sm text-gray text-center leading-relaxed mb-6">
            This quotation will be permanently deleted and the enquiry will move back to{" "}
            <span className="font-semibold text-dark">Pending</span> status.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmModal({ open: false, enquiryId: null })}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-poppins font-semibold text-sm text-gray hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-poppins font-semibold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 size={15} />
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Enquiry Chat Modal */}
    {chatModal.open && chatModal.enquiry && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col h-[560px] max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-poppins font-bold text-primary text-base">
                {chatModal.enquiry.customerName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="font-poppins font-bold text-dark text-sm">{chatModal.enquiry.customerName}</h3>
                <p className="font-nunito text-xs text-gray">{chatModal.enquiry.customerPhone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChatModal({ open: false, enquiry: null })}
              className="w-8 h-8 rounded-full bg-gray-200/60 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8faf9]">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 text-gray text-xs font-nunito">
                No chat messages yet. Send a message to start conversation with <span className="font-semibold text-dark">{chatModal.enquiry.customerName}</span>.
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isKitchen = msg.sender_role === "kitchen" || msg.senderRole === "kitchen"
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isKitchen ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm text-sm font-nunito ${
                      isKitchen ? "bg-primary text-white rounded-br-none" : "bg-white text-dark border border-gray-100 rounded-bl-none"
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <span className="text-[10px] font-nunito text-gray-400 mt-1 px-1">
                      {msg.created_at || msg.createdAt ? new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 font-nunito text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatSending}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 cursor-pointer hover:bg-primary-dark transition-colors shrink-0"
            >
              {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    )}

    {/* Update Price Modal */}
    {updatePriceModal.open && updatePriceModal.enquiry && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-poppins font-bold text-dark text-base">Update Negotiated Price</h3>
              <p className="font-nunito text-xs text-gray">Enquiry for {updatePriceModal.enquiry.customerName}</p>
            </div>
            <button
              type="button"
              onClick={() => setUpdatePriceModal({ open: false, enquiry: null, newAmount: "", notes: "" })}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdatePrice} className="space-y-4">
            <div>
              <label className="font-nunito text-xs font-semibold text-dark block mb-1">New Quotation Amount (₹)</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                <input
                  type="number"
                  min="1"
                  value={updatePriceModal.newAmount}
                  onChange={(e) => setUpdatePriceModal((prev) => ({ ...prev, newAmount: e.target.value }))}
                  placeholder="Enter updated agreed price"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 font-poppins font-semibold text-dark text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-nunito text-xs font-semibold text-dark block mb-1">Notes / Terms (optional)</label>
              <input
                type="text"
                value={updatePriceModal.notes}
                onChange={(e) => setUpdatePriceModal((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Revised price after negotiation"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-nunito text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUpdatePriceModal({ open: false, enquiry: null, newAmount: "", notes: "" })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-poppins font-semibold text-sm text-gray hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingPrice}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updatingPrice ? <Loader2 size={16} className="animate-spin" /> : "Save Price"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  )
}

function EnquiryCard({
  enquiry,
  form,
  onFormChange,
  onUpload,
  uploading,
  onDeleteQuotation,
  deleting,
  onOpenChat,
  onUpdatePrice,
}) {
  const hasNewMessage = Boolean(enquiry.lastMessage && enquiry.lastMessageSenderId && enquiry.lastMessageSenderId === enquiry.customerId)

  return (
    <article className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-poppins font-semibold text-dark">{enquiry.customerName}</p>
          <p className="font-nunito text-xs text-gray mt-0.5">{enquiry.customerPhone}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChat?.(enquiry)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-poppins font-semibold transition-all cursor-pointer",
              hasNewMessage
                ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            )}
          >
            <MessageSquare size={14} />
            Chat with Customer
            {hasNewMessage && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 uppercase animate-pulse">
                New Msg
              </span>
            )}
          </button>
          <div className="text-right">
            <p className="font-poppins font-bold text-primary">₹{enquiry.estimatedValue}</p>
            <p className="font-nunito text-[10px] text-gray uppercase tracking-wide">estimated</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 py-4">
        <p className="font-nunito text-sm text-dark leading-relaxed">{enquiry.message}</p>
        <p className="font-nunito text-xs text-gray mt-2">
          {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleString("en-IN") : ""}
        </p>

        {enquiry.lastMessage && (
          <div className={cn(
            "mt-3 p-3 rounded-xl border flex items-start gap-2.5",
            hasNewMessage ? "bg-amber-50/90 border-amber-200" : "bg-gray-50 border-gray-100"
          )}>
            <MessageSquare size={16} className={hasNewMessage ? "text-amber-600 shrink-0 mt-0.5" : "text-gray-400 shrink-0 mt-0.5"} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("font-poppins text-xs font-bold", hasNewMessage ? "text-amber-900" : "text-dark")}>
                  {hasNewMessage ? "💬 Latest Customer Message" : "Last Chat Message"}
                </p>
                {hasNewMessage && (
                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                    New Message
                  </span>
                )}
              </div>
              <p className="font-nunito text-xs text-dark mt-0.5 truncate">{enquiry.lastMessage}</p>
            </div>
          </div>
        )}
      </div>

      {enquiry.status === "pending" && (
        <div className="px-4 md:px-5 py-4 bg-gray-50/80 border-t border-gray-100 space-y-3">
          <p className="font-poppins font-medium text-sm text-dark">Upload quotation</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="font-nunito text-xs text-gray block mb-1">Amount (₹)</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                <input
                  type="number"
                  min="1"
                  value={form?.amount || ""}
                  onChange={(e) => onFormChange?.(enquiry.id, "amount", e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-light font-nunito text-sm bg-white"
                  placeholder="Quotation total"
                />
              </div>
            </div>
            <div>
              <label className="font-nunito text-xs text-gray block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form?.notes || ""}
                onChange={(e) => onFormChange?.(enquiry.id, "notes", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-light font-nunito text-sm bg-white"
                placeholder="Valid for 7 days, includes delivery..."
              />
            </div>
          </div>
          <div>
            <label className="font-nunito text-xs text-gray block mb-1">Quotation file (PDF or image)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => onFormChange?.(enquiry.id, "file", e.target.files?.[0] || null)}
              className="w-full text-sm font-nunito file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
            />
          </div>
          <button
            type="button"
            onClick={() => onUpload?.(enquiry.id)}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 bg-primary text-white font-poppins font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-60 cursor-pointer"
            )}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Send quotation to customer"}
          </button>
        </div>
      )}

      {enquiry.status === "quoted" && (
        <div className="px-4 md:px-5 py-4 bg-blue-50/50 border-t border-gray-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-nunito text-xs text-gray">Quotation sent</p>
              <p className="font-poppins font-bold text-blue-800">₹{enquiry.quotationAmount}</p>
              {enquiry.quotationNotes && (
                <p className="font-nunito text-xs text-gray mt-1">{enquiry.quotationNotes}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {enquiry.quotationFile && (
                <a
                  href={resolveMediaUrl(enquiry.quotationFile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-poppins font-semibold text-primary hover:underline"
                >
                  <FileText size={16} />
                  View file
                </a>
              )}
              <button
                type="button"
                onClick={() => onUpdatePrice?.(enquiry)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-poppins font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Edit3 size={14} />
                Update Price
              </button>
              <button
                type="button"
                onClick={() => onDeleteQuotation?.(enquiry.id)}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-poppins font-semibold hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting..." : "Delete quotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {enquiry.status === "accepted" && (
        <div className="px-4 md:px-5 py-4 bg-amber-50/50 border-t border-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-poppins font-semibold text-amber-900 text-sm">Quotation Accepted (Awaiting Payment)</p>
            <p className="font-nunito text-xs text-amber-800 mt-1">
              Customer accepted quote of <span className="font-bold">₹{enquiry.quotationAmount}</span>. Waiting for payment from customer.
            </p>
          </div>
          {enquiry.quotationFile && (
            <a
              href={resolveMediaUrl(enquiry.quotationFile)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-poppins font-semibold text-primary hover:underline"
            >
              <FileText size={16} />
              View quotation
            </a>
          )}
        </div>
      )}

      {enquiry.status === "completed" && (
        <div className="px-4 md:px-5 py-4 bg-green-50 border-t border-green-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-poppins font-semibold text-green-950 text-sm">Order Confirmed</p>
            <p className="font-nunito text-xs text-green-800 mt-1">
              Bulk order of <span className="font-bold">₹{enquiry.quotationAmount}</span> is confirmed. Please prepare and dispatch the order.
            </p>
          </div>
          {enquiry.quotationFile && (
            <a
              href={resolveMediaUrl(enquiry.quotationFile)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-poppins font-semibold text-primary hover:underline"
            >
              <FileText size={16} />
              View quotation details
            </a>
          )}
        </div>
      )}

      {enquiry.status === "rejected" && (
        <div className="px-4 md:px-5 py-4 bg-red-50 border-t border-red-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-poppins font-semibold text-red-900 text-sm">Quotation Rejected</p>
            <p className="font-nunito text-xs text-red-800 mt-1">
              Customer rejected the quotation of <span className="font-bold">₹{enquiry.quotationAmount}</span>.
            </p>
          </div>
        </div>
      )}
    </article>
  )
}

async function uploadQuotation(enquiryId, formData) {
  const { getStoredToken } = await import("../../lib/authStorage")
  const API_URL = import.meta.env.VITE_API_URL || "https://backend.atleast80.com"
  const token = getStoredToken("kitchen")
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}/api/bulk-enquiries/${enquiryId}/quotation`, {
    method: "POST",
    headers,
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || "Upload failed")
  return data
}
