import { useState, useEffect } from "react"
import { IndianRupee, Landmark, QrCode, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function PayoutSettingsSection() {
  const [payoutMode, setPayoutMode] = useState("upi")
  const [bankAccountName, setBankAccountName] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [bankIfsc, setBankIfsc] = useState("")
  const [upiId, setUpiId] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    api("/api/kitchens/me/payout-settings", {}, "kitchen")
      .then((data) => {
        if (!active) return
        setPayoutMode(data.payoutMode || "upi")
        setBankAccountName(data.bankAccountName || "")
        setBankName(data.bankName || "")
        setBankAccountNumber(data.bankAccountNumber || "")
        setBankIfsc(data.bankIfsc || "")
        setUpiId(data.upiId || "")
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load payout settings")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (payoutMode === "bank") {
      if (!bankAccountName.trim()) {
        setError("Account Holder Name is required")
        return
      }
      if (!bankName.trim()) {
        setError("Bank Name is required")
        return
      }
      if (!bankAccountNumber.trim()) {
        setError("Account Number is required")
        return
      }
      if (!bankIfsc.trim() || bankIfsc.trim().length !== 11) {
        setError("Valid 11-character IFSC Code is required (e.g. SBIN0001234)")
        return
      }
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        setError("Valid UPI ID / VPA is required (e.g. name@upi)")
        return
      }
    }

    setSaving(true)
    try {
      await api("/api/kitchens/me/payout-settings", {
        method: "PUT",
        body: JSON.stringify({
          payoutMode,
          bankAccountName: bankAccountName.trim(),
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          upiId: upiId.trim().toLowerCase(),
        })
      }, "kitchen")

      setSuccess("Payout details saved successfully!")
      setTimeout(() => setSuccess(""), 4000)
    } catch (err) {
      setError(err.message || "Failed to save payout settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-center py-8 text-gray font-nunito text-sm">
        <Loader2 size={18} className="animate-spin text-primary mr-2" />
        Loading payout settings...
      </div>
    )
  }

  const isConfigured = payoutMode === "upi" ? Boolean(upiId) : Boolean(bankAccountNumber && bankIfsc)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IndianRupee size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-poppins font-bold text-dark text-base">Payout & Bank Details</h3>
            <p className="font-nunito text-xs text-gray">Receive your weekly/monthly kitchen sales payouts directly</p>
          </div>
        </div>
        {isConfigured ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-poppins font-semibold border border-emerald-100 flex-shrink-0">
            <CheckCircle size={13} />
            Details Saved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-poppins font-semibold border border-amber-100 flex-shrink-0">
            Required for Payouts
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 font-nunito text-xs flex items-center gap-2">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-nunito text-xs flex items-center gap-2">
          <CheckCircle size={15} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-poppins font-semibold text-dark uppercase tracking-wider mb-2">
            Select Payout Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPayoutMode("upi")}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-poppins font-semibold cursor-pointer transition-all",
                payoutMode === "upi"
                  ? "bg-primary/10 border-primary text-primary shadow-xs"
                  : "bg-gray-50 border-gray-100 text-gray hover:bg-gray-100"
              )}
            >
              <QrCode size={16} />
              Instant UPI ID / VPA
            </button>
            <button
              type="button"
              onClick={() => setPayoutMode("bank")}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-poppins font-semibold cursor-pointer transition-all",
                payoutMode === "bank"
                  ? "bg-primary/10 border-primary text-primary shadow-xs"
                  : "bg-gray-50 border-gray-100 text-gray hover:bg-gray-100"
              )}
            >
              <Landmark size={16} />
              Bank Account Transfer
            </button>
          </div>
        </div>

        {payoutMode === "upi" ? (
          <div>
            <label className="block text-xs font-poppins font-semibold text-dark mb-1">
              UPI ID / VPA Handle <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9876543210@paytm or name@okicici"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="font-nunito text-[11px] text-gray mt-1">
              Payouts will be transferred directly to this UPI ID on settlement days.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Full name as per bank"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Enter bank account number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-poppins font-semibold text-dark mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-poppins font-semibold hover:bg-primary-dark cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-sm transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {saving ? "Saving Payout Details..." : "Save Payout Details"}
          </button>
        </div>
      </form>
    </div>
  )
}
