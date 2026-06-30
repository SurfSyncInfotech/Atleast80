import { useState, useEffect } from "react"

import { NavLink, useNavigate } from "react-router-dom"

import {

  LayoutDashboard,

  ChefHat,

  Star,

  UtensilsCrossed,

  Bell,

  Users,

  BarChart3,

  Settings,

  LogOut,

  Menu,

  X,

} from "lucide-react"

import { useAuth } from "../../context/AuthContext"

import { cn } from "../../lib/utils"



const links = [

  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },

  { to: "/admin/kitchens", label: "Kitchens", icon: ChefHat },

  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },

  { to: "/admin/featured", label: "Featured", icon: Star },

  { to: "/admin/alerts", label: "Alerts", icon: Bell },

  { to: "/admin/customers", label: "Customers", icon: Users },

  { to: "/admin", label: "Analytics", icon: BarChart3, disabled: true },

  { to: "/admin", label: "Settings", icon: Settings, disabled: true },

]



export default function AdminLayout({ children }) {

  const { user, logoutAdmin } = useAuth()

  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)



  const handleLogout = () => {

    setDrawerOpen(false)

    logoutAdmin()

    navigate("/admin/login")

  }



  useEffect(() => {

    document.body.style.overflow = drawerOpen ? "hidden" : ""

    return () => { document.body.style.overflow = "" }

  }, [drawerOpen])



  const sidebarContent = (onNavigate) => (

    <>

      <div className="flex items-center justify-between p-4 border-b border-white/10 lg:block lg:p-5">

        <div>

          <p className="font-poppins font-bold text-base">Atleast80</p>

          <p className="text-[10px] text-secondary uppercase tracking-widest font-semibold mt-0.5">Admin Console</p>

        </div>

        <button

          onClick={() => setDrawerOpen(false)}

          className="lg:hidden p-2 rounded-lg hover:bg-white/10 cursor-pointer"

          aria-label="Close menu"

        >

          <X size={20} />

        </button>

      </div>



      <div className="px-4 py-4 border-b border-white/10">

        <p className="text-[11px] text-white/40 uppercase tracking-wider">Logged in as</p>

        <p className="font-nunito text-sm text-white/80 mt-0.5 truncate">{user?.name}</p>

        <p className="font-nunito text-xs text-white/40 mt-0.5 truncate">{user?.email}</p>

      </div>



      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">

        <p className="px-3 py-2 text-[10px] text-white/35 uppercase tracking-widest font-semibold lg:hidden">Menu</p>

        {links.map((link) => {

          const Icon = link.icon

          return (

            <NavLink

              key={link.label}

              to={link.to}

              end={link.end}

              onClick={onNavigate}

              className={({ isActive }) =>

                cn(

                  "flex items-center gap-3 px-3 py-3 rounded-xl font-poppins text-sm font-medium transition-colors",

                  link.disabled && "opacity-40 pointer-events-none",

                  isActive && !link.disabled

                    ? "bg-white/15 text-white"

                    : "text-white/70 hover:bg-white/10 hover:text-white"

                )

              }

            >

              <Icon size={18} />

              {link.label}

              {link.disabled && (

                <span className="ml-auto text-[9px] bg-white/10 px-1.5 py-0.5 rounded">Soon</span>

              )}

            </NavLink>

          )

        })}

      </nav>



      <button

        onClick={() => { onNavigate?.(); handleLogout() }}

        className="m-3 flex items-center gap-3 px-3 py-3 rounded-xl text-white/50 hover:bg-white/10 hover:text-red-300 text-sm font-poppins cursor-pointer transition-colors"

      >

        <LogOut size={18} /> Logout

      </button>

    </>

  )



  return (

    <div className="min-h-screen bg-[#f4f4f5] flex">

      <aside className="hidden lg:flex lg:w-[240px] xl:w-[260px] bg-[#0a1f13] text-white flex-col fixed h-full z-30">

        {sidebarContent()}

      </aside>



      {/* Mobile left drawer */}

      <div className={cn("fixed inset-0 z-50 lg:hidden pointer-events-none", drawerOpen && "pointer-events-auto")}>

        <div

          className={cn(

            "absolute inset-0 bg-black/50 transition-opacity duration-300",

            drawerOpen ? "opacity-100" : "opacity-0"

          )}

          onClick={() => setDrawerOpen(false)}

        />

        <aside

          className={cn(

            "absolute top-0 left-0 h-full w-[300px] max-w-[88vw] bg-[#0a1f13] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-out",

            drawerOpen ? "translate-x-0" : "-translate-x-full"

          )}

        >

          {sidebarContent(() => setDrawerOpen(false))}

        </aside>

      </div>



      <div className="flex-1 lg:ml-[240px] xl:ml-[260px] min-w-0 flex flex-col">

        <header className="sticky top-0 z-20 bg-white border-b border-[#e8e8e8] px-4 md:px-6 py-3 flex items-center gap-3">

          <button

            onClick={() => setDrawerOpen(true)}

            className="lg:hidden p-2.5 rounded-xl bg-[#f4f4f5] hover:bg-gray-200 cursor-pointer flex-shrink-0 transition-colors"

            aria-label="Open menu"

          >

            <Menu size={20} className="text-dark" />

          </button>

          <p className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate flex-1">Admin Console</p>

          <div className="flex items-center gap-1 flex-shrink-0">

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-poppins font-medium text-gray hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button className="relative p-2 rounded-lg hover:bg-gray-100 cursor-pointer">

              <Bell size={18} className="text-gray" />

              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />

            </button>

            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">

              {user?.name?.[0] || "A"}

            </div>

          </div>

        </header>



        <main className="flex-1 p-4 md:p-6">{children}</main>

      </div>

    </div>

  )

}


