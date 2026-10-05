import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, Mail, ArrowRight } from "lucide-react"
import { getPublicContactSettings } from "../../lib/api"

export default function Footer() {
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

  const linkClass = "hover:text-secondary cursor-pointer transition-colors text-left"
  const cleanPhone = contact.supportPhone.replace(/[^0-9+]/g, "")

  return (
    <footer className="hidden md:block bg-[#0a1f13] text-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        {/* Newsletter */}
        <div className="py-12 border-b border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="font-poppins font-bold text-xl">Stay updated with fresh offers</h4>
            <p className="font-nunito text-white/50 text-sm mt-1">Get notified about new kitchens and exclusive deals</p>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-5 py-3 bg-white/10 border border-white/15 rounded-full text-sm font-nunito text-white placeholder:text-white/40 focus:outline-none focus:border-secondary/50 w-64 transition-colors"
            />
            <button className="px-5 py-3 bg-secondary text-primary font-poppins font-semibold text-sm rounded-full hover:bg-secondary-light transition-colors cursor-pointer flex items-center gap-1.5">
              Subscribe <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Links grid */}
        <div className="py-12 grid grid-cols-4 gap-10">
          <div>
            <span className="font-poppins font-bold text-lg text-white">Atleast80</span>
            <p className="font-nunito text-white/50 text-sm leading-relaxed mt-4">
              Trusted homemade food and essentials delivered from verified local home kitchens.
            </p>
            <div className="mt-5 space-y-2.5">
              <a href={`tel:${cleanPhone}`} className="flex items-center gap-2 text-sm text-white/50 hover:text-secondary transition-colors">
                <Phone size={14} className="text-secondary flex-shrink-0" /> {contact.supportPhone}
              </a>
              <a href={`mailto:${contact.supportEmail}`} className="flex items-center gap-2 text-sm text-white/50 hover:text-secondary transition-colors">
                <Mail size={14} className="text-secondary flex-shrink-0" /> {contact.supportEmail}
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">For You</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button type="button" onClick={() => navigate("/search")} className={linkClass}>Browse Kitchens</button></li>
              <li><button type="button" onClick={() => navigate("/about")} className={linkClass}>About Us</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">For Sellers</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button type="button" onClick={() => navigate("/kitchen/signup")} className={linkClass}>Register Kitchen</button></li>
              <li><button type="button" onClick={() => navigate("/kitchen/login")} className={linkClass}>Seller Dashboard</button></li>
              <li><button type="button" onClick={() => navigate("/hygiene-guidelines")} className={linkClass}>Hygiene Guidelines</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button type="button" onClick={() => navigate("/about")} className={linkClass}>About Us</button></li>
              <li><button type="button" onClick={() => navigate("/contact")} className={linkClass}>Contact</button></li>
              <li><button type="button" onClick={() => navigate("/privacy")} className={linkClass}>Privacy Policy</button></li>
              <li><button type="button" onClick={() => navigate("/terms")} className={linkClass}>Terms of Service</button></li>
              <li><button type="button" onClick={() => navigate("/user-account-deletion")} className={linkClass}>Delete Account</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-6 flex items-center justify-between">
          <p className="text-sm text-white/30 font-nunito">
            2026 Atleast80. All rights reserved.
          </p>
          <p className="text-sm text-white/30 font-nunito">
            Follow the Kitchen Tradition
          </p>
        </div>
      </div>
    </footer>
  )
}
