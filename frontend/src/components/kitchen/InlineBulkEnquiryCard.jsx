import { useState } from "react"
import { ChefHat, ArrowRight, RotateCw, FileText, CheckCircle, Clock } from "lucide-react"
import { cn } from "../../lib/utils"

export default function InlineBulkEnquiryCard({
  enquiry,
  onOpenModal,
  onRefresh,
  refreshing = false,
  onRequireCustomer,
}) {
  const hasActiveEnquiry = enquiry && enquiry.status !== "completed"

  if (!hasActiveEnquiry) {
    return (
      <div className="mt-4 px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C4240] to-[#135E39] p-5 sm:p-6 text-white shadow-lg border border-emerald-900/40">
          {/* Subtle background decoration */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <ChefHat size={18} className="text-[#F4C400]" />
            </div>
            <h3 className="font-poppins font-extrabold text-white text-base sm:text-lg">
              Bulk Order Enquiry
            </h3>
          </div>

          <p className="font-nunito text-white/90 text-xs sm:text-sm leading-relaxed mb-4 max-w-2xl">
            Planning a party, corporate event, or hosting a gathering? Get custom menus and bulk discounts directly from this home kitchen! (Min value: ₹2000)
          </p>

          <button
            type="button"
            onClick={() => {
              if (onRequireCustomer && !onRequireCustomer()) return
              onOpenModal()
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#F4C400] hover:bg-[#e5b800] text-[#0a1f13] font-poppins font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl transition-all cursor-pointer shadow-md active:scale-95"
          >
            <span>Send Enquiry</span>
            <ArrowRight size={15} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    )
  }

  // Pending / Under Review State
  if (enquiry.status === "pending") {
    return (
      <div className="mt-4 px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C4240] to-[#135E39] p-5 sm:p-6 text-white shadow-lg border border-emerald-900/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <ChefHat size={18} className="text-[#F4C400]" />
              </div>
              <h3 className="font-poppins font-extrabold text-white text-base sm:text-lg">
                Bulk Order Enquiry
              </h3>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh status"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-poppins font-bold text-[#F4C400] text-xs uppercase tracking-wider">
                STATUS: UNDER REVIEW
              </span>
              <span className="font-poppins font-bold text-white text-xs sm:text-sm">
                Est: ₹{enquiry.estimatedValue}
              </span>
            </div>
            <p className="font-nunito text-white/90 text-xs sm:text-sm leading-relaxed line-clamp-2 italic">
              "{enquiry.message}"
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenModal}
            className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-poppins font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 text-center"
          >
            View Enquiry Status
          </button>
        </div>
      </div>
    )
  }

  // Quoted State
  if (enquiry.status === "quoted") {
    return (
      <div className="mt-4 px-4 sm:px-0">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C4240] to-[#135E39] p-5 sm:p-6 text-white shadow-lg border border-emerald-900/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <ChefHat size={18} className="text-[#F4C400]" />
              </div>
              <h3 className="font-poppins font-extrabold text-white text-base sm:text-lg">
                Quotation Received!
              </h3>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh status"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-poppins font-bold text-[#F4C400] text-xs uppercase tracking-wider">
                Quotation Ready
              </span>
              <span className="font-poppins font-extrabold text-white text-lg sm:text-xl">
                ₹{enquiry.quotationAmount}
              </span>
            </div>
            {enquiry.quotationNotes && (
              <p className="font-nunito text-white/80 text-xs line-clamp-1 italic mt-1">
                Note: "{enquiry.quotationNotes}"
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenModal}
            className="w-full py-3 px-4 rounded-2xl bg-[#F4C400] hover:bg-[#e5b800] text-[#0a1f13] font-poppins font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <span>View & Download Quote</span>
            <ArrowRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    )
  }

  // Accepted / Rejected / Other States
  const statusLabel =
    enquiry.status === "accepted"
      ? "Accepted - Pending Payment"
      : enquiry.status === "rejected"
      ? "Quotation Rejected"
      : enquiry.status

  return (
    <div className="mt-4 px-4 sm:px-0">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C4240] to-[#135E39] p-5 sm:p-6 text-white shadow-lg border border-emerald-900/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <ChefHat size={18} className="text-[#F4C400]" />
            </div>
            <h3 className="font-poppins font-extrabold text-white text-base sm:text-lg">
              Bulk Order Enquiry
            </h3>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh status"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-poppins font-bold text-[#F4C400] text-xs uppercase tracking-wider">
              {statusLabel}
            </span>
            <span className="font-poppins font-bold text-white text-sm">
              ₹{enquiry.quotationAmount || enquiry.estimatedValue}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-poppins font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 text-center"
        >
          View Enquiry & Actions
        </button>
      </div>
    </div>
  )
}
