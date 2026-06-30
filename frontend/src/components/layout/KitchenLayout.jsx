import { useState, useEffect, useRef } from "react"

import { NavLink, useNavigate } from "react-router-dom"

import {

  LayoutDashboard,

  LogOut,

  UtensilsCrossed,

  BarChart3,

  User,

  Bell,

  HelpCircle,

  Lock,

  Menu,

  X,

  PlusCircle,

  ImageIcon,

  Loader2,

  MapPin,
  MessageSquare,

} from "lucide-react"

import { useAuth } from "../../context/AuthContext"

import { KitchenPanelContext } from "../../context/KitchenPanelContext"

import KitchenAvatar from "../common/KitchenAvatar"

import KitchenStoryModal from "../kitchen/KitchenStoryModal"

import StoryCircle from "../common/StoryCircle"

import StoryViewer from "../common/StoryViewer"
import AlertsPanel from "../common/AlertsPanel"

import { api, uploadKitchenCover } from "../../lib/api"

import { resolveMediaUrl } from "../../lib/media"

import { cn } from "../../lib/utils"

function HeaderIconButton({ icon: Icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 min-w-[44px] px-1.5 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait",
        active ? "text-primary hover:bg-primary/10" : "text-gray hover:bg-gray-100"
      )}
    >
      {disabled ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
      <span className="text-[9px] font-poppins font-medium leading-none text-center max-w-[56px] hidden sm:block">
        {label}
      </span>
    </button>
  )
}



export default function KitchenLayout({ children, fullBleed = false, fullWidth = false }) {

  const { user, kitchen, logoutKitchen, refreshKitchen } = useAuth()

  const navigate = useNavigate()

  const coverInputRef = useRef(null)

  const [drawerOpen, setDrawerOpen] = useState(false)

  const [storyModalOpen, setStoryModalOpen] = useState(false)

  const [uploadingCover, setUploadingCover] = useState(false)

  const [storiesRevision, setStoriesRevision] = useState(0)

  const [stories, setStories] = useState([])

  const [storyViewerOpen, setStoryViewerOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  const isApproved = kitchen?.status === "approved"

  useEffect(() => {
    api("/api/alerts", {}, "kitchen")
      .then((d) => setAlertCount((d.alerts || []).length))
      .catch(() => setAlertCount(0))
  }, [alertsOpen, kitchen?.status])

  useEffect(() => {
    if (!isApproved) {
      setStories([])
      return
    }
    api("/api/stories/me")
      .then((data) => setStories(data.stories || []))
      .catch(() => setStories([]))
  }, [isApproved, storiesRevision])

  const storyGroup =
    stories.length > 0 && kitchen
      ? {
          kitchenId: kitchen.id,
          kitchenName: kitchen.name,
          kitchenImage: kitchen.image,
          stories: stories.map((s) => ({
            ...s,
            mediaUrl: resolveMediaUrl(s.mediaUrl),
          })),
        }
      : null

  const handleStoryRingClick = () => {
    if (stories.length > 0) setStoryViewerOpen(true)
    else setStoryModalOpen(true)
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadingCover(true)
    try {
      await uploadKitchenCover(file)
      await refreshKitchen()
    } catch (err) {
      alert(err.message || "Failed to upload home card image")
    } finally {
      setUploadingCover(false)
    }
  }



  const navItems = [

    { to: "/kitchen/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },

    { to: "/kitchen/menu", label: "Menu", icon: UtensilsCrossed, requiresApproval: true },

    { to: "/kitchen/enquiries", label: "Enquiries", icon: MessageSquare, requiresApproval: true },

    { to: "/kitchen/profile", label: "Profile", icon: User },

    { to: "/kitchen/dashboard", label: "Analytics", icon: BarChart3, disabled: true },

  ]



  const handleLogout = () => {

    setDrawerOpen(false)

    logoutKitchen()

    navigate("/kitchen/login")

  }



  useEffect(() => {

    document.body.style.overflow = drawerOpen ? "hidden" : ""

    return () => { document.body.style.overflow = "" }

  }, [drawerOpen])



  const statusColor = {

    pending: "bg-amber-100 text-amber-700",

    approved: "bg-emerald-100 text-emerald-700",

    rejected: "bg-red-100 text-red-700",

  }



  const renderNavItem = (item, onNavigate) => {

    const Icon = item.icon

    const locked = item.requiresApproval && !isApproved



    if (locked) {

      return (

        <div

          key={item.label}

          className="flex items-center gap-3 px-3 py-3 rounded-xl font-poppins text-sm font-medium text-white/30"

          title="Available after admin approval"

        >

          <Icon size={18} />

          {item.label}

          <Lock size={12} className="ml-auto" />

        </div>

      )

    }



    return (

      <NavLink

        key={item.label}

        to={item.to}

        end={item.end}

        onClick={onNavigate}

        className={({ isActive }) =>

          cn(

            "flex items-center gap-3 px-3 py-3 rounded-xl font-poppins text-sm font-medium transition-colors",

            item.disabled && "opacity-40 pointer-events-none",

            isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"

          )

        }

      >

        <Icon size={18} />

        {item.label}

        {item.disabled && (

          <span className="ml-auto text-[9px] bg-white/10 px-1.5 py-0.5 rounded">Soon</span>

        )}

      </NavLink>

    )

  }



  const sidebarContent = (onNavigate) => (

    <>

      <div className="flex items-center justify-between p-4 border-b border-white/10 lg:block lg:p-5">

        <div>

          <p className="font-poppins font-bold text-base">Atleast80</p>

          <p className="text-[10px] text-secondary uppercase tracking-widest font-semibold mt-0.5">Partner Console</p>

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

        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">Your Kitchen</p>

        <div className="flex items-center gap-3">

          <KitchenAvatar kitchen={kitchen} size="sm" />

          <p className="font-poppins font-semibold text-sm truncate flex-1 min-w-0">{kitchen?.name || "—"}</p>

        </div>

        {kitchen?.status && (

          <span className={cn("inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", statusColor[kitchen.status])}>

            {kitchen.status}

          </span>

        )}

      </div>



      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">

        <p className="px-3 py-2 text-[10px] text-white/35 uppercase tracking-widest font-semibold lg:hidden">Menu</p>

        {navItems.map((item) => renderNavItem(item, onNavigate))}

      </nav>



      <div className="p-3 border-t border-white/10 space-y-1">

        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/50 hover:bg-white/10 text-sm font-poppins cursor-pointer">

          <HelpCircle size={18} /> Help & Support

        </button>

        <button

          onClick={() => { onNavigate?.(); handleLogout() }}

          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/50 hover:bg-white/10 hover:text-red-300 text-sm font-poppins cursor-pointer transition-colors"

        >

          <LogOut size={18} /> Logout

        </button>

      </div>

    </>

  )



  return (
    <KitchenPanelContext.Provider
      value={{
        openStoryModal: () => setStoryModalOpen(true),
        storiesRevision,
      }}
    >
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

        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">

          <div className="flex items-center gap-2 min-w-0">

            <button

              onClick={() => setDrawerOpen(true)}

              className="lg:hidden p-2.5 rounded-xl bg-[#f4f4f5] hover:bg-gray-200 cursor-pointer flex-shrink-0 transition-colors"

              aria-label="Open menu"

            >

              <Menu size={20} className="text-dark" />

            </button>

            <div className="min-w-0">

              <h1 className="font-poppins font-bold text-base text-dark truncate">

                {kitchen?.name || "Kitchen Dashboard"}

              </h1>

              <p className="text-[11px] text-gray font-nunito truncate flex items-center gap-1 min-w-0">
                <MapPin size={12} className="flex-shrink-0 text-primary" />
                <span className="truncate">
                  {[kitchen?.address, kitchen?.city, kitchen?.state, kitchen?.pincode].filter(Boolean).join(", ") || "Add your address in profile"}
                </span>
              </p>

            </div>

          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {kitchen && (
              <>
                <HeaderIconButton
                  icon={ImageIcon}
                  label="Home image"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  active
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </>
            )}
            {isApproved && (
              <>
                <StoryCircle
                  story={{ name: kitchen?.name || "Kitchen", image: kitchen?.image }}
                  showLabel={false}
                  size="sm"
                  onClick={handleStoryRingClick}
                  className="mr-0.5"
                />
                <HeaderIconButton
                  icon={PlusCircle}
                  label="Add story"
                  onClick={() => setStoryModalOpen(true)}
                  active
                />
              </>
            )}

            <HeaderIconButton
              icon={Bell}
              label="Alerts"
              onClick={() => setAlertsOpen(true)}
              active={alertCount > 0}
            />
            <HeaderIconButton
              icon={LogOut}
              label="Logout"
              onClick={handleLogout}
            />
          </div>

        </header>



        <main
          className={cn(
            "flex-1",
            fullWidth && "py-4 md:py-5",
            !fullWidth && fullBleed && "px-2 py-3 sm:px-3 md:px-4 md:py-5",
            !fullWidth && !fullBleed && "p-4 md:p-6"
          )}
        >
          {children}
        </main>

      </div>

      <KitchenStoryModal
        open={storyModalOpen}
        onClose={() => {
          setStoryModalOpen(false)
          setStoriesRevision((n) => n + 1)
        }}
      />

      {storyViewerOpen && storyGroup && (
        <StoryViewer
          groups={[storyGroup]}
          initialGroupIndex={0}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      <AlertsPanel open={alertsOpen} onClose={() => setAlertsOpen(false)} />

    </div>
    </KitchenPanelContext.Provider>
  )

}


