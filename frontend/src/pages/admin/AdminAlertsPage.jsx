import { useEffect, useState, useCallback } from "react"
import { Bell, Send } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import Chip from "../../components/common/Chip"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

const LIST_FILTERS = [
  { id: "all", label: "All" },
  { id: "kitchen", label: "Kitchens" },
  { id: "customer", label: "Customers" },
]

const AUDIENCE_LABELS = {
  kitchen: "Kitchens",
  customer: "Customers",
}

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

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [listFilter, setListFilter] = useState("all")
  const [targetRole, setTargetRole] = useState("kitchen")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState("")

  const load = useCallback(() => {
    setListLoading(true)
    const params = listFilter !== "all" ? `?targetRole=${listFilter}` : ""
    api(`/api/admin/alerts${params}`, {}, "admin")
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setListLoading(false))
  }, [listFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    try {
      await api(
        "/api/admin/alerts",
        {
          method: "POST",
          body: JSON.stringify({ targetRole, title, body }),
        },
        "admin"
      )
      setTitle("")
      setBody("")
      setMessage("Alert sent successfully")
      if (listFilter === "all" || listFilter === targetRole) {
        load()
      } else {
        setListFilter(targetRole)
      }
    } catch (err) {
      setMessage(err.message || "Failed to send alert")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <Bell size={22} className="text-primary" />
          <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Broadcast alerts</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-white rounded-xl border border-[#e8e8e8] p-5 sm:p-6 mb-8 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-poppins text-sm font-medium text-[#1c1c1c]">Audience</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40"
              >
                <option value="kitchen">All kitchens (sellers)</option>
                <option value="customer">All customers (users)</option>
              </select>
            </div>
            <div>
              <label className="font-poppins text-sm font-medium text-[#1c1c1c]">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Alert title"
                className="w-full mt-1.5 px-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="font-poppins text-sm font-medium text-[#1c1c1c]">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              placeholder="Write your message..."
              className="w-full mt-1.5 px-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 resize-y min-h-[120px]"
            />
          </div>

          {message && (
            <p className={cn("text-sm font-nunito", message.includes("success") ? "text-primary" : "text-red-600")}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer disabled:opacity-50"
          >
            <Send size={16} />
            {loading ? "Sending..." : "Send alert"}
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-poppins font-semibold text-[#1c1c1c]">Recent alerts</h2>
          <div className="flex flex-wrap gap-2">
            {LIST_FILTERS.map((f) => (
              <Chip
                key={f.id}
                active={listFilter === f.id}
                onClick={() => setListFilter(f.id)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        {listLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e8e8e8] p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-8 text-center">
            <p className="font-nunito text-sm text-gray">
              No alerts found{listFilter !== "all" ? ` for ${AUDIENCE_LABELS[listFilter]?.toLowerCase()}` : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-[#e8e8e8] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="font-poppins font-semibold text-sm sm:text-base text-[#1c1c1c]">{a.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-poppins uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {AUDIENCE_LABELS[a.targetRole] || a.targetRole}
                    </span>
                    {a.isSystem ? (
                      <span className="text-[10px] font-poppins uppercase tracking-wide text-gray bg-gray-100 px-2.5 py-0.5 rounded-full">
                        System
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="font-nunito text-sm text-gray leading-relaxed">{a.body}</p>
                <p className="font-nunito text-xs text-gray/70 mt-3">{formatDate(a.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
