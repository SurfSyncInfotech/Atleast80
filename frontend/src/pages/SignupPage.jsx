import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft, Mail, Lock, User, Phone } from "lucide-react"
import Button from "../components/ui/Button"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../context/AuthContext"

export default function SignupPage() {
  const navigate = useNavigate()
  const { signupCustomer } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signupCustomer({
        ...form,
        phone: form.phone.replace(/\D/g, "").slice(0, 10),
      })
      navigate("/login", {
        replace: true,
        state: {
          message: "Account created! Please sign in to continue.",
          email: form.email.trim().toLowerCase(),
        },
      })
    } catch (err) {
      setError(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] items-center justify-center px-12">
        <div className="text-center max-w-md">
          <img src="/logo.jpeg" alt="Atleast80" className="w-24 h-24 rounded-3xl shadow-2xl mx-auto" />
          <h1 className="font-poppins font-bold text-white text-3xl mt-8">Join Atleast80</h1>
          <p className="font-nunito text-white/60 mt-4">
            Create your account to order trusted homemade food and essentials.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 md:px-10 lg:px-14 pt-8 md:pt-12">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-light flex items-center justify-center cursor-pointer hover:border-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-poppins font-bold text-2xl md:text-3xl text-dark mt-6">Create account</h2>
          <p className="font-nunito text-gray mt-2">Full name, email, phone & password</p>
        </div>

        <div className="flex-1 px-6 md:px-10 lg:px-14 py-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-nunito">
              {error}
            </div>
          )}

          <motion.form onSubmit={handleSubmit} className="space-y-4 max-w-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                  placeholder="10-digit mobile number"
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-light font-nunito focus:outline-none focus:border-primary"
                  required
                />
              </div>
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

            <Button type="submit" size="lg" className="w-full" disabled={loading || form.phone.length !== 10}>
              {loading ? "Creating account..." : "Sign up"}
              <ArrowRight size={18} />
            </Button>
          </motion.form>

          <p className="font-nunito text-sm text-gray mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
