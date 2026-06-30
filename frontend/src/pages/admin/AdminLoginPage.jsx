import { useState } from "react"

import { useNavigate } from "react-router-dom"

import { motion } from "framer-motion"

import { ShieldCheck, ArrowRight, ArrowLeft, Mail, Lock, ChefHat, Users } from "lucide-react"

import Button from "../../components/ui/Button"

import PasswordInput from "../../components/ui/PasswordInput"

import { useAuth } from "../../context/AuthContext"
import { useRoleRedirect } from "../../hooks/useRoleRedirect"



const features = [

  { icon: ChefHat, text: "Review kitchens" },

  { icon: Users, text: "Manage partners" },

]



export default function AdminLoginPage() {

  const navigate = useNavigate()

  const { loginAdmin } = useAuth()
  useRoleRedirect("admin")

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [error, setError] = useState("")

  const [loading, setLoading] = useState(false)



  const handleSubmit = async (e) => {

    e.preventDefault()

    setError("")

    setLoading(true)

    try {

      await loginAdmin(email, password)

      navigate("/admin")

    } catch (err) {

      setError(err.message)

    } finally {

      setLoading(false)

    }

  }



  return (

    <div className="min-h-screen bg-cream flex flex-col md:flex-row">

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a1f13] via-primary-dark to-primary relative overflow-hidden">

        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">

          <ShieldCheck size={64} className="text-secondary mb-6" />

          <h1 className="font-poppins font-bold text-white text-3xl text-center">Admin Portal</h1>

          <p className="font-nunito text-white/60 text-center mt-4 max-w-sm">

            Review kitchen applications, approve partners, and manage the Atleast80 marketplace.

          </p>

        </div>

      </div>



      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">

        {/* Mobile hero */}

        <div className="md:hidden relative overflow-hidden bg-gradient-to-br from-[#0a1f13] via-primary-dark to-primary px-5 pt-6 pb-10">

          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/30 rounded-full blur-3xl" />



          <div className="relative z-10">

            <button

              onClick={() => navigate("/home")}

              className="flex items-center gap-2 text-white/70 cursor-pointer hover:text-white transition-colors mb-6"

            >

              <ArrowLeft size={18} />

              <span className="font-nunito text-sm">Back</span>

            </button>



            <motion.div

              initial={{ opacity: 0, y: 16 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.5 }}

            >

              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/15">

                <ShieldCheck size={28} className="text-secondary" />

              </div>

              <h1 className="font-poppins font-bold text-white text-2xl leading-tight">

                Admin Portal

              </h1>

              <p className="font-nunito text-white/60 text-sm mt-2 max-w-[280px] leading-relaxed">

                Secure access for authorized Atleast80 team members only.

              </p>



              <div className="flex flex-wrap gap-2 mt-5">

                {features.map((item) => {

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

          <button onClick={() => navigate("/home")} className="flex items-center gap-2 text-gray cursor-pointer hover:text-primary transition-colors">

            <ArrowLeft size={18} />

            <span className="font-nunito text-sm">Back to home</span>

          </button>

        </div>



        <div className="flex-1 flex flex-col justify-center px-5 md:px-12 lg:px-16 py-6 md:py-8 max-w-lg mx-auto w-full bg-gradient-to-b from-[#edf2ef] via-[#f4f7f5] to-cream">

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ delay: 0.15, duration: 0.45 }}

            className="md:mt-0 -mt-5 bg-[#f6f9f7] rounded-2xl shadow-[0_8px_30px_rgba(10,31,19,0.08)] border border-primary/10 p-6 md:p-8"

          >

            <div className="flex items-center gap-2 mb-1 md:hidden">

              <Lock size={14} className="text-primary" />

              <span className="font-nunito text-[11px] text-primary font-semibold uppercase tracking-wider">Secure login</span>

            </div>



            <h2 className="font-poppins font-bold text-xl md:text-2xl text-dark">Sign in as Admin</h2>

            <p className="font-nunito text-gray text-sm mt-1.5">Authorized personnel only</p>



            <form onSubmit={handleSubmit} className="mt-6 md:mt-8 space-y-4 md:space-y-5">

              <div>

                <label className="font-poppins text-sm font-medium text-dark-light block mb-2">Email</label>

                <div className="relative">

                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />

                  <input

                    type="email"

                    value={email}

                    onChange={(e) => setEmail(e.target.value)}

                    placeholder="admin@atleast80.com"

                    required

                    className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-primary/15 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-nunito text-base"

                  />

                </div>

              </div>



              <div>

                <label className="font-poppins text-sm font-medium text-dark-light block mb-2">Password</label>

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

          </motion.div>



          <p className="font-nunito text-[#999] text-xs text-center mt-6 md:mt-8 px-4 leading-relaxed">

            This area is restricted. Unauthorized access attempts are logged.

          </p>

        </div>

      </div>

    </div>

  )

}


