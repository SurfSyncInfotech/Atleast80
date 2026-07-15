import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, FileText, IndianRupee, Loader2, Trash2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const MIN_BULK_VALUE = 2000

export default function BulkOrderChatbot({ kitchenId, kitchenName, cartVisible = false }) {
  const navigate = useNavigate()
  const { customerUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [enquiry, setEnquiry] = useState(null)
  const [loadingEnquiry, setLoadingEnquiry] = useState(false)
  const [message, setMessage] = useState("")
  const [estimatedValue, setEstimatedValue] = useState(String(MIN_BULK_VALUE))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [kitchenPhone, setKitchenPhone] = useState("")

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

  const handlePay = async () => {
    const ok = window.confirm(`Proceed to pay ₹${enquiry.quotationAmount} for bulk order enquiry #${enquiry.id}?`)
    if (!ok) return
    try {
      await api(`/api/bulk-enquiries/${enquiry.id}/pay`, { method: "POST" })
      const data = await api(`/api/bulk-enquiries/kitchen/${kitchenId}`)
      setEnquiry(data.enquiry)
      alert("Thank you! Your payment for the bulk order is successful.")
    } catch (err) {
      alert(err.message || "Failed to process payment")
    }
  }

  const handleChat = () => {
    if (kitchenPhone) {
      const formatted = kitchenPhone.replace(/[^0-9]/g, "")
      const phoneWithCode = formatted.length === 10 ? `91${formatted}` : formatted
      window.open(`https://wa.me/${phoneWithCode}?text=Hello, I am contacting you regarding bulk order enquiry #${enquiry.id}`)
    } else {
      alert("This kitchen does not have a contact number listed.")
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this bulk order enquiry?")
    if (!ok) return
    try {
      await api(`/api/bulk-enquiries/${enquiry.id}`, { method: "DELETE" })
      setEnquiry(null)
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
    if (!message.trim() || message.trim().length < 10) {
      setError("Describe your bulk order (at least 10 characters)")
      return
    }
    if (!value || value < MIN_BULK_VALUE) {
      setError(`Minimum bulk order value is ₹${MIN_BULK_VALUE}`)
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
            className="mb-3 w-[min(100vw-2rem,340px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
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
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 cursor-pointer"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[min(60vh,420px)] overflow-y-auto space-y-3">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="font-nunito text-xs text-gray leading-relaxed">
                  Hi! Need a quotation for a bulk order? Minimum order value is{" "}
                  <span className="font-semibold text-dark">₹{MIN_BULK_VALUE}</span>. Share your requirements and the kitchen will upload a quotation for you.
                </p>
              </div>

              {loadingEnquiry ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              ) : (enquiry?.status === "quoted" || enquiry?.status === "accepted" || enquiry?.status === "rejected") ? (
                <QuotedView
                  enquiry={enquiry}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onPay={handlePay}
                  onChat={handleChat}
                  onDelete={handleDelete}
                />
              ) : enquiry?.status === "pending" ? (
                <PendingView enquiry={enquiry} onDelete={handleDelete} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
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
        <p className="font-poppins font-semibold text-primary text-sm mt-2">₹{enquiry.estimatedValue}</p>
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

function QuotedView({ enquiry, onAccept, onReject, onPay, onChat, onDelete }) {
  const fileUrl = enquiry.quotationFile ? resolveMediaUrl(enquiry.quotationFile) : null
  const isPdf = fileUrl?.toLowerCase().includes(".pdf")

  const getStatusText = () => {
    switch(enquiry.status) {
      case "quoted": return "Quotation received"
      case "accepted": return "Quotation accepted"
      case "rejected": return "Quotation rejected"
      case "completed": return "Order placed (Paid)"
      default: return "Quotation"
    }
  }

  const getStatusColor = () => {
    switch(enquiry.status) {
      case "quoted": return "bg-blue-50 border-blue-100 text-blue-900"
      case "accepted": return "bg-green-50 border-green-100 text-green-900"
      case "rejected": return "bg-red-50 border-red-100 text-red-900"
      case "completed": return "bg-emerald-50 border-emerald-100 text-emerald-900"
      default: return "bg-gray-50 border-gray-100 text-gray-900"
    }
  }

  return (
    <div className="space-y-2">
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
          <p className="font-nunito text-sm text-dark mt-2">{enquiry.quotationNotes}</p>
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
          PROCEED TO PAY ₹{enquiry.quotationAmount}
        </button>
      )}

      {enquiry.status === "completed" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center mt-1">
          <p className="font-poppins font-semibold text-emerald-900 text-xs">Payment Successful</p>
          <p className="font-nunito text-[11px] text-emerald-800 mt-0.5">
            Your order has been placed. The kitchen will begin preparation.
          </p>
        </div>
      )}

      {/* Chat control */}
      {enquiry.status === "rejected" && (
        <div className="space-y-2 pt-1.5">
          <button
            type="button"
            onClick={onChat}
            className="w-full py-2.5 text-center text-xs font-poppins font-bold text-white bg-[#25D366] rounded-xl hover:bg-[#20BA5A] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Chat further (WhatsApp)
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-2 text-center text-xs font-poppins font-bold text-primary bg-white border border-primary/20 rounded-xl hover:bg-gray-50 cursor-pointer"
          >
            Accept Quote Instead
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm opacity-80">
        <p className="font-nunito text-gray text-[10px]">Your enquiry</p>
        <p className="font-nunito text-dark text-xs mt-1 line-clamp-3">{enquiry.message}</p>
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
