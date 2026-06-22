import { MapPin, Search, Bell, ShoppingCart, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"

function initials(name) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function Navbar({ transparent = false }) {
  const navigate = useNavigate()
  const { itemCount, requireCustomer } = useCart()
  const { user, isCustomer } = useAuth()

  const goCart = () => {
    if (!requireCustomer()) return
    navigate("/cart")
  }

  return (
    <header
      className={`z-50 transition-all duration-300 ${
        transparent
          ? "absolute top-0 left-0 w-full bg-transparent"
          : "sticky top-0 bg-cream/95 backdrop-blur-md border-b border-gray-light/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-3 md:py-4 flex items-center gap-4">
        <button onClick={() => navigate("/home")} className="hidden md:block cursor-pointer flex-shrink-0">
          <span
            className={`font-poppins font-bold text-xl tracking-tight transition-colors ${
              transparent ? "text-white" : "text-primary"
            }`}
          >
            Atleast80
          </span>
        </button>

        <button className="flex items-center gap-1.5 cursor-pointer group md:hidden">
          <MapPin size={18} className="text-primary" />
          <div className="text-left">
            <p className="text-xs text-gray">Delivering to</p>
            <p className="text-sm font-poppins font-semibold text-dark group-hover:text-primary transition-colors">
              India <span className="text-xs text-gray">▼</span>
            </p>
          </div>
        </button>

        <button
          className={`hidden md:flex items-center gap-1.5 cursor-pointer group px-4 py-2.5 rounded-full border transition-all duration-200 ${
            transparent
              ? "bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
              : "bg-white border-gray-light hover:border-primary hover:shadow-sm"
          }`}
        >
          <MapPin size={15} className={transparent ? "text-secondary" : "text-primary"} />
          <span className={`text-sm font-medium ${transparent ? "text-white" : "text-dark"}`}>India</span>
        </button>

        {!transparent && (
          <div className="flex-1 relative max-w-2xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
            <input
              type="text"
              placeholder="Search homemade food & groceries..."
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-white rounded-full border border-gray-light text-sm font-nunito placeholder:text-gray focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
        )}

        {transparent && <div className="flex-1" />}

        <nav className="hidden lg:flex items-center gap-7">
          <button
            onClick={() => navigate("/about")}
            className={`text-sm font-poppins font-medium cursor-pointer ${
              transparent ? "text-white/90 hover:text-white" : "text-dark-light hover:text-primary"
            }`}
          >
            About
          </button>
          <button
            onClick={() => navigate("/search")}
            className={`text-sm font-poppins font-medium cursor-pointer ${
              transparent ? "text-white/90 hover:text-white" : "text-dark-light hover:text-primary"
            }`}
          >
            Discover
          </button>
          <button
            onClick={goCart}
            className={`text-sm font-poppins font-medium cursor-pointer flex items-center gap-1.5 relative ${
              transparent ? "text-white/90 hover:text-white" : "text-dark-light hover:text-primary"
            }`}
          >
            <ShoppingCart size={16} />
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </nav>

        <button className={`relative p-2.5 rounded-full cursor-pointer ${transparent ? "hover:bg-white/10" : "hover:bg-gray-light/50"}`}>
          <Bell size={20} className={transparent ? "text-white" : "text-dark"} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
        </button>

        {isCustomer ? (
          <button
            onClick={() => navigate("/profile")}
            className={`hidden md:flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full cursor-pointer transition-all ${
              transparent
                ? "bg-white/15 hover:bg-white/25 text-white"
                : "bg-white border border-gray-light hover:border-primary shadow-sm"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-poppins font-bold ${
                transparent ? "bg-white text-primary" : "bg-primary text-white"
              }`}
            >
              {initials(user.name)}
            </span>
            <span className={`text-sm font-poppins font-semibold max-w-[100px] truncate ${transparent ? "text-white" : "text-dark"}`}>
              {user.name?.split(" ")[0]}
            </span>
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-poppins font-semibold cursor-pointer ${
              transparent ? "bg-white text-primary shadow-lg" : "bg-primary text-white hover:bg-primary-dark shadow-sm"
            }`}
          >
            <User size={16} />
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
