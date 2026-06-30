import { useEffect, useState } from "react"
import { Mail, Phone, MapPin, Pencil, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { cn } from "../../lib/utils"

function InfoTile({ icon: Icon, label, value, muted }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cream/80 border border-gray-100/80">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-poppins font-bold uppercase tracking-wider text-gray">{label}</p>
        <p className={cn("font-nunito text-sm mt-0.5 break-words", muted ? "text-gray" : "text-dark")}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default function ProfileAccountPage() {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", pincode: "",
  })
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)

  const hasAddress = Boolean(user?.address || user?.city || user?.pincode)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      pincode: user.pincode || "",
    })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      await updateProfile(form)
      setEditing(false)
    } catch (err) {
      setSaveError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-poppins font-semibold text-dark text-lg">Account details</h2>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-poppins font-bold cursor-pointer hover:bg-primary/15 transition-colors"
        >
          <Pencil size={12} />
          Edit profile
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Mail} label="Email" value={user?.email} />
        <InfoTile icon={Phone} label="Phone" value={user?.phone ? `+91 ${user.phone}` : "—"} />
        <div className="sm:col-span-2">
          <InfoTile
            icon={MapPin}
            label="Delivery address"
            value={
              hasAddress
                ? [user.address, user.city, user.pincode].filter(Boolean).join(", ")
                : "No address saved yet"
            }
            muted={!hasAddress}
          />
        </div>
      </div>

      {!hasAddress && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 w-full text-center text-sm font-poppins font-semibold text-primary cursor-pointer hover:underline"
        >
          Add delivery address for checkout →
        </button>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setEditing(false)}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-poppins font-bold text-lg text-dark">Edit profile</h3>
                  <p className="font-nunito text-xs text-gray mt-0.5">Update your account & delivery info</p>
                </div>
                <button
                  onClick={() => setEditing(false)}
                  className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {saveError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700 font-nunito">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                {[
                  ["name", "Full name", "text"],
                  ["email", "Email", "email"],
                  ["phone", "Phone", "tel"],
                  ["address", "Address", "text"],
                  ["city", "City", "text"],
                  ["pincode", "Pincode", "tel"],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label className="text-xs font-poppins font-semibold text-dark">{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [key]:
                            key === "phone" || key === "pincode"
                              ? e.target.value.replace(/\D/g, "").slice(0, key === "phone" ? 10 : 6)
                              : e.target.value,
                        }))
                      }
                      className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-gray-light font-nunito text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full mt-4" size="lg" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
