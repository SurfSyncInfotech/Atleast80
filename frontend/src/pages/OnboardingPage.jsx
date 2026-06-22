import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, UtensilsCrossed, ShieldCheck, ShoppingCart, ChefHat } from "lucide-react"
import Button from "../components/ui/Button"

const slides = [
  {
    title: "Healthy Homemade Food",
    subtitle: "Fresh meals prepared in trusted home kitchens with love and care",
    icon: UtensilsCrossed,
    bg: "from-secondary/20 to-cream",
    iconBg: "bg-secondary/20 text-primary",
  },
  {
    title: "Daily Hygiene Verified",
    subtitle: "Every kitchen submits daily hygiene video for your safety and trust",
    icon: ShieldCheck,
    bg: "from-primary/10 to-cream",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    title: "Food + Ration Together",
    subtitle: "Order fresh food and grocery essentials from the same kitchen in one cart",
    icon: ShoppingCart,
    bg: "from-accent/10 to-cream",
    iconBg: "bg-accent/10 text-accent",
  },
  {
    title: "Trusted Local Chefs",
    subtitle: "Support your neighborhood home chefs and get authentic traditional food",
    icon: ChefHat,
    bg: "from-secondary/15 to-cream",
    iconBg: "bg-secondary/15 text-primary",
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const handleNext = () => {
    if (current === slides.length - 1) {
      navigate("/home")
    } else {
      setCurrent(current + 1)
    }
  }

  const handleSkip = () => {
    navigate("/home")
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${slides[current].bg} flex flex-col`}>
      {/* Skip button */}
      <div className="flex justify-end p-5">
        <button
          onClick={handleSkip}
          className="font-nunito text-gray text-sm hover:text-dark transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-8 ${slides[current].iconBg}`}>
              {(() => { const Icon = slides[current].icon; return <Icon size={56} /> })()}
            </div>
            <h1 className="font-poppins font-bold text-2xl md:text-3xl text-dark mb-4">
              {slides[current].title}
            </h1>
            <p className="font-nunito text-gray text-base md:text-lg max-w-sm mx-auto leading-relaxed">
              {slides[current].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-8 pb-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? "w-8 bg-primary"
                  : "w-2 bg-gray-light"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          onClick={handleNext}
          size="lg"
          className="w-full"
        >
          {current === slides.length - 1 ? "Get Started" : "Next"}
          <ChevronRight size={20} />
        </Button>
      </div>
    </div>
  )
}
