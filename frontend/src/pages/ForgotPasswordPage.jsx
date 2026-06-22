import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Mail, Lock, ArrowRight } from "lucide-react"
import Button from "../components/ui/Button"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../context/AuthContext"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { sendForgotPasswordOtp, resetPassword } = useAuth()
  const [step, setStep] = useState("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [phoneHint, setPhoneHint] = useState("")
  const [demoOtp, setDemoOtp] = useState("1234")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const otpValue = otp.join("")

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await sendForgotPasswordOtp(email)
      setPhoneHint(data.phoneHint || "")
      if (data.demoOtp) setDemoOtp(data.demoOtp)
      setStep("otp")
    } catch (err) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await resetPassword({ email, otp: otpValue, password })
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
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 md:px-10 pt-8 max-w-lg mx-auto w-full">
        <button
          onClick={() => (step === "otp" ? setStep("email") : navigate("/login"))}
          className="w-10 h-10 rounded-xl bg-white border border-gray-light flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-poppins font-bold text-2xl text-dark mt-6">Reset password</h1>
        <p className="font-nunito text-gray text-sm mt-2">
          {step === "email"
            ? "Enter your email — we'll send an OTP to your registered phone"
            : `OTP sent to ${phoneHint || "your phone"}`}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-nunito">
            {success}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.form
              key="email"
              onSubmit={handleSendOtp}
              className="mt-8 space-y-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div>
                <label className="font-poppins font-medium text-sm text-dark block mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary"
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-nunito text-xs text-amber-900">
                  Demo OTP: <span className="font-poppins font-bold tracking-widest">{demoOtp}</span>
                </p>
              </div>

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

        <p className="font-nunito text-sm text-gray mt-6 text-center">
          <Link to="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
