import { useNavigate } from "react-router-dom"
import { MapPin, Phone, Mail, ArrowRight } from "lucide-react"

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="hidden md:block bg-[#0a1f13] text-white">
      <div className="max-w-[1400px] mx-auto px-10 lg:px-16 xl:px-24">
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
              <p className="flex items-center gap-2 text-sm text-white/50">
                <MapPin size={14} className="text-secondary" /> Lucknow, India
              </p>
              <p className="flex items-center gap-2 text-sm text-white/50">
                <Phone size={14} className="text-secondary" /> +91 98765 43210
              </p>
              <p className="flex items-center gap-2 text-sm text-white/50">
                <Mail size={14} className="text-secondary" /> hello@atleast80.com
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">For You</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button onClick={() => navigate("/search")} className="hover:text-secondary cursor-pointer transition-colors">Browse Kitchens</button></li>
              <li><button onClick={() => navigate("/search")} className="hover:text-secondary cursor-pointer transition-colors">Healthy Food</button></li>
              <li><button onClick={() => navigate("/search")} className="hover:text-secondary cursor-pointer transition-colors">Grocery & Ration</button></li>
              <li><button onClick={() => navigate("/search")} className="hover:text-secondary cursor-pointer transition-colors">Today's Offers</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">For Sellers</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button onClick={() => navigate("/kitchen/signup")} className="hover:text-secondary cursor-pointer transition-colors">Register Kitchen</button></li>
              <li><button onClick={() => navigate("/kitchen/login")} className="hover:text-secondary cursor-pointer transition-colors">Seller Dashboard</button></li>
              <li><span className="hover:text-secondary cursor-pointer transition-colors">Hygiene Guidelines</span></li>
              <li><span className="hover:text-secondary cursor-pointer transition-colors">Pricing & Plans</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-poppins font-semibold text-sm mb-5 text-white/80 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3 text-sm text-white/50 font-nunito">
              <li><button type="button" onClick={() => navigate("/about")} className="hover:text-secondary cursor-pointer transition-colors">About Us</button></li>
              <li><span className="hover:text-secondary cursor-pointer transition-colors">Contact</span></li>
              <li><span className="hover:text-secondary cursor-pointer transition-colors">Privacy Policy</span></li>
              <li><span className="hover:text-secondary cursor-pointer transition-colors">Terms of Service</span></li>
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
