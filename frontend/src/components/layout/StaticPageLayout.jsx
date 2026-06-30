import { motion } from "framer-motion"
import Navbar from "./Navbar"
import Footer from "./Footer"
import { cn } from "../../lib/utils"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
}

export function PageEyebrow({ children, className }) {
  return (
    <p className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-secondary text-[11px] font-poppins font-semibold uppercase tracking-wider",
      className
    )}>
      {children}
    </p>
  )
}

export function SectionHeading({ eyebrow, title, description, center = false, className }) {
  return (
    <div className={cn(center && "text-center max-w-2xl mx-auto", className)}>
      {eyebrow && (
        <p className="font-poppins text-primary text-xs font-semibold uppercase tracking-widest mb-2">{eyebrow}</p>
      )}
      <h2 className="font-poppins font-bold text-dark text-xl md:text-2xl lg:text-3xl leading-tight">{title}</h2>
      {description && (
        <p className="font-nunito text-gray text-sm md:text-base mt-3 leading-relaxed">{description}</p>
      )}
    </div>
  )
}

export default function StaticPageLayout({
  badge,
  title,
  subtitle,
  children,
  wide = false,
  variant = "default",
}) {
  const isLegal = variant === "legal"

  return (
    <>
      <Navbar />
      <div className="bg-cream min-h-screen pb-20 md:pb-0">
        {/* Hero */}
        <section className="relative bg-[#0a1f13] text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,200,80,0.12),_transparent_50%)]" />
          <div className="absolute top-10 right-[8%] w-72 h-72 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-[5%] w-80 h-80 bg-primary/25 rounded-full blur-3xl" />
          {isLegal && (
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:48px_48px]" />
          )}

          <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-20 md:pb-28">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="max-w-3xl"
            >
              {badge && <PageEyebrow className="mb-5">{badge}</PageEyebrow>}
              <h1 className="font-poppins font-bold text-3xl sm:text-4xl md:text-5xl leading-[1.12] tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="font-nunito text-white/65 text-base md:text-lg mt-5 leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              )}
            </motion.div>
          </div>

          {/* Wave into content */}
          <div className="absolute bottom-0 left-0 right-0 h-16 md:h-24 bg-gradient-to-t from-cream to-transparent" />
        </section>

        {/* Content */}
        <div className="relative -mt-10 md:-mt-14 max-w-[1400px] mx-auto px-4 md:px-6 pb-14 md:pb-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  )
}
