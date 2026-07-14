import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Store, User, MapPin, Mail, Clock, Save, CheckCircle, Camera,
  ArrowLeft, ArrowRight, FileText, Upload,
} from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import KitchenAvatar from "../../components/common/KitchenAvatar"
import StateCitySelect from "../../components/common/StateCitySelect"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api, uploadKitchenLogo, uploadKitchenFssaiLicense } from "../../lib/api"
import { patchSessionForRole } from "../../lib/authStorage"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const inputClass =
  "w-full px-4 py-3 bg-[#f8f8f8] rounded-xl text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 focus:bg-white transition-colors"

const statusStyles = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
}

const steps = [
  { id: 1, title: "Kitchen", icon: Store },
  { id: 2, title: "Contact", icon: User },
  { id: 3, title: "Location", icon: MapPin },
]

function kitchenToForm(kitchen) {
  if (!kitchen) return null
  return {
    name: kitchen.name || "",
    ownerName: kitchen.owner_name || kitchen.user_name || "",
    phone: kitchen.phone || "",
    email: kitchen.email || kitchen.user_email || "",
    speciality: kitchen.speciality || "",
    kitchenType: kitchen.kitchen_type || "veg",
    bestItem: kitchen.best_item || "",
    fssaiNumber: kitchen.fssai_number || "",
    address: kitchen.address || "",
    city: kitchen.city || "",
    state: kitchen.state || "",
    pincode: kitchen.pincode || "",
    openingTime: kitchen.opening_time || "",
    description: kitchen.description || "",
  }
}

function ToggleSwitch({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex-1 pr-4">
        <h3 className="font-poppins font-bold text-sm text-[#1c1c1c]">{label}</h3>
        <p className="font-nunito text-[#696969] text-[11px] mt-1">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex-shrink-0 cursor-pointer",
          checked ? "bg-primary" : "bg-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div
          className={cn(
            "bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

export default function KitchenProfilePage() {
  const { kitchen, refreshKitchen } = useAuth()
  const [form, setForm] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFssai, setUploadingFssai] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    refreshKitchen().catch(() => {})
  }, [refreshKitchen])

  useEffect(() => {
    if (kitchen) setForm(kitchenToForm(kitchen))
  }, [kitchen])

  const handleStatusToggle = async (field, value) => {
    setUpdatingStatus(true)
    setError("")
    setSuccess("")
    try {
      const payload = {}
      if (field === "is_active") payload.isActive = value
      if (field === "is_fresh_food_active") payload.isFreshFoodActive = value
      if (field === "is_grocery_active") payload.isGroceryActive = value

      await api("/api/kitchens/me/status", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      await refreshKitchen()
      setSuccess("Visibility settings updated successfully")
    } catch (err) {
      setError(err.message || "Failed to update visibility settings")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setSuccess("")
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.speciality.trim() || !form.bestItem.trim() || !form.description.trim()) {
        setError("Kitchen name, speciality, signature dish, and description are required")
        return false
      }
    }
    if (step === 2) {
      if (!form.ownerName.trim() || !form.phone.trim() || !form.fssaiNumber.trim()) {
        setError("Owner name, phone, and FSSAI number are required")
        return false
      }
      if (!kitchen?.fssai_license) {
        setError("Upload your FSSAI license document")
        return false
      }
      if (form.phone.length !== 10) {
        setError("Phone number must be 10 digits")
        return false
      }
      if (form.fssaiNumber.trim().length < 10) {
        setError("Enter a valid FSSAI license number")
        return false
      }
    }
    if (step === 3) {
      if (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
        setError("Full address, city, state, and pincode are required")
        return false
      }
      if (form.pincode.length !== 6) {
        setError("Pincode must be 6 digits")
        return false
      }
      if (!form.openingTime.trim()) {
        setError("Operating hours are required")
        return false
      }
    }
    setError("")
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 3))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleLogoUpload = async (file) => {
    setUploadingLogo(true)
    setError("")
    try {
      await uploadKitchenLogo(file)
      await refreshKitchen()
      setSuccess("Logo updated")
    } catch (err) {
      setError(err.message || "Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleFssaiUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFssai(true)
    setError("")
    try {
      await uploadKitchenFssaiLicense(file)
      await refreshKitchen()
      setSuccess("FSSAI license updated")
    } catch (err) {
      setError(err.message || "Failed to upload FSSAI license")
    } finally {
      setUploadingFssai(false)
      e.target.value = ""
    }
  }

  const fssaiLicenseUrl = resolveMediaUrl(kitchen?.fssai_license)
  const isPdfLicense = fssaiLicenseUrl?.toLowerCase().includes(".pdf")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep()) return

    setError("")
    setSuccess("")
    setSaving(true)
    try {
      const data = await api("/api/kitchens/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          ownerName: form.ownerName,
          phone: form.phone,
          speciality: form.speciality,
          kitchenType: form.kitchenType,
          bestItem: form.bestItem,
          fssaiNumber: form.fssaiNumber,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          openingTime: form.openingTime,
          description: form.description,
        }),
      })
      await refreshKitchen()
      if (data.user) {
        patchSessionForRole("kitchen", { user: data.user, kitchen: data.kitchen })
      }
      setSuccess("Profile saved successfully")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setError(err.message || "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <KitchenLayout fullBleed>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </KitchenLayout>
    )
  }

  return (
    <KitchenLayout fullBleed>
      <div className="w-full space-y-6">
        {/* Status and Visibility Toggles */}
        <div className="bg-white w-full rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden p-6">
          <h2 className="font-poppins font-bold text-lg text-[#1c1c1c] mb-1">Shop Status & Visibility</h2>
          <p className="font-nunito text-[#696969] text-xs mb-4">
            Control whether your kitchen is open to customers, and what types of products are visible.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ToggleSwitch
              label="Shop Status"
              description="Toggle whether your kitchen is active and open for orders."
              checked={Boolean(kitchen?.is_active ?? true)}
              onChange={(val) => handleStatusToggle("is_active", val)}
              disabled={updatingStatus}
            />
            <ToggleSwitch
              label="Fresh Food Delivery"
              description="Show or hide your Fresh Food items (meals, thalis, etc.)."
              checked={Boolean(kitchen?.is_fresh_food_active ?? true)}
              onChange={(val) => handleStatusToggle("is_fresh_food_active", val)}
              disabled={updatingStatus}
            />
            <ToggleSwitch
              label="Grocery Delivery"
              description="Show or hide your Grocery products."
              checked={Boolean(kitchen?.is_grocery_active ?? true)}
              onChange={(val) => handleStatusToggle("is_grocery_active", val)}
              disabled={updatingStatus}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white w-full rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-[#e8e8e8]">
            <h1 className="font-poppins font-bold text-xl text-[#1c1c1c]">Kitchen Profile</h1>
            <p className="font-nunito text-[#696969] text-sm mt-0.5">
              Step {step} of 3 · Update your kitchen details
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm font-nunito">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm font-nunito flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {/* Step indicator */}
          <div className="px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-1">
              {steps.map((s, i) => {
                const Icon = s.icon
                const isActive = step === s.id
                const isDone = step > s.id
                return (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                          isDone && "bg-primary text-white",
                          isActive && "bg-primary text-white shadow-md shadow-primary/25",
                          !isActive && !isDone && "bg-[#f4f4f5] text-[#999]"
                        )}
                      >
                        {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
                      </div>
                      <span
                        className={cn(
                          "font-poppins text-[10px] font-medium mt-1.5 truncate w-full text-center",
                          isActive ? "text-primary" : isDone ? "text-[#1c1c1c]" : "text-[#999]"
                        )}
                      >
                        {s.title}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-1 rounded-full mb-5",
                          step > s.id ? "bg-primary" : "bg-[#e8e8e8]"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form steps */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-4 flex-1">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <StepTitle title="Kitchen details" subtitle="Logo and how customers see your kitchen" />

                    <div className="flex items-center gap-4 p-4 bg-[#f8f8f8] rounded-xl border border-[#eee]">
                      <KitchenAvatar
                        kitchen={kitchen}
                        size="lg"
                        editable
                        uploading={uploadingLogo}
                        onUpload={handleLogoUpload}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-poppins font-semibold text-sm text-[#1c1c1c]">Kitchen logo</p>
                        <p className="font-nunito text-xs text-[#999] mt-1">
                          Tap to upload. Initial shown if empty.
                        </p>
                        <p className="font-nunito text-[11px] text-primary mt-1.5 flex items-center gap-1">
                          <Camera size={11} /> JPG, PNG or WebP
                        </p>
                        {kitchen?.status && (
                          <span className={cn(
                            "inline-block mt-2 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full capitalize border",
                            statusStyles[kitchen.status]
                          )}>
                            {kitchen.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <Field label="Kitchen Name" required>
                      <input className={inputClass} value={form.name} onChange={update("name")} />
                    </Field>
                    <Field label="Speciality" required>
                      <input className={inputClass} value={form.speciality} onChange={update("speciality")} placeholder="North Indian, Tiffin..." />
                    </Field>
                    <Field label="Kitchen Type" required>
                      <select className={inputClass} value={form.kitchenType} onChange={update("kitchenType")}>
                        <option value="veg">Pure Veg</option>
                        <option value="non_veg">Non-Veg</option>
                        <option value="both">Veg & Non-Veg</option>
                      </select>
                    </Field>
                    <Field label="Signature Dish" required>
                      <input className={inputClass} value={form.bestItem} onChange={update("bestItem")} />
                    </Field>
                    <Field label="About your kitchen" required>
                      <textarea
                        className={cn(inputClass, "min-h-[100px] resize-y")}
                        value={form.description}
                        onChange={update("description")}
                      />
                    </Field>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <StepTitle title="Owner & contact" subtitle="Who runs this kitchen and how to reach you" />

                    <Field label="Owner Name" required>
                      <input className={inputClass} value={form.ownerName} onChange={update("ownerName")} />
                    </Field>
                    <Field label="Phone" required>
                      <input
                        className={inputClass}
                        value={form.phone}
                        onChange={update("phone")}
                        maxLength={10}
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="Email">
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
                        <input className={cn(inputClass, "pl-11 bg-gray-100 cursor-not-allowed")} value={form.email} readOnly />
                      </div>
                      <p className="font-nunito text-[11px] text-[#999] mt-1">Email cannot be changed</p>
                    </Field>
                    <Field label="FSSAI License Number" required>
                      <input className={inputClass} value={form.fssaiNumber} onChange={update("fssaiNumber")} placeholder="14-digit FSSAI number" />
                    </Field>
                    <Field label="FSSAI License Document" required>
                      <div className="rounded-xl border border-[#e8e8e8] bg-[#f8f8f8] p-4">
                        {fssaiLicenseUrl ? (
                          <div className="mb-3">
                            {isPdfLicense ? (
                              <a
                                href={fssaiLicenseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-nunito text-primary hover:underline"
                              >
                                <FileText size={16} />
                                View uploaded license (PDF)
                              </a>
                            ) : (
                              <a href={fssaiLicenseUrl} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={fssaiLicenseUrl}
                                  alt="FSSAI license"
                                  className="max-h-40 rounded-lg border border-[#e8e8e8] object-contain bg-white"
                                />
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="font-nunito text-xs text-[#999] mb-3">No license document uploaded yet.</p>
                        )}
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#e8e8e8] text-sm font-poppins font-medium text-[#1c1c1c] cursor-pointer hover:bg-[#fafafa] transition-colors">
                          <Upload size={16} className="text-primary" />
                          {uploadingFssai ? "Uploading..." : fssaiLicenseUrl ? "Replace license" : "Upload license"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                            className="hidden"
                            disabled={uploadingFssai}
                            onChange={handleFssaiUpload}
                          />
                        </label>
                        <p className="font-nunito text-[11px] text-[#999] mt-2">JPG, PNG, WebP, or PDF</p>
                      </div>
                    </Field>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <StepTitle title="Location & hours" subtitle="Where customers can find you" />

                    <Field label="Full Address" required>
                      <textarea className={cn(inputClass, "min-h-[80px] resize-y")} value={form.address} onChange={update("address")} />
                    </Field>
                    <Field label="State & City" required>
                      <StateCitySelect
                        state={form.state}
                        city={form.city}
                        onStateChange={(value) => setForm((f) => ({ ...f, state: value, city: "" }))}
                        onCityChange={(value) => setForm((f) => ({ ...f, city: value }))}
                        required
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Pincode" required>
                      <input className={inputClass} value={form.pincode} onChange={update("pincode")} maxLength={6} inputMode="numeric" />
                    </Field>
                    <Field label="Operating Hours" required>
                      <div className="relative">
                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
                        <input
                          className={cn(inputClass, "pl-11")}
                          value={form.openingTime}
                          onChange={update("openingTime")}
                          placeholder="8:00 AM - 9:00 PM"
                        />
                      </div>
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step navigation */}
            <div className="flex gap-3 px-4 py-3 border-t border-[#f0f0f0] bg-[#fafafa]/50">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#e8e8e8] bg-white font-poppins font-semibold text-sm text-[#696969] hover:bg-[#fafafa] cursor-pointer transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : null}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-poppins font-semibold text-sm hover:bg-primary-dark cursor-pointer transition-colors flex-1"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Button type="submit" disabled={saving} rounded={false} className="flex-1 w-full !rounded-xl">
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </KitchenLayout>
  )
}

function StepTitle({ title, subtitle }) {
  return (
    <div className="mb-2 pb-3 border-b border-gray-50">
      <h2 className="font-poppins font-semibold text-base text-[#1c1c1c]">{title}</h2>
      <p className="font-nunito text-xs text-[#999] mt-0.5">{subtitle}</p>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="w-full">
      <label className="block font-poppins text-xs font-medium text-[#696969] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
