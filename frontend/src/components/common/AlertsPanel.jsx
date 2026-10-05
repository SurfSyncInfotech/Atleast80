import { useEffect, useState } from "react"
import { X, Bell, ShieldCheck, LogIn } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"
import { cn } from "../../lib/utils"

export default function AlertsPanel({ open, onClose, role = "customer" }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const { isCustomer, isKitchen, isAdmin } = useAuth()
  const navigate = useNavigate()

  const isLoggedIn = role === "customer" ? isCustomer : (role === "kitchen" ? isKitchen : isAdmin)

  const load = async () => {
    if (!isLoggedIn) {
      setAlerts([])
      return
    }
    setLoading(true)
    try {
      const data = await api("/api/alerts", {}, role)
      setAlerts(data.alerts || [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open, isLoggedIn, role])

  const dismiss = async (id) => {
    try {
      await api(`/api/alerts/${id}/dismiss`, { method: "POST" }, role)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9999] transition-opacity backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 max-w-full bg-white z-[10000] shadow-2xl flex flex-col transition-transform">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <h2 className="font-poppins font-bold text-dark text-lg">Notifications</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 sm:pb-6 bg-white">
          {!isLoggedIn ? (
            <div className="text-center py-12 px-4">
              <Bell size={40} className="mx-auto text-gray/40 mb-3" />
              <p className="font-poppins font-semibold text-dark mb-1">Stay updated!</p>
              <p className="font-nunito text-sm text-gray mb-6">Sign in to view your order updates and notifications.</p>
              <button
                onClick={() => {
                  onClose()
                  navigate("/login")
                }}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-poppins text-sm font-semibold hover:bg-primary-dark cursor-pointer transition-colors shadow-sm"
              >
                <LogIn size={16} />
                Sign In
              </button>
            </div>
          ) : loading ? (
            <p className="font-nunito text-sm text-gray text-center py-8">Loading notifications...</p>
          ) : (
            <div className="space-y-3">
              {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-primary flex-shrink-0" />
                    <span className="text-xs font-poppins text-dark">Enable Web Push Notifications for live order popups</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { requestWebNotificationPermission } = await import("../../lib/firebase")
                        const { readSessionForRole } = await import("../../lib/authStorage")
                        const session = readSessionForRole(role)
                        await requestWebNotificationPermission(session?.token)
                        window.location.reload()
                      } catch (err) {
                        console.warn("Enable notification error:", err)
                      }
                    }}
                    className="bg-primary text-white text-xs font-poppins font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-dark cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    Enable
                  </button>
                </div>
              )}

              {alerts.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell size={40} className="mx-auto text-gray/30 mb-3" />
                  <p className="font-poppins font-medium text-gray">No notifications right now.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all shadow-sm",
                      alert.isSystem ? "border-primary/20 bg-primary/5" : "border-gray-100 bg-gray-50 hover:bg-white"
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
          )}
        </div>
      </div>
    </>
  )
}
