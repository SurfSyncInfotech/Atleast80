import { useEffect, useState } from "react"
import { X, Bell, ShieldCheck } from "lucide-react"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function AlertsPanel({ open, onClose }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api("/api/alerts", {}, "kitchen")
      setAlerts(data.alerts || [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const dismiss = async (id) => {
    try {
      await api(`/api/alerts/${id}/dismiss`, { method: "POST" }, "kitchen")
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <h2 className="font-poppins font-bold text-dark">Alerts</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="font-nunito text-sm text-gray text-center py-8">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="font-nunito text-sm text-gray text-center py-8">No alerts right now.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl border p-4",
                  alert.isSystem ? "border-primary/20 bg-primary/5" : "border-gray-100 bg-gray-50"
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  {Boolean(alert.isSystem) && (
                    <ShieldCheck size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="font-poppins font-semibold text-sm text-dark">{alert.title}</h3>
                </div>
                <p className="font-nunito text-sm text-gray leading-relaxed">{alert.body}</p>
                {!Boolean(alert.isSystem) && (
                  <button
                    type="button"
                    onClick={() => dismiss(alert.id)}
                    className="mt-3 text-xs font-poppins font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
