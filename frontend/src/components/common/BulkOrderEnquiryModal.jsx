import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Send,
  FileText,
  IndianRupee,
  Loader2,
  Trash2,
  ArrowLeft,
  RotateCw,
  ChefHat,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Users,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useCart } from "../../context/CartContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const MIN_BULK_VALUE = 2000

export default function BulkOrderEnquiryModal({
  isOpen,
  onClose,
  kitchenId,
  kitchenName,
  enquiry,
  onEnquiryChange,
  onRefresh,
  refreshing = false,
}) {
  const navigate = useNavigate()
  const { customerUser } = useAuth()
  const { addItem, clearCart } = useCart()

  // Form State
  const [estimatedValue, setEstimatedValue] = useState(String(MIN_BULK_VALUE))
  const [peopleCount, setPeopleCount] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // In-App Chat State
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatSending, setChatSending] = useState(false)
  const chatEndRef = useRef(null)

  const activeEnquiry = enquiry && enquiry.status !== "completed" ? enquiry : null

  // Submit Bulk Enquiry Form
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const val = Number(estimatedValue)
    const pCount = Number(peopleCount)

    if (!message.trim() || message.trim().length < 10) {
      setError("Describe what you need (at least 10 characters)")
      return
    }
    if (!val || Number.isNaN(val) || val < MIN_BULK_VALUE) {
      setError(`Minimum estimated bulk order value is ₹${MIN_BULK_VALUE}`)
      return
    }
    if (!pCount || Number.isNaN(pCount) || pCount < 1) {
      setError("Please specify number of guests/people")
      return
    }

    setSubmitting(true)
    try {
      const data = await api(
        "/api/bulk-enquiries",
        {
          method: "POST",
          body: JSON.stringify({
            kitchenId: Number(kitchenId),
            message: message.trim(),
            estimatedValue: val,
            peopleCount: pCount,
          }),
        },
        "customer"
      )
      if (data.enquiry) {
        onEnquiryChange(data.enquiry)
      }
      setMessage("")
      setPeopleCount("")
    } catch (err) {
      setError(err.message || "Failed to submit bulk order enquiry")
    } finally {
      setSubmitting(false)
    }
  }

  // Accept Quotation
  const handleAccept = async () => {
    if (!activeEnquiry?.id) return
    try {
      await api(`/api/bulk-enquiries/${activeEnquiry.id}/accept`, { method: "POST" }, "customer")
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchenId}`, {}, "customer")
      onEnquiryChange(updated.enquiry)
    } catch (err) {
      alert(err.message || "Failed to accept quotation")
    }
  }

  // Reject Quotation
  const handleReject = async () => {
    if (!activeEnquiry?.id) return
    try {
      await api(`/api/bulk-enquiries/${activeEnquiry.id}/reject`, { method: "POST" }, "customer")
      const updated = await api(`/api/bulk-enquiries/kitchen/${kitchenId}`, {}, "customer")
      onEnquiryChange(updated.enquiry)
    } catch (err) {
      alert(err.message || "Failed to reject quotation")
    }
  }

  // Pay Quotation -> Clear Cart, Add Bulk Item, Redirect Checkout
  const handlePay = () => {
    if (!activeEnquiry?.id) return
    const bulkItem = {
      id: `bulk_${activeEnquiry.id}`,
      name: `Bulk Order Service (#${activeEnquiry.id})`,
      price: activeEnquiry.quotationAmount,
      kitchenId: Number(kitchenId),
      qty: 1,
      isBulk: true,
    }

    clearCart()
    addItem(bulkItem)
    onClose()
    navigate("/checkout")
  }

  // Delete Enquiry
  const handleDelete = async () => {
    if (!activeEnquiry?.id) return
    const ok = window.confirm("Are you sure you want to delete this bulk order enquiry?")
    if (!ok) return
    try {
      await api(`/api/bulk-enquiries/${activeEnquiry.id}`, { method: "DELETE" }, "customer")
      onEnquiryChange(null)
      setShowChat(false)
    } catch (err) {
      alert(err.message || "Failed to delete enquiry")
    }
  }

  // In-App Chat Polling
  useEffect(() => {
    if (!showChat || !activeEnquiry?.id) return
    let active = true

    const fetchChat = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/${activeEnquiry.id}/chat`, {}, "customer")
        if (active) {
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to fetch chat messages:", err)
      }
    }

    fetchChat()
    const interval = setInterval(fetchChat, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [showChat, activeEnquiry?.id])

  // Scroll chat to bottom
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, showChat])

  // Send Chat Message
  const handleSendChat = async (e) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || !activeEnquiry?.id || chatSending) return
    const text = chatInput.trim()
    setChatInput("")
    setChatSending(true)

    try {
      const data = await api(
        `/api/bulk-enquiries/${activeEnquiry.id}/chat`,
        {
          method: "POST",
          body: JSON.stringify({ message: text }),
        },
        "customer"
      )
      if (data.chatMessage) {
        setChatMessages((prev) => [...prev, data.chatMessage])
      }
    } catch (err) {
      alert(err.message || "Failed to send message")
    } finally {
      setChatSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {showChat && (
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="min-w-0">
                <h3 className="font-poppins font-bold text-dark text-lg truncate">
                  {showChat ? "Chat with Kitchen" : "Enquiry Details"}
                </h3>
                <p className="font-nunito text-xs text-gray truncate">
                  {kitchenName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && !showChat && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  title="Refresh enquiry"
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCw size={18} className={refreshing ? "animate-spin" : ""} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {showChat ? (
              /* IN-APP CHAT VIEW */
              <div className="flex flex-col h-[480px]">
                <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-[#ECE5DD] space-y-3 min-h-0">
                  {chatMessages.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 font-nunito text-xs">
                      No messages yet. Send a message to start discussion with the kitchen!
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === customerUser?.id
                      const msgDate = new Date(msg.created_at)
                      const timeStr = isNaN(msgDate.getTime())
                        ? ""
                        : msgDate.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-xs",
                            isMe
                              ? "self-end bg-[#DCF8C6] text-dark rounded-br-none"
                              : "self-start bg-white text-dark rounded-bl-none"
                          )}
                          style={{ alignSelf: isMe ? "flex-end" : "flex-start" }}
                        >
                          {!isMe && (
                            <span className="text-[10px] font-bold text-emerald-800 font-poppins mb-0.5">
                              {msg.sender_name} ({msg.sender_role})
                            </span>
                          )}
                          <p className="font-nunito text-sm text-dark leading-relaxed break-words">
                            {msg.message}
                          </p>
                          {timeStr && (
                            <span className="text-[9px] text-gray-400 self-end mt-1 font-nunito">
                              {timeStr}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2 pt-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-light font-nunito text-sm focus:outline-none focus:border-primary bg-white shadow-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={chatSending}
                    className="px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl flex items-center justify-center font-poppins font-bold text-sm cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            ) : !activeEnquiry ? (
              /* NEW ENQUIRY FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-nunito text-emerald-900 leading-relaxed">
                  Planning a party, corporate event, or family function? Fill in your requirements below. Minimum bulk order value is <strong>₹{MIN_BULK_VALUE}</strong>.
                </div>

                <div>
                  <label className="font-poppins font-semibold text-xs text-dark block mb-1.5">
                    Estimated Budget / Value (Min ₹{MIN_BULK_VALUE}) *
                  </label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="number"
                      min={MIN_BULK_VALUE}
                      step="100"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-light font-nunito text-sm focus:outline-none focus:border-primary shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-poppins font-semibold text-xs text-dark block mb-1.5">
                    Number of Guests / People *
                  </label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-light font-nunito text-sm focus:outline-none focus:border-primary shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-poppins font-semibold text-xs text-dark block mb-1.5">
                    What food / dishes do you need? *
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. 50 Paneer Thalis for Friday lunch delivery, 2kg Gulab Jamun..."
                    className="w-full p-3.5 rounded-2xl border border-gray-light font-nunito text-sm resize-none focus:outline-none focus:border-primary shadow-sm"
                    required
                  />
                </div>

                {error && <p className="font-nunito text-xs text-red-600 font-semibold">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-poppins font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : "Submit Enquiry"}
                </button>
              </form>
            ) : (
              /* ACTIVE ENQUIRY / QUOTATION STATUS VIEW */
              <div className="space-y-4">
                {/* Status Box */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-poppins font-bold text-xs text-gray uppercase tracking-wider">
                      ENQUIRY STATUS
                    </span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-poppins font-bold border",
                        activeEnquiry.status === "pending"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : activeEnquiry.status === "quoted"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : activeEnquiry.status === "accepted"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : activeEnquiry.status === "completed"
                          ? "bg-green-100 text-green-900 border-green-300"
                          : "bg-red-50 text-red-800 border-red-200"
                      )}
                    >
                      {activeEnquiry.status === "pending"
                        ? "UNDER REVIEW"
                        : activeEnquiry.status === "quoted"
                        ? "QUOTED"
                        : activeEnquiry.status === "accepted"
                        ? "ACCEPTED"
                        : activeEnquiry.status === "completed"
                        ? "ORDER PLACED (PAID)"
                        : "REJECTED"}
                    </span>
                  </div>

                  <p className="font-poppins font-bold text-dark text-base">
                    Estimated Value: ₹{activeEnquiry.estimatedValue}
                  </p>

                  <p className="font-nunito text-xs text-gray-700 leading-relaxed italic">
                    Requirements: "{activeEnquiry.message}"
                  </p>
                </div>

                {/* Quotation Details */}
                {(activeEnquiry.status === "quoted" ||
                  activeEnquiry.status === "accepted" ||
                  activeEnquiry.status === "rejected" ||
                  activeEnquiry.status === "completed") && (
                  <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-100 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <ClipboardList size={18} />
                      <h4 className="font-poppins font-bold text-sm">Quotation Details</h4>
                    </div>

                    <p className="font-poppins font-extrabold text-emerald-900 text-2xl">
                      ₹{activeEnquiry.quotationAmount}
                    </p>

                    {activeEnquiry.quotationNotes && (
                      <div className="bg-white/80 rounded-xl p-3 border-l-4 border-emerald-600">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                          Notes from Kitchen
                        </span>
                        <p className="font-nunito text-xs text-gray-800 italic leading-relaxed">
                          "{activeEnquiry.quotationNotes}"
                        </p>
                      </div>
                    )}

                    {activeEnquiry.quotationFile && (
                      <a
                        href={resolveMediaUrl(activeEnquiry.quotationFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white border border-emerald-600 text-emerald-900 font-poppins font-bold text-xs hover:bg-emerald-50 transition-colors"
                      >
                        <FileText size={15} />
                        View / Download Quotation PDF
                      </a>
                    )}

                    {/* Quoted state controls */}
                    {activeEnquiry.status === "quoted" && (
                      <div className="pt-2 space-y-2.5">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={handleReject}
                            className="py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-poppins font-bold text-xs border border-red-200 transition-colors cursor-pointer text-center"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={handleAccept}
                            className="py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-poppins font-bold text-xs transition-colors cursor-pointer text-center"
                          >
                            Accept
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowChat(true)}
                          className="w-full py-2.5 px-4 rounded-xl bg-white border border-primary text-primary font-poppins font-bold text-xs hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={16} />
                          Discuss / Negotiate with Kitchen
                        </button>
                      </div>
                    )}

                    {/* Accepted state control -> Pay */}
                    {activeEnquiry.status === "accepted" && (
                      <button
                        type="button"
                        onClick={handlePay}
                        className="w-full py-3.5 px-4 rounded-2xl bg-[#F4C400] hover:bg-[#e5b800] text-[#0a1f13] font-poppins font-extrabold text-sm transition-all cursor-pointer shadow-md text-center"
                      >
                        ADD TO CART & CHECKOUT (₹{activeEnquiry.quotationAmount})
                      </button>
                    )}

                    {/* Completed success message */}
                    {activeEnquiry.status === "completed" && (
                      <div className="bg-emerald-100 rounded-xl p-3.5 text-center border border-emerald-300">
                        <p className="font-poppins font-bold text-emerald-900 text-xs sm:text-sm">
                          Payment Successful!
                        </p>
                        <p className="font-nunito text-xs text-emerald-800 mt-1">
                          Your order has been placed. The kitchen will begin preparation.
                        </p>
                      </div>
                    )}

                    {/* Rejected options */}
                    {activeEnquiry.status === "rejected" && (
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowChat(true)}
                          className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-poppins font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={16} />
                          Chat further with Kitchen
                        </button>
                        <button
                          type="button"
                          onClick={handleAccept}
                          className="w-full py-2.5 px-4 rounded-xl bg-white border border-primary text-primary font-poppins font-bold text-xs hover:bg-primary/5 transition-colors cursor-pointer text-center"
                        >
                          Accept Quote Instead
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Under review notice */}
                {activeEnquiry.status === "pending" && (
                  <div className="space-y-3 text-center py-2">
                    <p className="font-nunito text-xs text-gray leading-relaxed">
                      The kitchen has been notified. You will receive quotation pricing and notes right here once they review and respond.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowChat(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-primary text-primary font-poppins font-bold text-xs hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Chat with Kitchen
                    </button>
                  </div>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-poppins font-bold text-xs border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={15} />
                  Delete Enquiry
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
