import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Search, ChevronRight, ShieldCheck, Leaf, Truck, ArrowRight,
  UtensilsCrossed, Salad, ShoppingCart, Package, Soup,
  Milk, Cookie, Cherry, Candy, Coffee, Home, Heart,
  Store, Users, TrendingUp, Handshake, Info
} from "lucide-react"
import Navbar from "../components/layout/Navbar"
import Footer from "../components/layout/Footer"
import KitchenCard from "../components/common/KitchenCard"
import FoodCard from "../components/common/FoodCard"
import StoryCircle from "../components/common/StoryCircle"
import Chip from "../components/common/Chip"
import Button from "../components/ui/Button"
import { stories as mockStories, menuItems } from "../data/mockData"
import StoryViewer from "../components/common/StoryViewer"
import { api } from "../lib/api"
import { resolveStoryGroups } from "../lib/media"
import { toKitchenCard } from "../lib/kitchen"

const categories = [
  { id: 1, name: "Meals", icon: UtensilsCrossed },
  { id: 2, name: "Healthy", icon: Salad },
  { id: 3, name: "Grocery", icon: ShoppingCart },
  { id: 4, name: "Tiffin", icon: Package },
  { id: 5, name: "Curry", icon: Soup },
  { id: 6, name: "Dairy", icon: Milk },
  { id: 7, name: "Snacks", icon: Cookie },
  { id: 8, name: "Pickles", icon: Cherry },
  { id: 9, name: "Sweets", icon: Candy },
  { id: 10, name: "Breakfast", icon: Coffee },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
}

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

async function fetchKitchenList(path, retries = 2) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await api(path)
      return (data.kitchens || []).map(toKitchenCard)
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

function KitchenCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100/80 animate-pulse">
      <div className="h-28 sm:h-32 bg-gray-200" />
      <div className="pt-9 px-4 pb-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
          <div className="h-3 bg-gray-100 rounded w-10" />
          <div className="h-3 bg-gray-100 rounded w-14" />
        </div>
      </div>
    </div>
  )
}

const HERO_VIDEO_RATE = 0.5
const HERO_VIDEO_CLASS =
  "absolute left-0 right-0 top-0 w-full h-[118%] object-cover object-top"

function setHeroVideoRate(e) {
  e.currentTarget.playbackRate = HERO_VIDEO_RATE
}

function DesktopHero() {
  const navigate = useNavigate()

  return (
    <section className="hidden md:block relative h-[85vh] min-h-[600px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={setHeroVideoRate}
        className={HERO_VIDEO_CLASS}
        poster="/logo.jpeg"
      >
        <source src="/atleast80.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-[1] bg-black/45" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <img
            src="/logo.jpeg"
            alt="Atleast80"
            className="w-24 h-24 rounded-2xl shadow-2xl mx-auto mb-8 ring-4 ring-white/20"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          className="font-poppins font-extrabold text-white text-5xl lg:text-6xl max-w-4xl leading-[1.1] tracking-tight"
        >
          Homemade Food
          <br />
          <span className="text-secondary">&amp; Ration</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-nunito text-white/75 text-lg lg:text-xl mt-4 max-w-2xl leading-relaxed"
        >
          Fresh meals from hygiene-verified home kitchens.
          Order food and ration together in one cart.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-10 w-full max-w-2xl relative"
        >
          <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray" />
          <input
            type="text"
            placeholder="Search for home-cooked food, groceries, kitchens..."
            onFocus={() => navigate("/search")}
            className="w-full pl-16 pr-6 py-5 bg-white rounded-full text-base font-nunito placeholder:text-gray/70 shadow-2xl focus:outline-none focus:ring-4 focus:ring-secondary/30 cursor-pointer transition-all"
            readOnly
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-8 flex items-center gap-8 text-white/80"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck size={18} className="text-secondary" /> Hygiene Verified Daily
          </span>
          <span className="w-1 h-1 bg-white/30 rounded-full" />
          <span className="flex items-center gap-2 text-sm font-medium">
            <Leaf size={18} className="text-secondary" /> Organic & Healthy
          </span>
          <span className="w-1 h-1 bg-white/30 rounded-full" />
          <span className="flex items-center gap-2 text-sm font-medium">
            <Truck size={18} className="text-secondary" /> Free Delivery Available
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream to-transparent" />
    </section>
  )
}

function MobileHeroBanner() {
  const navigate = useNavigate()

  return (
    <div className="relative mt-4 md:hidden overflow-hidden rounded-2xl h-52 sm:h-56">
      <video
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={setHeroVideoRate}
        className={HERO_VIDEO_CLASS}
        poster="/logo.jpeg"
      >
        <source src="/atleast80.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/45 to-black/30" />
      <div className="relative z-10 h-full flex flex-col justify-end p-5">
        <h2 className="font-poppins font-bold text-white text-2xl leading-tight">
          Homemade Food <span className="text-secondary">&amp; Ration</span>
        </h2>
        <p className="font-nunito text-white/85 text-sm mt-1.5">
          Fresh meals from verified home kitchens near you
        </p>
        <button
          type="button"
          onClick={() => navigate("/search")}
          className="mt-3 self-start px-4 py-2 rounded-full bg-secondary text-[#0a1f13] font-poppins font-semibold text-xs cursor-pointer"
        >
          Explore kitchens
        </button>
      </div>
    </div>
  )
}

function CategoryRow() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="mt-6 md:mt-14"
    >
      <motion.h3
        variants={fadeUp}
        className="hidden md:block font-poppins font-bold text-dark text-2xl lg:text-3xl mb-8"
      >
        What are you looking for?
      </motion.h3>
      {/* Mobile */}
      <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2 md:hidden">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <Chip key={cat.id} icon={<Icon size={16} />}>
              {cat.name}
            </Chip>
          )
        })}
      </div>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-5 lg:grid-cols-10 gap-5">
        {categories.map((cat, i) => {
          const Icon = cat.icon
          return (
            <motion.div
              key={cat.id}
              variants={fadeUp}
              custom={i}
              className="flex flex-col items-center gap-3 cursor-pointer group"
            >
              <div className="w-18 h-18 p-5 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                <Icon size={28} className="text-primary group-hover:text-primary-dark transition-colors" />
              </div>
              <span className="text-sm font-poppins font-medium text-dark-light text-center group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}

function StoriesSection() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerIndex, setViewerIndex] = useState(null)

  useEffect(() => {
    api("/api/stories")
      .then((data) => setGroups(resolveStoryGroups(data.groups)))
      .catch(() => {
        setGroups(
          mockStories.map((s) => ({
            kitchenId: s.id,
            kitchenName: s.name,
            kitchenImage: s.image,
            stories: [{ id: s.id, mediaUrl: s.image, mediaType: "image", createdAt: new Date().toISOString() }],
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  if (!loading && groups.length === 0) return null

  return (
    <>
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="mt-8 md:mt-16"
      >
        <motion.h3 variants={fadeUp} className="font-poppins font-semibold text-dark text-base md:text-xl lg:text-2xl mb-4 md:mb-6">
          Today&apos;s Kitchen Stories
        </motion.h3>
        {loading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-16 h-16 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 md:gap-6 no-scrollbar pb-2">
            {groups.map((group, index) => (
              <StoryCircle
                key={group.kitchenId}
                story={{
                  id: group.kitchenId,
                  name: group.kitchenName,
                  image: group.kitchenImage,
                }}
                onClick={() => setViewerIndex(index)}
              />
            ))}
          </div>
        )}
      </motion.section>

      {viewerIndex !== null && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  )
}

function FeaturedKitchens() {
  const navigate = useNavigate()
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadKitchens = () => {
    setLoading(true)
    setError(false)
    fetchKitchenList("/api/kitchens/featured")
      .then(setKitchens)
      .catch(() => {
        setKitchens([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadKitchens()
  }, [])

  if (!loading && !error && kitchens.length === 0) return null

  return (
    <motion.section
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="mt-8 md:mt-16"
    >
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="font-poppins font-bold text-dark text-base md:text-xl lg:text-2xl">
          Featured Kitchens
        </h3>
        <button
          onClick={() => navigate("/search")}
          className="flex items-center gap-1 text-primary text-sm font-poppins font-medium cursor-pointer hover:gap-2 transition-all"
        >
          See all <ChevronRight size={16} />
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <KitchenCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
          <p className="font-nunito text-gray text-sm mb-3">Could not load featured kitchens</p>
          <button
            type="button"
            onClick={loadKitchens}
            className="text-primary font-poppins text-sm font-medium cursor-pointer hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {kitchens.map((kitchen) => (
            <KitchenCard
              key={kitchen.id}
              kitchen={kitchen}
              onClick={() => navigate(`/kitchen/${kitchen.id}`)}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}

function ExploreMoreKitchens() {
  const navigate = useNavigate()
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadKitchens = () => {
    setLoading(true)
    setError(false)
    fetchKitchenList("/api/kitchens")
      .then(setKitchens)
      .catch(() => {
        setKitchens([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadKitchens()
  }, [])

  if (!loading && !error && kitchens.length === 0) return null

  return (
    <motion.section
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="mt-8 md:mt-16"
    >
      <div className="mb-4 md:mb-6">
        <h3 className="font-poppins font-bold text-dark text-base md:text-xl lg:text-2xl">
          Explore More
        </h3>
        <p className="font-nunito text-gray text-sm mt-1">
          Browse all verified home kitchens near you
        </p>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <KitchenCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
          <p className="font-nunito text-gray text-sm mb-3">Could not load kitchens</p>
          <button
            type="button"
            onClick={loadKitchens}
            className="text-primary font-poppins text-sm font-medium cursor-pointer hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {kitchens.map((kitchen) => (
            <KitchenCard
              key={kitchen.id}
              kitchen={kitchen}
              onClick={() => navigate(`/kitchen/${kitchen.id}`)}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}

function AboutSection() {
  const navigate = useNavigate()

  return (
    <motion.section
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="mt-8 md:mt-12 relative rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-gray-100"
    >
      <div className="grid md:grid-cols-2">
        <div className="relative bg-[#0a1f13] p-6 md:p-10 flex flex-col justify-center min-h-[260px]">
          <div className="absolute inset-0 opacity-40">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f13]/90 to-primary/80" />
          <div className="relative z-10 text-white">
            <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Info size={22} />
            </div>
            <h3 className="font-poppins font-bold text-xl md:text-3xl leading-tight">
              About Atleast80
            </h3>
            <p className="font-nunito text-white/80 text-sm md:text-base mt-3 leading-relaxed max-w-md">
              Verified home kitchens for homemade food &amp; daily ration — hygiene-checked, community-powered, delivered across India.
            </p>
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-[#0a1f13] font-poppins font-semibold text-sm hover:bg-secondary-light transition-colors cursor-pointer"
            >
              Our story
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="relative bg-white p-4 md:p-5 grid grid-cols-2 gap-2 md:gap-3 min-h-[260px]">
          <img
            src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=500&fit=crop"
            alt="Homemade meal"
            className="rounded-xl w-full h-full min-h-[110px] object-cover"
          />
          <div className="flex flex-col gap-2 md:gap-3">
            <img
              src="/indianwomen.png"
              alt="Indian woman preparing roti"
              className="rounded-xl w-full h-[48%] min-h-[80px] object-cover flex-1"
            />
            <img
              src="/grocery.png"
              alt="Supermarket grocery"
              className="rounded-xl w-full h-[48%] min-h-[80px] object-cover flex-1"
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function PopularItems() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="hidden md:block mt-16"
    >
      <motion.h3 variants={fadeUp} className="font-poppins font-bold text-dark text-xl lg:text-2xl mb-6">
        Popular Right Now
      </motion.h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {menuItems.map((item, i) => (
          <motion.div key={item.id} variants={fadeUp} custom={i}>
            <FoodCard item={item} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

function HowItWorks() {
  const steps = [
    { step: "01", title: "Browse Kitchens", desc: "Discover trusted home kitchens near you with real hygiene ratings", icon: Search },
    { step: "02", title: "Pick Your Favorites", desc: "Add food and grocery items from the same kitchen to one cart", icon: ShoppingCart },
    { step: "03", title: "Enjoy Fresh Meals", desc: "Get delivered to your doorstep or pick up fresh from the kitchen", icon: Truck },
  ]

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="hidden md:block mt-20"
    >
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h3 className="font-poppins font-bold text-dark text-3xl">How It Works</h3>
        <p className="font-nunito text-gray text-lg mt-2">Simple steps to delicious homemade food</p>
      </motion.div>
      <div className="grid grid-cols-3 gap-10">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={i} variants={fadeUp} custom={i} className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-5 relative">
                <Icon size={32} className="text-primary" />
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-poppins font-bold text-primary text-xs shadow-md">
                  {s.step}
                </span>
              </div>
              <h4 className="font-poppins font-bold text-dark text-lg mb-2">{s.title}</h4>
              <p className="font-nunito text-gray text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}

function WhySection() {
  const features = [
    { icon: ShieldCheck, title: "Daily Hygiene Verified", desc: "Every kitchen submits daily video proof of cleanliness and food safety" },
    { icon: Home, title: "True Home Kitchens", desc: "Real home chefs cooking traditional recipes with love and care" },
    { icon: ShoppingCart, title: "Food + Grocery Together", desc: "Order fresh meals and ration essentials from the same kitchen" },
    { icon: Heart, title: "Organic & Healthy", desc: "No excess sugar, no maida-heavy items, only clean nutrition promoted" },
  ]

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="hidden md:block mt-20 bg-white rounded-[2rem] p-12 shadow-sm"
    >
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h3 className="font-poppins font-bold text-dark text-3xl">Why Atleast80?</h3>
        <p className="font-nunito text-gray text-lg mt-2">Trust, hygiene, and tradition in every meal</p>
      </motion.div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <motion.div key={i} variants={fadeUp} custom={i} className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                <Icon size={30} className="text-primary" />
              </div>
              <h4 className="font-poppins font-semibold text-dark text-base mb-2">{f.title}</h4>
              <p className="font-nunito text-gray text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}

function PartnerSection() {
  const navigate = useNavigate()

  const stats = [
    { icon: Store, value: "500+", label: "Home Kitchens" },
    { icon: Users, value: "50K+", label: "Happy Customers" },
    { icon: TrendingUp, value: "95%", label: "Hygiene Score" },
  ]

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="hidden md:block mt-20 mb-12"
    >
      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 mb-16">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <Icon size={28} className="text-primary mx-auto mb-3" />
              <p className="font-poppins font-extrabold text-3xl text-dark">{s.value}</p>
              <p className="font-nunito text-gray text-sm mt-1">{s.label}</p>
            </div>
          )
        })}
      </motion.div>

      {/* Partner CTA */}
      <motion.div
        variants={fadeUp}
        custom={1}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-[#023015] p-12 lg:p-16"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <Handshake size={24} className="text-secondary" />
              <span className="font-poppins font-semibold text-secondary text-sm uppercase tracking-wide">Partner With Us</span>
            </div>
            <h3 className="font-poppins font-bold text-white text-3xl lg:text-4xl leading-tight">
              Own a home kitchen?
              <br />
              Start selling today.
            </h3>
            <p className="font-nunito text-white/70 text-lg mt-4 leading-relaxed">
              Join 500+ verified home kitchens. List your meals, ration items, and reach
              thousands of customers who trust homemade food.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              variant="secondary"
              size="lg"
              className="text-base px-8"
              onClick={() => navigate("/kitchen/signup")}
            >
              Register Your Kitchen
              <ArrowRight size={18} />
            </Button>
            <p className="font-nunito text-white/50 text-sm text-center">Free to register. Start earning in 24hrs.</p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  )
}

export default function HomePage() {
  return (
    <>
      {/* Desktop: transparent navbar over video */}
      <div className="hidden md:block">
        <Navbar transparent />
      </div>
      {/* Mobile: sticky navbar */}
      <div className="md:hidden">
        <Navbar />
      </div>

      <DesktopHero />

      {/* Page content */}
      <div className="bg-cream pb-20 md:pb-8">
        <div className="px-4 md:px-10 lg:px-16 xl:px-24 max-w-[1400px] mx-auto">
          <MobileHeroBanner />
          <CategoryRow />
          <AboutSection />
          <StoriesSection />
          <FeaturedKitchens />
          <ExploreMoreKitchens />
          <PopularItems />
          <HowItWorks />
          <WhySection />
          <PartnerSection />
        </div>
      </div>

      <Footer />
    </>
  )
}
