import { useEffect, useState } from "react"
import { MessageSquare, IndianRupee, FileText, Loader2, Upload, Trash2, AlertTriangle } from "lucide-react"
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

  const load = () => {
    setLoading(true)
    return api("/api/bulk-enquiries/partner", {}, "kitchen")
      .then((data) => setEnquiries(data.enquiries || []))
      .catch((err) => setError(err.message || "Failed to load enquiries"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
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
                      quoted
                      onDeleteQuotation={handleDeleteQuotation}
                      deleting={deletingId === enquiry.id}
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
  </>
  )
}

function EnquiryCard({
  enquiry,
  form,
  onFormChange,
  onUpload,
  uploading,
  quoted,
  onDeleteQuotation,
  deleting,
}) {
  return (
    <article className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-gray-50 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-poppins font-semibold text-dark">{enquiry.customerName}</p>
          <p className="font-nunito text-xs text-gray mt-0.5">{enquiry.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="font-poppins font-bold text-primary">₹{enquiry.estimatedValue}</p>
          <p className="font-nunito text-[10px] text-gray uppercase tracking-wide">estimated</p>
        </div>
      </div>

      <div className="px-4 md:px-5 py-4">
        <p className="font-nunito text-sm text-dark leading-relaxed">{enquiry.message}</p>
        <p className="font-nunito text-xs text-gray mt-2">
          {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleString("en-IN") : ""}
        </p>
      </div>

      {quoted ? (
        <div className="px-4 md:px-5 py-4 bg-green-50/50 border-t border-gray-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-nunito text-xs text-gray">Quotation sent</p>
              <p className="font-poppins font-bold text-green-800">₹{enquiry.quotationAmount}</p>
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
      ) : (
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
                  value={form.amount || ""}
                  onChange={(e) => onFormChange(enquiry.id, "amount", e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-light font-nunito text-sm bg-white"
                  placeholder="Quotation total"
                />
              </div>
            </div>
            <div>
              <label className="font-nunito text-xs text-gray block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form.notes || ""}
                onChange={(e) => onFormChange(enquiry.id, "notes", e.target.value)}
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
              onChange={(e) => onFormChange(enquiry.id, "file", e.target.files?.[0] || null)}
              className="w-full text-sm font-nunito file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
            />
          </div>
          <button
            type="button"
            onClick={() => onUpload(enquiry.id)}
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
