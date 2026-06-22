import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChefHat,
  ArrowRight,
  ArrowLeft,
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  UtensilsCrossed,
  ShieldCheck,
  TrendingUp,
  CheckCircle,
  Upload,
  FileText,
} from "lucide-react"
import Button from "../../components/ui/Button"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"
import { cn } from "../../lib/utils"

const initialForm = {
  name: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
  speciality: "",
  kitchenType: "veg",
  bestItem: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  openingTime: "",
  description: "",
}

const steps = [
  { id: 1, title: "Kitchen Info", icon: Store },
  { id: 2, title: "Account", icon: User },
  { id: 3, title: "Location", icon: MapPin },
]

const perks = [
  { icon: ShieldCheck, text: "Get hygiene verified badge" },
  { icon: UtensilsCrossed, text: "Sell food & groceries together" },
  { icon: TrendingUp, text: "Reach thousands of customers" },
]

export default function KitchenSignupPage() {
  const navigate = useNavigate()
  const { registerKitchen } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [fssaiLicenseFile, setFssaiLicenseFile] = useState(null)
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.ownerName.trim() || !form.speciality.trim() || !form.bestItem.trim()) {
        setError("Kitchen name, owner name, speciality, and signature dish are required")
        return false
      }
    }
    if (step === 2) {
      if (!form.email.trim() || !form.phone.trim() || !form.password || !fssaiLicenseFile) {
        setError("Email, phone, password, and FSSAI license upload are required")
        return false
      }
      if (form.phone.length !== 10) {
        setError("Phone number must be 10 digits")
        return false
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters")
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
      if (!form.description.trim()) {
        setError("Kitchen description is required")
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Enter key or accidental submit on steps 1–2 should advance, not register
    if (step < 3) {
      nextStep()
      return
    }

    if (!validateStep()) return

    setError("")
    setLoading(true)
    try {
      await registerKitchen(form, fssaiLicenseFile)
      navigate("/kitchen/dashboard", { state: { newSignup: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center w-full px-12 xl:px-16 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-8"
          >
            <ChefHat size={32} className="text-secondary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-poppins font-bold text-white text-3xl xl:text-4xl leading-tight"
          >
            Turn your home kitchen
            <br />
            <span className="text-secondary">into a business</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-nunito text-white/60 mt-5 max-w-md leading-relaxed"
          >
            Join Atleast80's trusted network of home kitchens. Register today and start
            serving homemade food to customers in your city.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-10 space-y-3"
          >
            {perks.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-white/10"
                >
                  <div className="w-9 h-9 bg-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-secondary" />
                  </div>
                  <span className="font-nunito text-white/85 text-sm">{item.text}</span>
                </div>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 pt-8 border-t border-white/10"
          >
            <p className="font-nunito text-white/40 text-sm">
              Free to register · Admin approval within 24 hours
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden bg-gradient-to-br from-primary/10 via-cream to-secondary/10 px-6 pt-8 pb-6">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-gray cursor-pointer hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="font-nunito text-sm">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md">
              <ChefHat size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-xl text-dark">Register Kitchen</h1>
              <p className="font-nunito text-gray text-sm">Step {step} of 3</p>
            </div>
          </div>
        </div>

        {/* Desktop back */}
        <div className="hidden lg:block px-10 xl:px-14 pt-8">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-gray cursor-pointer hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-nunito text-sm">Back to home</span>
          </button>
        </div>

        <div className="flex-1 px-6 md:px-10 lg:px-10 xl:px-14 py-6 lg:py-8 max-w-2xl lg:max-w-none mx-auto w-full">
          {/* Desktop title */}
          <div className="hidden lg:block mb-8">
            <h2 className="font-poppins font-bold text-2xl text-dark">Create your kitchen profile</h2>
            <p className="font-nunito text-gray mt-1">Fill in the details below — admin will review your application</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0",
                        isDone && "bg-primary text-white",
                        isActive && "bg-primary text-white shadow-md shadow-primary/30",
                        !isActive && !isDone && "bg-white border border-gray-light text-gray"
                      )}
                    >
                      {isDone ? <CheckCircle size={18} /> : <Icon size={18} />}
                    </div>
                    <span
                      className={cn(
                        "hidden sm:block font-poppins text-xs font-medium truncate",
                        isActive ? "text-primary" : isDone ? "text-dark" : "text-gray"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-2 rounded-full transition-colors",
                        step > s.id ? "bg-primary" : "bg-gray-light"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 md:p-8 shadow-sm border border-gray-light/50">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <SectionTitle
                      title="Tell us about your kitchen"
                      subtitle="This is how customers will discover you"
                    />
                    <Field label="Kitchen Name" required icon={Store}>
                      <input
                        className={inputClass}
                        value={form.name}
                        onChange={update("name")}
                        placeholder="e.g. Amma's Rasoi"
                        required
                      />
                    </Field>
                    <Field label="Owner Name" required icon={User}>
                      <input
                        className={inputClass}
                        value={form.ownerName}
                        onChange={update("ownerName")}
                        placeholder="e.g. Priya Sharma"
                        required
                      />
                    </Field>
                    <Field label="Speciality" required icon={UtensilsCrossed}>
                      <input
                        className={inputClass}
                        value={form.speciality}
                        onChange={update("speciality")}
                        placeholder="North Indian Thali, Homemade Pickles, Tiffin..."
                        required
                      />
                    </Field>
                    <Field label="Kitchen Type" required>
                      <select
                        className={inputClass}
                        value={form.kitchenType}
                        onChange={update("kitchenType")}
                        required
                      >
                        <option value="veg">Pure Veg</option>
                        <option value="non_veg">Non-Veg</option>
                        <option value="both">Veg & Non-Veg</option>
                      </select>
                    </Field>
                    <Field label="Signature Dish" required icon={UtensilsCrossed}>
                      <input
                        className={inputClass}
                        value={form.bestItem}
                        onChange={update("bestItem")}
                        placeholder="e.g. Dal Makhani Thali"
                        required
                      />
                    </Field>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <SectionTitle
                      title="Create your account"
                      subtitle="You'll use these credentials to manage your kitchen"
                    />
                    <Field label="Email" required icon={Mail}>
                      <input
                        type="email"
                        className={inputClass}
                        value={form.email}
                        onChange={update("email")}
                        placeholder="kitchen@example.com"
                        required
                      />
                    </Field>
                    <Field label="Phone" required icon={Phone}>
                      <input
                        className={inputClass}
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        required
                      />
                    </Field>
                    <div>
                      <label className="font-poppins text-sm font-medium text-dark-light block mb-2">
                        Password <span className="text-accent">*</span>
                      </label>
                      <PasswordInput
                        icon={Lock}
                        value={form.password}
                        onChange={update("password")}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                      />
                    </div>
                    <Field label="FSSAI License" required icon={ShieldCheck}>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            setFssaiLicenseFile(file || null)
                            setError("")
                          }}
                        />
                        {fssaiLicenseFile ? (
                          <>
                            <FileText size={28} className="text-primary" />
                            <span className="font-nunito text-sm text-dark text-center break-all px-2">
                              {fssaiLicenseFile.name}
                            </span>
                            <span className="font-nunito text-xs text-gray">Tap to change file</span>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-gray" />
                            <span className="font-nunito text-sm text-gray text-center">
                              Upload FSSAI license (JPG, PNG, or PDF)
                            </span>
                          </>
                        )}
                      </label>
                    </Field>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <SectionTitle
                      title="Location & kitchen details"
                      subtitle="Customers and admin will verify this information"
                    />
                    <Field label="Full Address" required icon={MapPin}>
                      <input
                        className={inputClass}
                        value={form.address}
                        onChange={update("address")}
                        placeholder="House no., street, area, landmark"
                        required
                      />
                    </Field>
                    <div className="grid sm:grid-cols-3 gap-5">
                      <Field label="City" required icon={MapPin}>
                        <input className={inputClass} value={form.city} onChange={update("city")} placeholder="e.g. Lucknow" required />
                      </Field>
                      <Field label="State" required>
                        <input className={inputClass} value={form.state} onChange={update("state")} placeholder="e.g. Uttar Pradesh" required />
                      </Field>
                      <Field label="Pincode" required>
                        <input
                          className={inputClass}
                          value={form.pincode}
                          onChange={update("pincode")}
                          placeholder="6 digits"
                          maxLength={6}
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Operating Hours" required>
                      <input
                        className={inputClass}
                        value={form.openingTime}
                        onChange={update("openingTime")}
                        placeholder="e.g. 8 AM - 9 PM"
                        required
                      />
                    </Field>
                    <Field label="About your kitchen" required>
                      <textarea
                        className={`${inputClass} min-h-[120px] resize-none py-3`}
                        value={form.description}
                        onChange={update("description")}
                        placeholder="Cooking style, ingredients, hygiene practices, what makes your kitchen special..."
                        required
                      />
                    </Field>

                    <div className="bg-cream rounded-2xl p-5 border border-gray-light/50">
                      <p className="font-poppins text-xs font-semibold text-gray uppercase tracking-wide mb-3">
                        Review before submitting
                      </p>
                      <div className="space-y-2 text-sm font-nunito">
                        <SummaryRow label="Kitchen" value={form.name} />
                        <SummaryRow label="Owner" value={form.ownerName} />
                        <SummaryRow label="Type" value={form.kitchenType === "veg" ? "Pure Veg" : form.kitchenType === "non_veg" ? "Non-Veg" : "Veg & Non-Veg"} />
                        <SummaryRow label="Speciality" value={form.speciality} />
                        <SummaryRow label="Signature Dish" value={form.bestItem} />
                        <SummaryRow label="FSSAI" value={fssaiLicenseFile?.name || "Not uploaded"} />
                        <SummaryRow label="Contact" value={`${form.email} · ${form.phone}`} />
                        <SummaryRow label="Location" value={`${form.address}, ${form.city}, ${form.state} - ${form.pincode}`} />
                        <SummaryRow label="Hours" value={form.openingTime} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-error text-sm font-nunito bg-error/10 border border-error/20 px-4 py-3 rounded-xl mt-5"
                >
                  {error}
                </motion.p>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <Button type="button" variant="outline" size="lg" onClick={prevStep} className="flex-1 sm:flex-none sm:px-8">
                    <ArrowLeft size={18} />
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" size="lg" onClick={nextStep} className="flex-1">
                    Continue
                    <ArrowRight size={18} />
                  </Button>
                ) : (
                  <Button type="submit" size="lg" className="flex-1" disabled={loading}>
                    {loading ? "Submitting..." : "Submit for Approval"}
                    <ArrowRight size={18} />
                  </Button>
                )}
              </div>
            </div>

            <p className="font-nunito text-gray text-sm text-center mt-6">
              Already registered?{" "}
              <Link to="/kitchen/login" className="text-primary font-semibold hover:underline">
                Sign in to your kitchen
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  "w-full px-4 py-3.5 bg-cream/50 rounded-xl border border-gray-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 focus:bg-white font-nunito text-sm transition-all"

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-2">
      <h3 className="font-poppins font-semibold text-lg text-dark">{title}</h3>
      <p className="font-nunito text-gray text-sm mt-0.5">{subtitle}</p>
    </div>
  )
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <div>
      <label className="font-poppins text-sm font-medium text-dark-light block mb-2">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray pointer-events-none" />
        )}
        {Icon ? (
          <div className="[&>input]:pl-11 [&>textarea]:pl-11">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray">{label}</span>
      <span className="text-dark font-medium text-right truncate">{value || "—"}</span>
    </div>
  )
}
