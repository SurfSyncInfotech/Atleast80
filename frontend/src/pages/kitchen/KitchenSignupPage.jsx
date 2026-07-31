import { useState, useEffect, useRef } from "react"
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
  Download,
  FileCheck,
  LocateFixed,
} from "lucide-react"
import Button from "../../components/ui/Button"
import PasswordInput from "../../components/ui/PasswordInput"
import StateCitySelect from "../../components/common/StateCitySelect"
import { useAuth } from "../../context/AuthContext"
import { getPartnerAgreement } from "../../lib/api"
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
  aadhaarNumber: "",
  panNumber: "",
}

const steps = [
  { id: 1, title: "Kitchen Info", icon: Store },
  { id: 2, title: "Account", icon: User },
  { id: 3, title: "Location", icon: MapPin },
  { id: 4, title: "Agreement", icon: FileCheck },
  { id: 5, title: "KYC Verify", icon: ShieldCheck },
]

const perks = [
  { icon: ShieldCheck, text: "Get hygiene verified badge" },
  { icon: UtensilsCrossed, text: "Sell food & groceries together" },
  { icon: TrendingUp, text: "Reach thousands of customers" },
]

export default function KitchenSignupPage() {
  const navigate = useNavigate()
  const { registerKitchen, verifyKitchenRegisterOtp, logoutKitchen } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [identifierType, setIdentifierType] = useState("phone")
  const [fssaiLicenseFile, setFssaiLicenseFile] = useState(null)
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  const [signupOtpVisible, setSignupOtpVisible] = useState(false)
  const [signupUserId, setSignupUserId] = useState(null)
  const [signupOtp, setSignupOtp] = useState(["", "", "", ""])
  const [signupDemoOtp, setSignupDemoOtp] = useState("")
  const [signupOtpError, setSignupOtpError] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)

  const [aadhaarCardFile, setAadhaarCardFile] = useState(null)
  const [aadhaarCardBackFile, setAadhaarCardBackFile] = useState(null)
  const [panCardFile, setPanCardFile] = useState(null)

  const signupOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const [agreement, setAgreement] = useState(null)
  const [agreementLoading, setAgreementLoading] = useState(false)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [agreementViewed, setAgreementViewed] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Location detection is not supported by your browser")
      return
    }
    setError("")
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "User-Agent": "Atleast80Web/1.0" } }
          )
          const data = await res.json()
          if (data?.address) {
            const addr = data.address
            const rawState = addr.state || ""
            const rawCity = addr.city || addr.town || addr.village || addr.county || ""
            const state = rawState ? rawState.charAt(0).toUpperCase() + rawState.slice(1) : ""
            const city = rawCity ? rawCity.charAt(0).toUpperCase() + rawCity.slice(1) : ""
            const road = addr.road || addr.suburb || addr.neighbourhood || ""
            const houseNumber = addr.house_number || ""
            const postcode = addr.postcode || ""

            let streetAddress = [houseNumber, road].filter(Boolean).join(", ")
            if (!streetAddress && data.display_name) {
              streetAddress = data.display_name.split(",").slice(0, 2).map((s) => s.trim()).join(", ")
            }

            setForm((f) => ({
              ...f,
              address: streetAddress || f.address,
              state: state || f.state,
              city: city || f.city,
              pincode: postcode || f.pincode,
            }))
          } else {
            setError("Could not resolve address details. Please fill manually.")
          }
        } catch {
          setError("Failed to detect location. Please fill manually.")
        } finally {
          setDetectingLocation(false)
        }
      },
      () => {
        setError("Location permission denied. Please allow access or fill manually.")
        setDetectingLocation(false)
      },
      { timeout: 12000, maximumAge: 300000, enableHighAccuracy: false }
    )
  }

  const switchIdentifierType = (type) => {
    setIdentifierType(type)
    setForm((f) => ({ ...f, email: type === "email" ? f.email : "", phone: type === "phone" ? f.phone : "" }))
  }

  const loadAgreement = async () => {
    if (agreement || agreementLoading) return
    setAgreementLoading(true)
    try {
      const data = await getPartnerAgreement()
      setAgreement(data)
    } catch {
      setError("Failed to load Partner Agreement. Please try again.")
    } finally {
      setAgreementLoading(false)
    }
  }

  useEffect(() => {
    if (step === 4) loadAgreement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.ownerName.trim() || !form.speciality.trim() || !form.bestItem.trim()) {
        setError("Kitchen name, owner name, speciality, and signature dish are required")
        return false
      }
    }
    if (step === 2) {
      const identifierValue = identifierType === "email" ? form.email.trim() : form.phone.trim()
      if (!identifierValue || !form.password || !fssaiLicenseFile) {
        setError(`${identifierType === "email" ? "Email" : "Phone"}, password, and FSSAI license upload are required`)
        return false
      }
      if (identifierType === "phone" && form.phone.length !== 10) {
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
    if (step === 4) {
      if (!agreement?.url) {
        setError("Partner Agreement is still loading. Please wait a moment.")
        return false
      }
      if (!agreementViewed) {
        setError("Please view the Partner Agreement PDF first.")
        return false
      }
      if (agreement?.videoUrl && !videoWatched) {
        setError("Please watch the training video first.")
        return false
      }
      if (!agreementAccepted) {
        setError("Please tick the confirmation checkbox to continue")
        return false
      }
    }
    if (step === 5) {
      if (!form.aadhaarNumber.trim() || !form.panNumber.trim() || !aadhaarCardFile || !aadhaarCardBackFile || !panCardFile) {
        setError("Aadhaar Number, Aadhaar Front & Back files, PAN Number, and PAN Card file are required")
        return false
      }
      if (!/^\d{12}$/.test(form.aadhaarNumber.trim())) {
        setError("Aadhaar number must be exactly 12 digits")
        return false
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.trim().toUpperCase())) {
        setError("PAN number must be a valid 10-character alphanumeric PAN")
        return false
      }
    }
    setError("")
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 5))
  }

  const prevStep = () => {
    setError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Enter key or accidental submit on steps 1–4 should advance, not register
    if (step < 5) {
      nextStep()
      return
    }

    if (!validateStep()) return

    setError("")
    setLoading(true)
    try {
      const data = await registerKitchen(
        { ...form, agreementVersion: agreement.version },
        fssaiLicenseFile,
        aadhaarCardFile,
        aadhaarCardBackFile,
        panCardFile
      )
      if (data?.requiresOtp) {
        setSignupUserId(data.userId)
        if (data.demoOtp) setSignupDemoOtp(data.demoOtp)
        setSignupOtp(["", "", "", ""])
        setSignupOtpError("")
        setSignupOtpVisible(true)
      } else {
        logoutKitchen()
        navigate("/kitchen/login")
      }
    } catch (err) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignupOtp = async (e) => {
    e.preventDefault()
    const otpVal = signupOtp.join("")
    if (otpVal.length !== 4) {
      setSignupOtpError("Please enter the 4-digit OTP")
      return
    }
    setSignupOtpError("")
    setOtpVerifying(true)
    try {
      await verifyKitchenRegisterOtp(signupUserId, otpVal)
      setSignupOtpVisible(false)
      logoutKitchen()
      // Directly navigate to login after successful OTP verification
      navigate("/kitchen/login")
    } catch (err) {
      setSignupOtpError(err.message || "Invalid or expired OTP")
    } finally {
      setOtpVerifying(false)
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
              <p className="font-nunito text-gray text-sm">Step {step} of 4</p>
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
                    <div>
                      <label className="font-poppins text-sm font-medium text-dark-light block mb-2">
                        Register with <span className="text-accent">*</span>
                      </label>
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => switchIdentifierType("phone")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-poppins text-sm font-medium transition-colors",
                            identifierType === "phone"
                              ? "bg-primary text-white border-primary"
                              : "bg-white border-gray-light text-gray hover:border-primary/40"
                          )}
                        >
                          <Phone size={15} /> Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => switchIdentifierType("email")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-poppins text-sm font-medium transition-colors",
                            identifierType === "email"
                              ? "bg-primary text-white border-primary"
                              : "bg-white border-gray-light text-gray hover:border-primary/40"
                          )}
                        >
                          <Mail size={15} /> Email
                        </button>
                      </div>
                      {identifierType === "phone" ? (
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
                      ) : (
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
                      )}
                    </div>
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
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-poppins text-sm font-medium text-dark-light">
                          Full Address<span className="text-accent ml-0.5">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoDetectLocation}
                          disabled={detectingLocation}
                          className="flex items-center gap-1.5 text-xs font-poppins font-semibold text-primary hover:underline disabled:opacity-60 disabled:no-underline"
                        >
                          {detectingLocation ? (
                            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <LocateFixed size={14} />
                          )}
                          {detectingLocation ? "Detecting..." : "Use current location"}
                        </button>
                      </div>
                      <div className="relative">
                        <MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray pointer-events-none" />
                        <input
                          className={cn(inputClass, "pl-11")}
                          value={form.address}
                          onChange={update("address")}
                          placeholder="House no., street, area, landmark"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-5">
                      <div className="sm:col-span-2">
                        <Field label="State & City" required>
                          <StateCitySelect
                            state={form.state}
                            city={form.city}
                            onStateChange={(value) => setForm((f) => ({ ...f, state: value, city: "" }))}
                            onCityChange={(value) => setForm((f) => ({ ...f, city: value }))}
                            required
                          />
                        </Field>
                      </div>
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
                        <SummaryRow label="Contact" value={identifierType === "email" ? form.email : form.phone} />
                        <SummaryRow label="Location" value={`${form.address}, ${form.city}, ${form.state} - ${form.pincode}`} />
                        <SummaryRow label="Hours" value={form.openingTime} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <SectionTitle
                      title="Partner Agreement & Terms"
                      subtitle="Please review the agreement before submitting your application"
                    />
                    {
                      agreementLoading && (
                        <div className="flex items-center justify-center py-16 text-gray font-nunito text-sm">
                          Loading agreement...
                        </div>
                      )
                    }
                    {!agreementLoading && agreement?.url && (
                      <>
                        <div className="space-y-6">
                          {/* Step 1: Read Agreement */}
                          <div className="border border-gray-light bg-white rounded-2xl p-5 space-y-3">
                            <h3 className="font-poppins font-semibold text-sm text-dark flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
                              Review Partner Agreement PDF
                            </h3>
                            <p className="font-nunito text-xs text-gray">
                              Please view the terms of partnering with us. You must open the document to unlock the confirmation.
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(agreement.url, "_blank");
                                  setAgreementViewed(true);
                                  setError("");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary font-poppins text-xs font-semibold hover:bg-primary/5 transition-colors cursor-pointer"
                              >
                                <FileText size={14} /> Open Partner Agreement PDF
                              </button>
                              {agreementViewed ? (
                                <span className="text-xs text-primary font-poppins font-semibold bg-primary/10 px-2.5 py-1 rounded-full">
                                  ✓ Viewed
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 font-poppins font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Step 2: Training Video */}
                          {agreement.videoUrl ? (
                            <div className="border border-gray-light bg-white rounded-2xl p-5 space-y-4">
                              <h3 className="font-poppins font-semibold text-sm text-dark flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
                                Watch Mandatory Training Video
                              </h3>
                              <p className="font-nunito text-xs text-gray">
                                Learn about our hygiene standards, delivery process, and dashboard management tools.
                              </p>

                              <div className="rounded-xl overflow-hidden bg-black max-w-[480px]">
                                <video
                                  src={agreement.videoUrl}
                                  controls
                                  onPlay={() => {
                                    setVideoWatched(true);
                                    setError("");
                                  }}
                                  className="w-full h-auto max-h-[260px]"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.open(agreement.videoUrl, "_blank");
                                    setVideoWatched(true);
                                    setError("");
                                  }}
                                  className="inline-flex items-center gap-2 text-xs text-gray font-nunito hover:underline"
                                >
                                  Open video in new tab
                                </button>
                                {videoWatched ? (
                                  <span className="text-xs text-primary font-poppins font-semibold bg-primary/10 px-2.5 py-1 rounded-full">
                                    ✓ Watched
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600 font-poppins font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {/* Step 3: Acceptance Checkbox */}
                          <div className="bg-cream rounded-2xl p-4 border border-gray-light/50 space-y-2">
                            <label className={`flex items-start gap-3 ${(!agreementViewed || (agreement.videoUrl && !videoWatched)) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                              <input
                                type="checkbox"
                                checked={agreementAccepted}
                                disabled={!agreementViewed || (agreement.videoUrl ? !videoWatched : false)}
                                onChange={(e) => {
                                  setAgreementAccepted(e.target.checked)
                                  setError("")
                                }}
                                className="mt-1 w-4 h-4 accent-primary"
                              />
                              <span className="font-nunito text-sm text-dark">
                                I confirm that I have read the Partner Agreement and watched the Training Video, and I agree to the onboarding terms.
                              </span>
                            </label>
                            {(!agreementViewed || (agreement.videoUrl && !videoWatched)) && (
                              <p className="text-[11px] font-nunito text-amber-800 ml-7">
                                * Complete Steps 1 & 2 above to unlock this confirmation.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {!agreementLoading && !agreement?.url && (
                      <div className="rounded-2xl border border-gray-light bg-cream p-6 text-center text-gray font-nunito text-sm">
                        Partner Agreement is not available yet. Please try again shortly.
                      </div>
                    )}
                  </motion.div>
                )}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <SectionTitle
                      title="KYC Verification Details"
                      subtitle="Upload your government issued identity documents to activate your kitchen"
                    />

                    <Field label="Aadhaar Card Number" required icon={FileText}>
                      <input
                        className={inputClass}
                        value={form.aadhaarNumber}
                        onChange={update("aadhaarNumber")}
                        placeholder="12-digit Aadhaar number"
                        maxLength={12}
                        required
                      />
                    </Field>

                    <Field label="Aadhaar Card File (Front Side)" required icon={ShieldCheck}>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            setAadhaarCardFile(file || null)
                            setError("")
                          }}
                        />
                        {aadhaarCardFile ? (
                          <>
                            <FileText size={28} className="text-primary" />
                            <span className="font-nunito text-sm text-dark text-center break-all px-2">
                              {aadhaarCardFile.name}
                            </span>
                            <span className="font-nunito text-xs text-gray">Tap to change file</span>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-gray" />
                            <span className="font-nunito text-sm text-gray text-center">
                              Upload Aadhaar Front (JPG, PNG, or PDF)
                            </span>
                          </>
                        )}
                      </label>
                    </Field>

                    <Field label="Aadhaar Card File (Back Side)" required icon={ShieldCheck}>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            setAadhaarCardBackFile(file || null)
                            setError("")
                          }}
                        />
                        {aadhaarCardBackFile ? (
                          <>
                            <FileText size={28} className="text-primary" />
                            <span className="font-nunito text-sm text-dark text-center break-all px-2">
                              {aadhaarCardBackFile.name}
                            </span>
                            <span className="font-nunito text-xs text-gray">Tap to change file</span>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-gray" />
                            <span className="font-nunito text-sm text-gray text-center">
                              Upload Aadhaar Back (JPG, PNG, or PDF)
                            </span>
                          </>
                        )}
                      </label>
                    </Field>

                    <Field label="PAN Card Number" required icon={FileText}>
                      <input
                        className={inputClass}
                        value={form.panNumber}
                        onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                        placeholder="10-character alphanumeric PAN number"
                        maxLength={10}
                        required
                      />
                    </Field>

                    <Field label="PAN Card File" required icon={ShieldCheck}>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            setPanCardFile(file || null)
                            setError("")
                          }}
                        />
                        {panCardFile ? (
                          <>
                            <FileText size={28} className="text-primary" />
                            <span className="font-nunito text-sm text-dark text-center break-all px-2">
                              {panCardFile.name}
                            </span>
                            <span className="font-nunito text-xs text-gray">Tap to change file</span>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-gray" />
                            <span className="font-nunito text-sm text-gray text-center">
                              Upload PAN Card (JPG, PNG, or PDF)
                            </span>
                          </>
                        )}
                      </label>
                    </Field>

                    <div className="bg-cream rounded-2xl p-5 border border-gray-light/50">
                      <p className="font-poppins text-xs font-semibold text-gray uppercase tracking-wide mb-3">
                        Review KYC Information
                      </p>
                      <div className="space-y-2 text-sm font-nunito">
                        <SummaryRow label="Aadhaar Number" value={form.aadhaarNumber} />
                        <SummaryRow label="Aadhaar Front" value={aadhaarCardFile?.name || "Not uploaded"} />
                        <SummaryRow label="Aadhaar Back" value={aadhaarCardBackFile?.name || "Not uploaded"} />
                        <SummaryRow label="PAN Number" value={form.panNumber} />
                        <SummaryRow label="PAN Document" value={panCardFile?.name || "Not uploaded"} />
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
              <div className="flex items-center gap-3 mt-8">
                {step > 1 && (
                  <Button type="button" variant="outline" size="md" onClick={prevStep} className="h-12 px-4 sm:px-6 rounded-full whitespace-nowrap text-sm shrink-0">
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                )}
                {step < 5 ? (
                  <Button type="button" size="md" onClick={nextStep} className="flex-1 h-12 rounded-full whitespace-nowrap text-sm sm:text-base">
                    Continue
                    <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button type="submit" size="md" className="flex-1 h-12 rounded-full whitespace-nowrap text-xs sm:text-sm md:text-base px-2 sm:px-6" disabled={loading}>
                    {loading ? "Submitting..." : "Submit for Approval"}
                    <ArrowRight size={16} className="shrink-0" />
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

      {/* Signup OTP Verification Modal */}
      {signupOtpVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center">
            <h3 className="font-poppins font-bold text-lg text-dark mb-2 text-center">
              Verify Registration
            </h3>
            <p className="font-nunito text-xs text-gray text-center mb-6 leading-relaxed">
              Enter the 4-digit code sent to verify your contact information.
            </p>

            {signupOtpError && (
              <div className="mb-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
                <p className="font-nunito text-xs text-red-700 text-center">{signupOtpError}</p>
              </div>
            )}

            {signupDemoOtp && (
              <div className="mb-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                <p className="font-nunito text-xs text-amber-900 text-center">
                  Demo OTP: <span className="font-poppins font-bold tracking-widest">{signupDemoOtp}</span>
                </p>
              </div>
            )}

            {/* OTP Digits */}
            <div className="flex gap-3 justify-center py-2">
              {signupOtp.map((digit, i) => (
                <input
                  key={i}
                  ref={signupOtpRefs[i]}
                  type="text"
                  maxLength="1"
                  pattern="\d*"
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value
                    if (!/^\d?$/.test(val)) return
                    const next = [...signupOtp]
                    next[i] = val
                    setSignupOtp(next)
                    if (val && i < 3) {
                      signupOtpRefs[i + 1].current?.focus()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !signupOtp[i] && i > 0) {
                      signupOtpRefs[i - 1].current?.focus()
                    }
                  }}
                  className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-poppins font-bold text-dark focus:outline-none focus:border-primary"
                />
              ))}
            </div>

            <div className="flex gap-3 mt-6 w-full">
              <button
                type="button"
                onClick={() => setSignupOtpVisible(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-poppins font-bold text-sm text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifySignupOtp}
                disabled={otpVerifying || signupOtp.some(d => !d)}
                className="flex-1 py-3 bg-primary rounded-xl font-poppins font-bold text-sm text-white hover:bg-primary-dark disabled:opacity-60 transition-colors cursor-pointer"
              >
                {otpVerifying ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
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
