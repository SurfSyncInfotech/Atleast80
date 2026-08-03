import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ChefHat, ArrowRight, ArrowLeft, User, Lock, UtensilsCrossed, TrendingUp, CheckCircle, RotateCw } from "lucide-react"
import Button from "../../components/ui/Button"
import PasswordInput from "../../components/ui/PasswordInput"
import { useAuth } from "../../context/AuthContext"
import { useRoleRedirect } from "../../hooks/useRoleRedirect"

const perks = [
  { icon: UtensilsCrossed, text: "Manage your menu" },
  { icon: TrendingUp, text: "Track your growth" },
]

export default function KitchenLoginPage() {
  const navigate = useNavigate()
  const { loginKitchen, verifyKitchenLoginOtp } = useAuth()
  useRoleRedirect("kitchen")

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [step, setStep] = useState("credentials")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [hint, setHint] = useState("")
  const [channel, setChannel] = useState("phone")
  const [demoOtp, setDemoOtp] = useState("")

  // Resend OTP production logic
  const [resendTimer, setResendTimer] = useState(30)
  const [resendCount, setResendCount] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    let timer = null
    if (step === "otp" && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [step, resendTimer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await loginKitchen(identifier, password)
      if (data?.requiresOtp) {
        setChannel(data.channel || "phone")
        setHint(data.channel === "email" ? data.emailHint : data.phoneHint)
        if (data.demoOtp) setDemoOtp(data.demoOtp)
        setOtp(["", "", "", ""])
        setStep("otp")
        setResendTimer(30)
        setResendCount(0)
      } else {
        navigate("/kitchen/dashboard")
      }
    } catch (err) {
      setError(err.message)
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
      await verifyKitchenLoginOtp(identifier, password, otpValue)
      navigate("/kitchen/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendCount >= 3 || resendLoading) return
    setError("")
    setResendLoading(true)
    try {
      const data = await loginKitchen(identifier, password)
      if (data.demoOtp) setDemoOtp(data.demoOtp)
      setOtp(["", "", "", ""])
      setResendCount((prev) => prev + 1)
      setResendTimer(30)
      setToastMessage("New OTP sent successfully to your mobile number!")
      setTimeout(() => setToastMessage(""), 3500)
      otpRefs[0]?.current?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setResendLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 3) otpRefs[index + 1].current?.focus()
  }

  const handleOtpKeyDown = (index, key) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <ChefHat size={64} className="text-secondary mb-6" />
          <h1 className="font-poppins font-bold text-white text-3xl text-center">
            Kitchen Partner Login
          </h1>
          <p className="font-nunito text-white/60 text-center mt-4 max-w-sm">
            Manage your kitchen, track approval status, and grow your homemade food business.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Mobile hero */}
        <div className="md:hidden relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] px-5 pt-6 pb-10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10">
            <button
              onClick={() => (step === "otp" ? setStep("credentials") : navigate("/home"))}
              className="flex items-center gap-2 text-white/70 cursor-pointer hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={18} />
              <span className="font-nunito text-sm">Back</span>
            </button>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="w-14 h-14 bg-secondary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/10">
                <ChefHat size={28} className="text-secondary" />
              </div>
              <h1 className="font-poppins font-bold text-white text-2xl leading-tight">Kitchen Partner</h1>
              <p className="font-nunito text-white/60 text-sm mt-2 max-w-[260px] leading-relaxed">
                {step === "otp"
                  ? `One-time verification sent to ${hint || (channel === "email" ? "your email" : "your phone")}`
                  : "Sign in to manage orders, menu, and your kitchen profile."}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {perks.map((item) => {
                  const Icon = item.icon
                  return (
                    <span
                      key={item.text}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-nunito"
                    >
                      <Icon size={12} className="text-secondary" />
                      {item.text}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Desktop back */}
        <div className="hidden md:block px-6 py-4">
          <button
            onClick={() => (step === "otp" ? setStep("credentials") : navigate("/home"))}
            className="flex items-center gap-2 text-gray cursor-pointer hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-nunito text-sm">{step === "otp" ? "Back" : "Back to home"}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-5 md:px-12 lg:px-16 py-6 md:py-8 max-w-lg mx-auto w-full bg-gradient-to-b from-[#eef6f0] via-[#f5faf7] to-cream">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="md:mt-0 -mt-5 bg-[#f8fcf9] rounded-2xl shadow-[0_8px_30px_rgba(11,107,58,0.08)] border border-primary/10 p-6 md:p-8"
          >
            {step === "credentials" ? (
              <>
                <h2 className="font-poppins font-bold text-xl md:text-2xl text-dark">Welcome back</h2>
                <p className="font-nunito text-gray text-sm mt-1.5">Sign in to your kitchen account</p>

                <form onSubmit={handleSubmit} className="mt-6 md:mt-8 space-y-4 md:space-y-5">
                  <div>
                    <label className="font-poppins text-sm font-medium text-dark-light block mb-2">
                      Phone or Email
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                      <input
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Phone number or email"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-primary/15 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-nunito text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-poppins text-sm font-medium text-dark-light">Password</label>
                      <Link to="/kitchen/forgot-password" className="text-sm text-primary font-medium hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <PasswordInput
                      icon={Lock}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full py-3.5 bg-white rounded-xl border border-primary/15 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-nunito text-base"
                    />
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-error text-sm font-nunito bg-error/10 px-4 py-3 rounded-xl">
                      {error}
                    </motion.p>
                  )}

                  <Button type="submit" size="lg" className="w-full !rounded-xl" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                    <ArrowRight size={18} />
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-poppins font-bold text-xl md:text-2xl text-dark">Verify it's you</h2>
                <p className="font-nunito text-gray text-sm mt-1.5">
                  Enter the 4-digit code sent to {hint || (channel === "email" ? "your email" : "your phone")}
                </p>

                <form onSubmit={handleVerifyOtp} className="mt-6 md:mt-8 space-y-4 md:space-y-5">
                  {demoOtp && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="font-nunito text-sm text-amber-900">
                        Demo OTP: <span className="font-poppins font-bold tracking-widest">{demoOtp}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center gap-3 py-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={otpRefs[i]}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e.key)}
                        inputMode="numeric"
                        maxLength={1}
                        className="w-12 h-12 text-center text-xl font-bold rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    ))}
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-error text-sm font-nunito bg-error/10 px-4 py-3 rounded-xl">
                      {error}
                    </motion.p>
                  )}

                  <Button type="submit" size="lg" className="w-full !rounded-xl" disabled={loading || otp.some((d) => !d)}>
                    {loading ? "Verifying..." : "Verify & sign in"}
                    <ArrowRight size={18} />
                  </Button>

                  {toastMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle size={14} className="text-green-600 shrink-0" />
                      <span>{toastMessage}</span>
                    </motion.div>
                  )}

                  <div className="flex flex-col items-center gap-1">
                    {resendCount >= 3 ? (
                      <span className="text-xs text-red-500 font-medium text-center">
                        Maximum resend limit reached (3/3). Please try again after a few minutes.
                      </span>
                    ) : resendTimer > 0 ? (
                      <span className="text-xs text-gray font-semibold">
                        Resend OTP in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className="font-nunito text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw size={14} className={resendLoading ? "animate-spin" : ""} />
                        {resendLoading ? "Sending OTP..." : "Resend OTP"}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </motion.div>

          <p className="font-nunito text-gray text-sm text-center mt-6 md:mt-8 px-2">
            Don&apos;t have a kitchen account?{" "}
            <Link to="/kitchen/signup" className="text-primary font-semibold hover:underline">
              Register your kitchen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
