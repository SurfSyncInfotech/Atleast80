import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, UtensilsCrossed, ShoppingCart } from "lucide-react"
import Button from "../components/ui/Button"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../context/AuthContext"
import { useRoleRedirect } from "../hooks/useRoleRedirect"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginCustomer, verifyLoginOtp } = useAuth()
  useRoleRedirect("customer")
  const [step, setStep] = useState("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [phoneHint, setPhoneHint] = useState("")
  const [demoOtp, setDemoOtp] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const from = location.state?.from || "/home"
  const successMessage = location.state?.message
  const otpValue = otp.join("")

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state?.email])

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 3) document.getElementById(`login-otp-${index + 1}`)?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await loginCustomer(email.trim().toLowerCase(), password)
      if (data.requiresOtp) {
        setPhoneHint(data.phoneHint || "")
        setDemoOtp(data.demoOtp ?? null)
        setOtp(["", "", "", ""])
        setStep("otp")
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await verifyLoginOtp(email.trim().toLowerCase(), password, otpValue)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || "Invalid OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError("")
    setLoading(true)
    try {
      const data = await loginCustomer(email.trim().toLowerCase(), password)
      if (data.requiresOtp) {
        setDemoOtp(data.demoOtp ?? null)
        setOtp(["", "", "", ""])
      }
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 lg:px-20">
          <motion.img
            src="/logo.png"
            alt="Atleast80"
            className="w-28 h-28 rounded-3xl shadow-2xl ring-4 ring-white/10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
          <h1 className="font-poppins font-bold text-white text-3xl text-center mt-8">
            Welcome back to <span className="text-secondary">Atleast80</span>
          </h1>
          <p className="font-nunito text-white/60 text-center mt-4 max-w-sm">
            Sign in to order homemade food and groceries from verified kitchens.
          </p>
          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: ShieldCheck, text: "Verified home kitchens" },
              { icon: UtensilsCrossed, text: "Fresh meals every day" },
              { icon: ShoppingCart, text: "Food + grocery in one cart" },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <Icon size={18} className="text-secondary" />
                  <span className="font-nunito text-white/80 text-sm">{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="md:hidden bg-gradient-to-br from-secondary/20 via-cream to-primary/5 pt-10 pb-6 px-6 text-center">
          <img src="/logo.png" alt="Atleast80" className="w-20 h-20 rounded-2xl shadow-lg mx-auto" />
          <h1 className="font-poppins font-bold text-xl text-dark mt-4">Welcome back</h1>
        </div>

        <div className="hidden md:block px-10 lg:px-14 pt-12">
          <button
            onClick={() => (step === "otp" ? setStep("credentials") : navigate("/home"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-light flex items-center justify-center cursor-pointer hover:border-primary mb-8"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-poppins font-bold text-3xl text-dark">
            {step === "otp" ? "Verify your phone" : "Sign in"}
          </h2>
          <p className="font-nunito text-gray mt-2">
            {step === "otp"
              ? `One-time verification sent to ${phoneHint || "your phone"}`
              : "Use your email and password to continue"}
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-14 py-8">
          {successMessage && step === "credentials" && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-nunito">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.form
                key="credentials"
                onSubmit={handleSubmit}
                className="space-y-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div>
                  <label className="font-poppins font-medium text-sm text-dark block mb-2">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-poppins font-medium text-sm text-dark">Password</label>
                    <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray z-10" />
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pl-12"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full md:py-4" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                  <ArrowRight size={18} />
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                onSubmit={handleVerifyOtp}
                className="space-y-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="font-nunito text-sm text-gray md:hidden">
                  One-time verification sent to {phoneHint || "your phone"}
                </p>

                {demoOtp && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="font-nunito text-xs text-amber-900">
                      Demo OTP: <span className="font-poppins font-bold tracking-widest">{demoOtp}</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`login-otp-${i}`}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-14 h-14 bg-white rounded-2xl border-2 border-gray-light text-center text-2xl font-poppins font-bold focus:outline-none focus:border-primary"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:py-4"
                  disabled={loading || otp.some((d) => !d)}
                >
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

          <p className="text-center font-nunito text-sm text-gray mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
