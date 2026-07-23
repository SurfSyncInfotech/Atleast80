import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, FileText, IndianRupee, Loader2, Trash2, ArrowLeft } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useCart } from "../../context/CartContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const MIN_BULK_VALUE = 2000

export default function BulkOrderChatbot({ kitchenId, kitchenName, cartVisible = false }) {
  const navigate = useNavigate()
  const { customerUser } = useAuth()
  const { addItem, clearCart } = useCart()
  
  const [open, setOpen] = useState(false)
  const [enquiry, setEnquiry] = useState(null)
  const [loadingEnquiry, setLoadingEnquiry] = useState(false)
  const [message, setMessage] = useState("")
  const [estimatedValue, setEstimatedValue] = useState(String(MIN_BULK_VALUE))
  const [peopleCount, setPeopleCount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [kitchenPhone, setKitchenPhone] = useState("")
  
  // In-app chat states
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef(null)

  const hasActiveEnquiry = enquiry && enquiry.status !== "completed"

  // Load enquiry
  useEffect(() => {
    if (!open || !customerUser || !kitchenId) return
    let cancelled = false

    api(`/api/kitchens/${kitchenId}`)
      .then((data) => {
        if (!cancelled && data.kitchen) {
          setKitchenPhone(data.kitchen.phone || "")
        }
      })
      .catch((err) => console.log("Failed to load kitchen details:", err))

    setLoadingEnquiry(true)
    api(`/api/bulk-enquiries/kitchen/${kitchenId}`, {}, "customer")
      .then((data) => {
        if (!cancelled) setEnquiry(data.enquiry)
      })
      .catch(() => {
        if (!cancelled) setEnquiry(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingEnquiry(false)
      })
    return () => { cancelled = true }
  }, [open, customerUser, kitchenId])

  // In-app chat polling
  useEffect(() => {
    if (!showChat || !enquiry?.id) return
    let active = true

    const fetchChat = async () => {
      try {
        const data = await api(`/api/bulk-enquiries/${enquiry.id}/chat`)
        if (active) {
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to load chat messages:", err)
      }
    }

    fetchChat()
    const interval = setInterval(fetchChat, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [showChat, enquiry?.id])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, showChat])

  const handleAccept = async () => {
    try {
      await api(`/api/bulk-enquiries/${enquiry.id}/accept`, { method: "POST" })
      const data = await api(`/api/bulk-enquiries/kitchen/${kitchenId}`)
      setEnquiry(data.enquiry)
    } catch (err) {
      alert(err.message || "Failed to accept quotation")
    }
  }

  const handleReject = async () => {
    try {
      await api(`/api/bulk-enquiries/${enquiry.id}/reject`, { method: "POST" })
      const data = await api(`/api/bulk-enquiries/kitchen/${kitchenId}`)
      setEnquiry(data.enquiry)
    } catch (err) {
      alert(err.message || "Failed to reject quotation")
    }
  }

  const handlePay = () => {
    const bulkItem = {
      id: `bulk_${enquiry.id}`,
      name: `Bulk Order Service (#${enquiry.id})`,
      price: enquiry.quotationAmount,
      kitchenId: Number(kitchenId),
      qty: 1,
      isBulk: true,
    }

    clearCart()
    addItem(bulkItem)
    setOpen(false)
    navigate("/checkout")
  }

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !enquiry?.id) return
    const msg = chatInput.trim()
    setChatInput("")
    try {
      const data = await api(`/api/bulk-enquiries/${enquiry.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: msg })
      })
      setChatMessages((prev) => [...prev, data.chatMessage])
    } catch (err) {
      alert(err.message || "Failed to send message")
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this bulk order enquiry?")
    if (!ok) return
    try {
      await api(`/api/bulk-enquiries/${enquiry.id}`, { method: "DELETE" })
      setEnquiry(null)
      setShowChat(false)
    } catch (err) {
      alert(err.message || "Failed to delete enquiry")
    }
  }

  const handleOpen = () => {
    if (!customerUser) {
      navigate("/login", { state: { from: window.location.pathname } })
      return
    }
    setOpen(true)
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const value = Number(estimatedValue)
    const guests = Number(peopleCount)
    
    if (!message.trim() || message.trim().length < 10) {
      setError("Describe your bulk order (at least 10 characters)")
      return
    }
    if (!value || value < MIN_BULK_VALUE) {
      setError(`Minimum bulk order value is ₹${MIN_BULK_VALUE}`)
      return
    }
    if (!guests || guests <= 0) {
      setError("Please enter a valid number of guests")
      return
    }
    
    setSubmitting(true)
    try {
      const data = await api("/api/bulk-enquiries", {
        method: "POST",
        body: JSON.stringify({
          kitchenId: Number(kitchenId),
          message: message.trim(),
          estimatedValue: value,
          peopleCount: guests,
        }),
      }, "customer")
      setEnquiry({
        ...data.enquiry,
        quotationFile: null,
        quotationAmount: null,
        quotationNotes: null,
        quotedAt: null,
        createdAt: new Date().toISOString(),
      })
      setMessage("")
      setPeopleCount("")
    } catch (err) {
      setError(err.message || "Failed to send enquiry")
    } finally {
      setSubmitting(false)
    }
  }

  const bottomClass = cartVisible ? "bottom-24 sm:bottom-28" : "bottom-5"

  return (
    <div className={cn("fixed right-4 z-[60]", bottomClass)}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="mb-3 w-[min(100vw-2rem,360px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary to-primary-dark px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle size={18} className="text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-poppins font-semibold text-white text-sm truncate">Bulk order enquiry</p>
                  <p className="font-nunito text-white/70 text-[11px] truncate">{kitchenName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setShowChat(false)
                }}
                className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 cursor-pointer"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[min(65vh,480px)] overflow-y-auto space-y-3">
              {showChat ? (
                <div className="flex flex-col h-[380px]">
                  {/* Chat Header */}
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowChat(false)}
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span className="font-poppins font-bold text-xs text-dark uppercase tracking-wider">
                      Chat with Kitchen
                    </span>
                  </div>

                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[#ECE5DD] flex flex-col min-h-0">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 my-auto">No messages yet.</p>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMe = msg.sender_id === customerUser?.id
                        const msgDate = new Date(msg.created_at)
                        const timeStr = isNaN(msgDate.getTime()) ? "" : msgDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col max-w-[80%] rounded-xl px-3 py-1.5 shadow-sm text-xs",
                              isMe ? "self-end bg-[#DCF8C6] rounded-br-none" : "self-start bg-white rounded-bl-none"
                            )}
                            style={{ alignSelf: isMe ? "flex-end" : "flex-start" }}
                          >
                            {!isMe && (
                              <span className="text-[9px] font-bold text-emerald-800 mb-0.5">
                                {msg.sender_name} ({msg.sender_role})
                              </span>
                            )}
                            <p className="font-nunito text-dark leading-normal break-words">{msg.message}</p>
                            {timeStr && (
                              <span className="text-[8px] text-gray-400 self-end mt-1">{timeStr}</span>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-light font-nunito text-xs focus:outline-none focus:border-primary"
                      required
                    />
                    <button
                      type="submit"
                      className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark flex-shrink-0 cursor-pointer"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              ) : loadingEnquiry ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              ) : hasActiveEnquiry ? (
                <QuotedView
                  enquiry={enquiry}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onPay={handlePay}
                  setShowChat={setShowChat}
                  onDelete={handleDelete}
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="font-nunito text-xs text-gray leading-relaxed">
                      Hi! Need a quotation for a bulk order? Minimum order value is{" "}
                      <span className="font-semibold text-dark">₹{MIN_BULK_VALUE}</span>. Share your requirements and the kitchen will upload a quotation for you.
                    </p>
                  </div>
                  <div>
                    <label className="font-poppins font-medium text-xs text-dark block mb-1.5">
                      Estimated order value (min ₹{MIN_BULK_VALUE})
                    </label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                      <input
                        type="number"
                        min={MIN_BULK_VALUE}
                        step="100"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-light font-nunito text-sm focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-poppins font-medium text-xs text-dark block mb-1.5">
                      Number of Guests / People
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-light font-nunito text-sm focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-poppins font-medium text-xs text-dark block mb-1.5">
                      What do you need?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. 50 lunch boxes for office, veg thali, delivery on Friday..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-light font-nunito text-sm resize-none focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 font-nunito">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white font-poppins font-semibold text-sm py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? "Sending..." : "Request quotation"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          onClick={handleOpen}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-primary text-white pl-4 pr-5 py-3 rounded-full shadow-xl hover:bg-primary-dark cursor-pointer"
        >
          <MessageCircle size={20} />
          <span className="font-poppins font-semibold text-sm">Enquire now</span>
        </motion.button>
      )}
    </div>
  )
}

function PendingView({ enquiry, onDelete }) {
  return (
    <div className="space-y-2">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
        <p className="font-poppins font-semibold text-amber-900 text-sm">Enquiry sent</p>
        <p className="font-nunito text-xs text-amber-800 mt-1">
          Waiting for the kitchen to upload a quotation. Check back here soon.
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm">
        <p className="font-nunito text-gray text-xs">Your request</p>
        <p className="font-nunito text-dark mt-1">{enquiry.message}</p>
        <p className="font-nunito text-gray text-[10px] mt-2">Guests: {enquiry.peopleCount || enquiry.people_count || "N/A"}</p>
        <p className="font-poppins font-semibold text-primary text-sm mt-1">₹{enquiry.estimatedValue}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-poppins font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl cursor-pointer transition-colors mt-2"
      >
        <Trash2 size={13} />
        Delete Enquiry
      </button>
    </div>
  )
}

function QuotedView({ enquiry, onAccept, onReject, onPay, setShowChat, onDelete }) {
  const fileUrl = enquiry.quotationFile ? resolveMediaUrl(enquiry.quotationFile) : null
  const isPdf = fileUrl?.toLowerCase().includes(".pdf")

  const getStatusText = () => {
    switch(enquiry.status) {
      case "quoted": return "Quotation received"
      case "accepted": return "Quotation accepted"
      case "rejected": return "Quotation rejected"
      default: return "Quotation"
    }
  }

  const getStatusColor = () => {
    switch(enquiry.status) {
      case "quoted": return "bg-blue-50 border-blue-100 text-blue-900"
      case "accepted": return "bg-green-50 border-green-100 text-green-900"
      case "rejected": return "bg-red-50 border-red-100 text-red-900"
      default: return "bg-gray-50 border-gray-100 text-gray-900"
    }
  }

  return (
    <div className="space-y-2">
      {enquiry.status === "pending" ? (
        <PendingView enquiry={enquiry} onDelete={onDelete} />
      ) : (
        <>
          <div className={cn("border rounded-xl px-3 py-2.5", getStatusColor())}>
            <p className="font-poppins font-semibold text-sm">{getStatusText()}</p>
            <p className="font-nunito text-[11px] mt-0.5 opacity-80">
              {enquiry.quotedAt
                ? `Uploaded ${new Date(enquiry.quotedAt).toLocaleString("en-IN")}`
                : "From the kitchen"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 px-3 py-2.5">
            <p className="font-nunito text-xs text-gray">Quoted amount</p>
            <p className="font-poppins font-bold text-primary text-xl mt-0.5">₹{enquiry.quotationAmount}</p>
            
            {enquiry.quotationNotes && (
              <div className="bg-gray-50 border-l-2 border-primary rounded-r-lg p-2 mt-2">
                <span className="text-[9px] font-bold text-primary block uppercase tracking-wider mb-0.5">Notes from Kitchen</span>
                <p className="font-nunito text-xs text-gray-700 italic">"{enquiry.quotationNotes}"</p>
              </div>
            )}
          </div>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary font-poppins font-semibold text-sm hover:bg-primary/10"
            >
              <FileText size={14} />
              {isPdf ? "View quotation PDF" : "View quotation"}
            </a>
          )}

          {/* Accept / Reject controls */}
          {enquiry.status === "quoted" && (
            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={onReject}
                className="flex-1 py-2 text-center text-xs font-poppins font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 py-2 text-center text-xs font-poppins font-bold text-white bg-primary rounded-xl hover:bg-primary-dark cursor-pointer"
              >
                Accept
              </button>
            </div>
          )}

          {/* Pay control */}
          {enquiry.status === "accepted" && (
            <button
              type="button"
              onClick={onPay}
              className="w-full py-2.5 text-center text-xs font-poppins font-bold text-dark bg-[#F4C400] rounded-xl hover:bg-[#E5B800] cursor-pointer mt-1"
            >
              ADD TO CART & CHECKOUT (₹{enquiry.quotationAmount})
            </button>
          )}

          {/* Chat control */}
          {enquiry.status !== "completed" && (
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-poppins font-bold text-primary bg-white border border-primary/20 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors mt-1"
            >
              <MessageCircle size={13} />
              Discuss / Negotiate with Kitchen
            </button>
          )}

          <div className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm opacity-80">
            <p className="font-nunito text-gray text-[10px]">Your enquiry</p>
            <p className="font-nunito text-dark text-xs mt-1 line-clamp-3">{enquiry.message}</p>
            <p className="font-nunito text-gray text-[9px] mt-1.5">Guests: {enquiry.peopleCount || enquiry.people_count || "N/A"}</p>
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-poppins font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl cursor-pointer transition-colors mt-2"
          >
            <Trash2 size={13} />
            Delete Enquiry
          </button>
        </>
      )}
    </div>
  )
}
