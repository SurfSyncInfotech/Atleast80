import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Mail, Lock, User, Phone } from "lucide-react"
import Button from "../components/ui/Button"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../context/AuthContext"

const INDIAN_MOBILE = /^[6-9]\d{9}$/

export default function SignupPage() {
  const navigate = useNavigate()
  const { signupCustomer, verifySignupOtp, resendSignupOtp, loginCustomer } = useAuth()
  const [step, setStep] = useState("signup") // "signup" or "otp"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // OTP state variables
  const [userId, setUserId] = useState(null)
  const [otp, setOtp] = useState(["", "", "", ""])
  const [phoneHint, setPhoneHint] = useState("")

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const phone = form.phone.replace(/\D/g, "").slice(0, 10)
      if (!INDIAN_MOBILE.test(phone)) {
        throw new Error("Enter a valid 10-digit Indian mobile number")
      }
      const res = await signupCustomer({
        ...form,
        phone,
        email: form.email.trim().toLowerCase(),
      })
      if (res.requiresOtp) {
        setUserId(res.userId)
        setPhoneHint(`******${phone.slice(-4)}`)
        setStep("otp")
      } else {
        // Fallback login directly
        await loginCustomer(form.email, form.password)
        navigate("/")
      }
    } catch (err) {
      setError(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpValue = otp.join("")
    if (otpValue.length !== 4) {
      setError("Please enter the 4-digit OTP")
      return
    }
    setError("")
    setLoading(true)
    try {
      await verifySignupOtp(userId, otpValue)
      navigate("/login", {
        replace: true,
        state: {
          message: "Account created and verified! Please sign in to continue.",
          email: form.email.trim().toLowerCase(),
        },
      })
    } catch (err) {
      setError(err.message || "Failed to verify OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError("")
    try {
      await resendSignupOtp(userId)
      setOtp(["", "", "", ""])
      document.getElementById("fp-otp-0")?.focus()
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 3) document.getElementById(`fp-otp-${index + 1}`)?.focus()
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] items-center justify-center px-12">
        <div className="text-center max-w-md">
          <img src="/logo.png" alt="Atleast80" className="w-24 h-24 rounded-3xl shadow-2xl mx-auto" />
          <h1 className="font-poppins font-bold text-white text-3xl mt-8">Join Atleast80</h1>
          <p className="font-nunito text-white/60 mt-4">
            Create your account to order trusted homemade food and essentials.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 md:px-10 lg:px-14 pt-8 md:pt-12">
          <button
            onClick={() => (step === "otp" ? setStep("signup") : navigate(-1))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-light flex items-center justify-center cursor-pointer hover:border-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-poppins font-bold text-2xl md:text-3xl text-dark mt-6">
            {step === "signup" ? "Create account" : "Verify your phone"}
          </h2>
          <p className="font-nunito text-gray mt-2">
            {step === "signup" ? "Full name, email, phone & password" : `One-time verification sent to ${phoneHint}`}
          </p>
        </div>

        <div className="flex-1 px-6 md:px-10 lg:px-14 py-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "signup" ? (
              <motion.form key="signup" onSubmit={handleSubmit} className="space-y-4 max-w-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div>
                  <label className="font-poppins font-medium text-sm text-dark block mb-2">Full name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Your full name"
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-poppins font-medium text-sm text-dark block mb-2">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-poppins font-medium text-sm text-dark block mb-2">Phone number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      placeholder="10-digit Indian mobile"
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <p className="font-nunito text-xs text-gray mt-2">India only — verified via OTP on your signup</p>
                </div>

                <div>
                  <label className="font-poppins font-medium text-sm text-dark block mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray z-10" />
                    <PasswordInput
                      value={form.password}
                      onChange={set("password")}
                      placeholder="At least 6 characters"
                      className="pl-12"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading || !INDIAN_MOBILE.test(form.phone)}>
                  {loading ? "Creating account..." : "Sign up"}
                  <ArrowRight size={18} />
                </Button>
              </motion.form>
            ) : (
              <motion.form key="otp" onSubmit={handleVerifyOtp} className="space-y-6 max-w-lg animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`fp-otp-${i}`}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-14 h-14 bg-white rounded-2xl border-2 border-gray-light text-center text-2xl font-poppins font-bold focus:outline-none focus:border-primary"
                    />
                  ))}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading || otp.some((d) => !d)}>
                  {loading ? "Verifying..." : "Verify & sign in"}
                  <ArrowRight size={18} />
                </Button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="w-full font-nunito text-sm text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="font-nunito text-sm text-gray mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
