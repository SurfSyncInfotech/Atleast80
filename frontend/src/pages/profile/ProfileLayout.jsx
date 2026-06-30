import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { User, Settings, Package, LogOut, Sparkles, ArrowLeft } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { cn } from "../../lib/utils"

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

const menuItems = [
  { to: "/profile", label: "Overview", icon: User, end: true },
  { to: "/profile/account", label: "My Account", icon: Settings },
  { to: "/profile/orders", label: "Order History", icon: Package },
]

export default function ProfileLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/home")
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] pb-28">
      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-primary-dark via-primary to-[#0a4025] pt-6 pb-6 px-4 md:px-8 lg:px-10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-[min(100%,90rem)] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                aria-label="Back to home"
              >
                <ArrowLeft size={18} className="text-white" />
              </button>
              <div className="flex items-center gap-2 text-secondary">
                <Sparkles size={14} />
                <span className="text-[10px] font-poppins font-bold uppercase tracking-[0.2em]">My Account</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-poppins font-semibold cursor-pointer hover:bg-white/20 transition-colors"
            >
              <LogOut size={13} />
              Log out
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white text-primary font-poppins font-bold text-xl md:text-2xl flex items-center justify-center shadow-xl ring-4 ring-white/20 flex-shrink-0">
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <h1 className="font-poppins font-bold text-xl md:text-2xl text-white truncate">{user?.name}</h1>
              <p className="font-nunito text-white/65 text-sm truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="sticky top-0 z-30 bg-[#f5f5f4]/95 backdrop-blur-md border-b border-gray-200/60">
        <div className="w-full max-w-[min(100%,90rem)] mx-auto px-4 md:px-8 lg:px-10">
          <nav className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-poppins font-semibold whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-gray hover:text-dark border border-gray-100"
                    )
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="w-full max-w-[min(100%,90rem)] mx-auto px-4 md:px-8 lg:px-10 py-6">
        <Outlet />
      </div>
    </div>
  )
}
