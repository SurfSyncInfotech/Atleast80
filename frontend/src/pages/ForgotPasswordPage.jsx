import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Phone, Lock, ArrowRight, RotateCw, CheckCircle } from "lucide-react"
import Button from "../components/ui/Button"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../context/AuthContext"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { sendForgotPasswordOtp, resetPassword } = useAuth()
  const [step, setStep] = useState("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [phoneHint, setPhoneHint] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const [resendCount, setResendCount] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const otpValue = otp.join("")

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

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!phone || phone.trim().length < 10) {
      setError("Please enter your 10-digit phone number")
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await sendForgotPasswordOtp(phone.trim())
      setPhoneHint(data.phoneHint || `******${phone.trim().slice(-4)}`)
      setStep("otp")
      setResendTimer(30)
      setResendCount(0)
    } catch (err) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendCount >= 3 || resendLoading) return
    setError("")
    setSuccess("")
    setResendLoading(true)
    try {
      const data = await sendForgotPasswordOtp(phone.trim())
      setPhoneHint(data.phoneHint || `******${phone.trim().slice(-4)}`)
      setResendCount((prev) => prev + 1)
      setResendTimer(30)
      setToastMessage("New OTP sent successfully to your mobile number!")
      setTimeout(() => setToastMessage(""), 3500)
    } catch (err) {
      setError(err.message || "Failed to resend OTP")
    } finally {
      setResendLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (otp.some((d) => !d) || password.length < 6) {
      setError("Please complete OTP and enter a password (min 6 chars)")
      return
    }
    setError("")
    setLoading(true)
    try {
      await resetPassword({ phoneOrEmail: phone.trim(), otp: otpValue, password })
      setSuccess("Password updated! Redirecting to login...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white/95 border border-gray-100 shadow-2xl rounded-[2rem] p-8 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-[0.25em] px-3 py-1">
              Password help
            </p>
            <h1 className="font-poppins font-bold text-3xl text-dark mt-5">Reset password</h1>
            <p className="font-nunito text-gray text-sm mt-3 leading-6">
              {step === "phone"
                ? "Enter your phone number and we’ll send an OTP to verify your identity."
                : `OTP sent to ${phoneHint || "your phone"}. Enter the code and set a new password.`}
            </p>
          </div>

          <button
            onClick={() => (step === "otp" ? setStep("phone") : navigate("/login"))}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-light flex items-center justify-center text-dark shadow-sm hover:shadow-md transition-shadow duration-200"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito animate-shake">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 rounded-3xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-nunito">
            {success}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.form
              key="phone"
              onSubmit={handleSendOtp}
              className="mt-8 space-y-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div>
                <label className="font-poppins font-medium text-sm text-dark block mb-2">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-gray-200 font-nunito text-sm text-dark focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                    required
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
                <ArrowRight size={18} />
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="reset"
              onSubmit={handleReset}
              className="mt-8 space-y-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="grid grid-cols-4 gap-3 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`fp-otp-${i}`}
                    type="tel"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-full h-14 bg-white rounded-3xl border border-gray-200 text-center text-2xl font-poppins font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                  />
                ))}
              </div>

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

              <div className="flex items-center justify-between text-xs font-nunito px-1">
                <span className="text-gray">Didn't receive code?</span>
                {resendCount >= 3 ? (
                  <span className="text-red-500 font-semibold text-[11px]">Limit reached (3/3)</span>
                ) : resendTimer > 0 ? (
                  <span className="text-gray font-semibold">Resend OTP in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw size={12} className={resendLoading ? "animate-spin" : ""} />
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>

              <div>
                <label className="font-poppins font-medium text-sm text-dark block mb-2">New password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray z-10" />
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || otp.some((d) => !d) || password.length < 6}
              >
                {loading ? "Updating..." : "Reset password"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="font-nunito text-sm text-gray mt-7 text-center">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
