import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, Mail, MessageCircle, Clock, ArrowRight, Headphones } from "lucide-react"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import Button from "../components/ui/Button"
import { getPublicContactSettings } from "../lib/api"

export default function ContactPage() {
  const navigate = useNavigate()
  const [contact, setContact] = useState({
    supportPhone: "+91 40 3559 4439",
    supportEmail: "contact@elifelo.com",
  })

  useEffect(() => {
    getPublicContactSettings()
      .then((data) => {
        if (data?.supportPhone || data?.supportEmail) {
          setContact({
            supportPhone: data.supportPhone || "+91 40 3559 4439",
            supportEmail: data.supportEmail || "contact@elifelo.com",
          })
        }
      })
      .catch(() => {})
  }, [])

  const cleanPhone = contact.supportPhone.replace(/[^0-9+]/g, "")
  const channels = [
    {
      icon: Phone,
      label: "Phone",
      hint: "Order & seller support",
      value: contact.supportPhone,
      href: `tel:${cleanPhone}`,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: Mail,
      label: "Email",
      hint: "Reply within 1 business day",
      value: contact.supportEmail,
      href: `mailto:${contact.supportEmail}`,
      gradient: "from-primary to-primary-dark",
    },
  ]

  return (
    <StaticPageLayout
      badge="Get in touch"
      title="We're here to help"
      subtitle="Whether you're placing an order, running a home kitchen, or exploring a partnership — reach out anytime during support hours."
    >
      {/* Contact channels */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-5 mb-10 max-w-3xl">
        {channels.map((ch) => {
          const Icon = ch.icon
          const inner = (
            <>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ch.gradient} flex items-center justify-center shadow-lg mb-5`}>
                <Icon size={22} className="text-white" />
              </div>
              <p className="font-poppins text-white/60 text-xs font-semibold uppercase tracking-wider">{ch.label}</p>
              <p className="font-poppins font-bold text-white text-lg md:text-xl mt-2 leading-snug">{ch.value}</p>
              <p className="font-nunito text-white/50 text-sm mt-2">{ch.hint}</p>
              {ch.href && (
                <span className="inline-flex items-center gap-1 font-poppins text-secondary text-sm font-semibold mt-4 group-hover:gap-2 transition-all">
                  Reach out <ArrowRight size={14} />
                </span>
              )}
            </>
          )

          return ch.href ? (
            <a
              key={ch.label}
              href={ch.href}
              className="group relative overflow-hidden rounded-2xl bg-[#0a1f13] p-6 md:p-7 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              {inner}
            </a>
          ) : (
            <div key={ch.label} className="relative overflow-hidden rounded-2xl bg-[#0a1f13] p-6 md:p-7">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              {inner}
            </div>
          )
        })}
      </div>

      {/* Support + CTA split */}
      <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
        <div className="lg:col-span-3 rounded-3xl bg-white border border-gray-100 shadow-sm p-7 md:p-9">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-poppins font-bold text-dark text-lg">Support hours</h3>
              <p className="font-nunito text-gray text-sm">Monday – Saturday</p>
            </div>
          </div>
          <p className="font-poppins font-semibold text-primary text-2xl">9:00 AM – 7:00 PM IST</p>
          <p className="font-nunito text-gray text-sm md:text-base mt-4 leading-relaxed">
            For urgent delivery issues, call us and mention your order number so we can help faster.
            Seller partners can also reach us for menu, hygiene, or payout questions.
          </p>

          <div className="mt-8 pt-8 border-t border-gray-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-poppins font-semibold text-dark text-sm">What we can help with</p>
              <ul className="mt-2 space-y-1.5 font-nunito text-sm text-gray">
                <li>· Order tracking and delivery issues</li>
                <li>· Kitchen registration and hygiene uploads</li>
                <li>· Account, payments, and refunds</li>
                <li>· Partnerships and bulk enquiries</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-primary via-primary to-[#0a1f13] p-7 md:p-9 text-white flex flex-col justify-between min-h-[280px]">
          <div>
            <p className="font-poppins text-secondary text-xs font-semibold uppercase tracking-widest">Quick links</p>
            <h3 className="font-poppins font-bold text-xl md:text-2xl mt-3 leading-tight">
              Explore the platform while you&apos;re here
            </h3>
            <p className="font-nunito text-white/65 text-sm mt-3 leading-relaxed">
              Browse kitchens near you or start selling homemade food from your kitchen.
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <Button
              onClick={() => navigate("/search")}
              className="!rounded-xl !bg-white !text-primary hover:!bg-secondary w-full justify-center"
            >
              <MessageCircle size={16} /> Browse kitchens
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/kitchen/signup")}
              className="!rounded-xl !border-white/40 !text-white hover:!bg-white/10 w-full justify-center"
            >
              Register as a seller
            </Button>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  )
}
