import { Home, Search, PlayCircle, ShoppingBag, User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "../../lib/utils"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Discover", path: "/search" },
  { icon: PlayCircle, label: "Stories", path: "/stories", highlight: true },
  { icon: ShoppingBag, label: "Orders", path: "/orders", showCartBadge: true, requiresAuth: true },
  { icon: User, label: "Profile", path: "/profile", requiresAuth: true },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { itemCount } = useCart()
  const { isCustomer, user } = useAuth()

  const goProfile = () => navigate(isCustomer ? "/profile" : "/login")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-light/50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/" && location.pathname === "/home")
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.requiresAuth && !isCustomer) navigate("/login")
                else if (item.path === "/profile") goProfile()
                else navigate(item.path === "/" ? "/home" : item.path)
              }}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                item.highlight && !isActive && "relative",
                isActive ? "text-primary" : "text-gray hover:text-dark"
              )}
            >
              {item.highlight && !isActive ? (
                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center -mt-4 shadow-md">
                  <Icon size={20} className="text-white" />
                </div>
              ) : item.path === "/profile" && isCustomer ? (
                <div className="w-7 h-7 rounded-full bg-primary text-white text-[10px] font-poppins font-bold flex items-center justify-center">
                  {initials(user?.name)}
                </div>
              ) : (
                <div className="relative">
                  <Icon
                    size={22}
                    className={cn(isActive && "fill-primary/20")}
                  />
                  {item.showCartBadge && itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </div>
              )}
              <span className={cn(
                "text-[10px] font-nunito font-medium",
                item.highlight && !isActive && "-mt-0.5"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
