import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight, ShieldCheck, Home, Heart, Users, Leaf,
  ShoppingCart, ChefHat, MapPin, Mail, Phone, Sparkles, CheckCircle2,
} from "lucide-react"
import Navbar from "../components/layout/Navbar"
import Footer from "../components/layout/Footer"
import Button from "../components/ui/Button"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: "easeOut" },
  }),
}

const IMG = {
  hero: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=900&fit=crop",
  kitchen: "/indianwomen.png",
  meal: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&h=600&fit=crop",
  grocery: "/grocery.jpeg",
  family: "/about.jpeg",
}

const stats = [
  { icon: ChefHat, label: "Home Kitchens", value: "500+", color: "from-blue-500 to-indigo-600" },
  { icon: Users, label: "Happy Customers", value: "50K+", color: "from-emerald-500 to-teal-600" },
  { icon: Leaf, label: "Cities", value: "25+", color: "from-amber-400 to-orange-500" },
  { icon: ShieldCheck, label: "Daily Hygiene Checks", value: "24h", color: "from-primary to-primary-dark" },
]

const values = [
  { icon: ShieldCheck, title: "Hygiene First", desc: "Daily video checks, transparent standards, and strict kitchen requirements on every order.", accent: "bg-emerald-50 text-emerald-700" },
  { icon: Home, title: "Real Home Kitchens", desc: "Authentic home chefs and families — not commercial restaurants — cooking with care.", accent: "bg-blue-50 text-blue-700" },
  { icon: ShoppingCart, title: "Food & Ration", desc: "Meals, tiffins, and daily grocery essentials from one trusted kitchen.", accent: "bg-amber-50 text-amber-700" },
  { icon: Heart, title: "Community First", desc: "Fair earnings for home kitchens and affordable, healthy food for every household.", accent: "bg-rose-50 text-rose-700" },
]

const pillars = [
  "Verified hygiene checks on every kitchen",
  "Homemade meals & ration in one order",
  "Stories, menus & ratings you can trust",
  "Supporting local home entrepreneurs",
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <>
      <Navbar />

      <div className="bg-cream min-h-screen pb-20 md:pb-0">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0a1f13] text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f13]/35 via-[#0a1f13]/75 to-[#0a1f13] z-10" />
          <img src={IMG.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute top-20 right-[10%] w-72 h-72 bg-secondary/20 rounded-full blur-3xl z-10" />

          <div className="relative z-20 max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 xl:px-24 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-secondary text-xs font-poppins font-semibold uppercase tracking-wider mb-5">
                  <Sparkles size={14} /> About Atleast80
                </div>
                <h1 className="font-poppins font-bold text-3xl sm:text-4xl md:text-5xl leading-[1.15]">
                  Homemade Food &amp; Ration,
                  <span className="text-secondary"> delivered with trust</span>
                </h1>
                <p className="font-nunito text-white/75 text-base md:text-lg mt-5 leading-relaxed max-w-xl">
                  India&apos;s platform for verified home kitchens — fresh meals, healthy tiffins,
                  and daily ration essentials from cooks who care.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Button onClick={() => navigate("/search")} className="!rounded-xl">
                    Explore Kitchens <ArrowRight size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/kitchen/signup")}
                    className="!rounded-xl !border-white/40 !text-white hover:!bg-white hover:!text-primary"
                  >
                    Partner with us
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="hidden lg:grid grid-cols-2 gap-3"
              >
                <img src={IMG.meal} alt="Homemade meal" className="rounded-2xl h-52 w-full object-cover shadow-2xl ring-1 ring-white/20" />
                <img src={IMG.kitchen} alt="Indian woman preparing roti" className="rounded-2xl h-52 w-full object-cover shadow-2xl ring-1 ring-white/20 mt-8" />
                <div className="col-span-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 bg-white/[0.08]">
                  <img
                    src={IMG.grocery}
                    alt="Atleast80 — home food, kitchen food, and ration"
                    className="w-full aspect-[2.35/1] object-contain object-center"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="relative z-30 -mt-8 md:-mt-10 max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className={`rounded-2xl p-5 md:p-6 text-white bg-gradient-to-br shadow-lg ${s.color}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Icon size={20} />
                  </div>
                  <p className="font-poppins font-bold text-2xl md:text-3xl">{s.value}</p>
                  <p className="font-nunito text-sm text-white/85 mt-1">{s.label}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 xl:px-24 pt-16 md:pt-20 pb-12 md:pb-16 space-y-20 md:space-y-28">
          {/* Story + image */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            <div className="relative">
              <img src={IMG.family} alt="Home cooked food" className="rounded-3xl w-full h-[320px] md:h-[420px] object-cover shadow-xl" />
              <div className="absolute -bottom-5 -right-2 md:right-6 bg-white rounded-2xl shadow-xl p-4 md:p-5 border border-gray-100 max-w-[220px]">
                <p className="font-poppins font-bold text-primary text-2xl">2026</p>
                <p className="font-nunito text-gray text-xs mt-1 leading-relaxed">Founded to bring India&apos;s home kitchens online</p>
              </div>
            </div>
            <div>
              <p className="font-poppins text-primary text-sm font-semibold uppercase tracking-widest mb-2">Our story</p>
              <h2 className="font-poppins font-bold text-dark text-2xl md:text-4xl leading-tight">
                From home kitchens to every doorstep
              </h2>
              <p className="font-nunito text-gray text-sm md:text-base mt-5 leading-relaxed">
                We believe the best food doesn&apos;t come from big chains — it comes from home. Millions of
                talented cooks prepare nutritious meals every day, yet most people never discover them.
              </p>
              <p className="font-nunito text-gray text-sm md:text-base mt-4 leading-relaxed">
                Atleast80 gives these kitchens a platform to go live, share stories, list food and ration,
                and build loyal customers who value hygiene, authenticity, and fair prices.
              </p>
              <ul className="mt-6 space-y-2.5">
                {pillars.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 font-nunito text-sm text-dark">
                    <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>

          {/* Values */}
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
              <p className="font-poppins text-primary text-sm font-semibold uppercase tracking-widest mb-2">Our values</p>
              <h2 className="font-poppins font-bold text-dark text-2xl md:text-4xl">What we stand for</h2>
              <p className="font-nunito text-gray text-sm md:text-base mt-3">
                The principles behind every kitchen, meal, and ration order on Atleast80
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
              {values.map((v, i) => {
                const Icon = v.icon
                return (
                  <motion.div
                    key={v.title}
                    variants={fadeUp}
                    custom={i}
                    className="group bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 flex gap-5"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${v.accent}`}>
                      <Icon size={26} />
                    </div>
                    <div>
                      <h3 className="font-poppins font-bold text-dark text-lg">{v.title}</h3>
                      <p className="font-nunito text-gray text-sm mt-2 leading-relaxed">{v.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>

          {/* Mission visual banner */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden min-h-[340px] flex items-center"
          >
            <img src={IMG.kitchen} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/70" />
            <div className="relative z-10 p-8 md:p-14 max-w-2xl text-white">
              <h2 className="font-poppins font-bold text-2xl md:text-4xl leading-tight">Our mission</h2>
              <p className="font-nunito text-white/85 text-sm md:text-base mt-4 leading-relaxed">
                Make homemade food and daily ration accessible to every household in India — while
                empowering home kitchens to build sustainable, dignified livelihoods.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => navigate("/search")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary font-poppins font-semibold text-sm hover:bg-white/90 cursor-pointer transition-colors"
                >
                  Discover Kitchens <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/kitchen/signup")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-poppins font-semibold text-sm hover:bg-white/25 cursor-pointer transition-colors"
                >
                  Register Kitchen
                </button>
              </div>
            </div>
          </motion.section>

          {/* Contact */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-2"
          >
            <div className="p-8 md:p-12">
              <h2 className="font-poppins font-bold text-dark text-2xl md:text-3xl">Get in touch</h2>
              <p className="font-nunito text-gray text-sm md:text-base mt-3 leading-relaxed">
                Questions about ordering, kitchen registration, or partnerships? Our team is here to help.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: MapPin, text: "India" },
                  { icon: Mail, text: "hello@atleast80.com" },
                  { icon: Phone, text: "+91 98765 43210" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-dark">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <span className="font-nunito text-sm md:text-base">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[220px] md:min-h-full">
              <img src={IMG.grocery} alt="Fresh groceries" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent md:bg-gradient-to-l md:from-white md:via-transparent md:to-transparent" />
            </div>
          </motion.section>
        </div>
      </div>

      <Footer />
    </>
  )
}
