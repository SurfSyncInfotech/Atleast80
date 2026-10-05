import { useState, useEffect, useRef } from "react"

import { NavLink, useNavigate } from "react-router-dom"

import {

  LayoutDashboard,

  LogOut,

  UtensilsCrossed,

  ShoppingBag,

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
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Pencil,
  ArrowRight,
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
  const [unreadEnquiryCount, setUnreadEnquiryCount] = useState(0)
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const prevNewOrdersRef = useRef(-1)
  
  // Real-time live alert toast popup
  const [liveAlert, setLiveAlert] = useState(null)
  const seenAlertIdsRef = useRef(new Set())
  const isFirstAlertFetchRef = useRef(true)

  const isApproved = kitchen?.status === "approved"

  useEffect(() => {
    refreshKitchen().catch(() => {})
  }, [refreshKitchen])

  // Play audio chime when a new order arrives
  const playOrderChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {
      // AudioContext might be blocked until user gesture
    }
  }

  // Play alert notification chime
  const playAlertChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch (e) {
      // ignore
    }
  }

  // Poll for new pending orders every 4 seconds
  useEffect(() => {
    if (!isApproved) return

    const checkNewOrders = async () => {
      try {
        const stats = await api("/api/orders/kitchen/stats", {}, "kitchen")
        const pending = Number(stats?.pendingOrders || stats?.pending_count || 0)
        setNewOrdersCount(pending)

        if (prevNewOrdersRef.current >= 0 && pending > prevNewOrdersRef.current) {
          playOrderChime()
        }
        prevNewOrdersRef.current = pending
      } catch (e) {
        // silent
      }
    }

    checkNewOrders()
    const interval = setInterval(checkNewOrders, 4000)
    return () => clearInterval(interval)
  }, [isApproved])

  useEffect(() => {
    if (!isApproved) return

    const checkEnquiryMessages = async () => {
      try {
        const data = await api("/api/bulk-enquiries/partner", {}, "kitchen")
        const enquiries = data.enquiries || []
        let unread = 0
        enquiries.forEach((e) => {
          if (e.lastMessage && e.lastMessageSenderId && e.lastMessageSenderId !== user?.id) {
            unread += 1
          }
        })
        setUnreadEnquiryCount(unread)
      } catch (e) {
        // silent
      }
    }

    checkEnquiryMessages()
    const interval = setInterval(checkEnquiryMessages, 4000)
    return () => clearInterval(interval)
  }, [isApproved, user?.id])

  // Poll alerts every 3 seconds for real-time popups
  useEffect(() => {
    if (!isApproved) return

    const fetchAlerts = async () => {
      try {
        const d = await api("/api/alerts", {}, "kitchen")
        const list = d.alerts || []
        setAlertCount(list.length)

        if (list.length > 0) {
          // Find any unseen alert
          const unseen = list.find((a) => !seenAlertIdsRef.current.has(a.id))
          if (unseen) {
            // If not first fetch or it's a critical menu alert, trigger live popup
            if (!isFirstAlertFetchRef.current || unseen.title?.includes("Item") || unseen.title?.includes("Admin")) {
              setLiveAlert(unseen)
              playAlertChime()
            }
            list.forEach((a) => seenAlertIdsRef.current.add(a.id))
          }
        }
        isFirstAlertFetchRef.current = false
      } catch {
        setAlertCount(0)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 3000)
    return () => clearInterval(interval)
  }, [isApproved, alertsOpen, kitchen?.status])

  const dismissLiveAlert = async (id) => {
    try {
      await api(`/api/alerts/${id}/dismiss`, { method: "POST" }, "kitchen")
      setLiveAlert(null)
      setAlertCount((prev) => Math.max(0, prev - 1))
    } catch {
      setLiveAlert(null)
    }
  }

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

    { to: "/kitchen/orders", label: "Orders", icon: ShoppingBag, requiresApproval: true },

    { to: "/kitchen/enquiries", label: "Enquiries", icon: MessageSquare, requiresApproval: true },

    { to: "/kitchen/payouts", label: "Payouts", icon: IndianRupee, requiresApproval: true },

    { to: "/kitchen/profile", label: "Profile", icon: User },

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

        {item.label === "Orders" && newOrdersCount > 0 && (
          <span className="ml-auto bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            {newOrdersCount} New
          </span>
        )}

        {item.label === "Enquiries" && unreadEnquiryCount > 0 && (
          <span className="ml-auto bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm">
            {unreadEnquiryCount} New
          </span>
        )}

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
              className="lg:hidden p-2.5 rounded-xl bg-[#f4f4f5] hover:bg-gray-200 cursor-pointer flex-shrink-0 transition-colors relative"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-dark" />
              {(newOrdersCount > 0 || unreadEnquiryCount > 0) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-ping" />
              )}
              {(newOrdersCount > 0 || unreadEnquiryCount > 0) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
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

            {isApproved && (
              <div className="relative">
                <HeaderIconButton
                  icon={ShoppingBag}
                  label="Orders"
                  onClick={() => navigate("/kitchen/orders")}
                  active={newOrdersCount > 0}
                />
                {newOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full ring-2 ring-white animate-pulse">
                    {newOrdersCount}
                  </span>
                )}
              </div>
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

      {/* Real-time Admin Action Pop-up Notification for Seller */}
      {liveAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-lg w-[calc(100%-2rem)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "rounded-2xl p-4 sm:p-5 shadow-2xl border-2 backdrop-blur-md",
            liveAlert.title?.toLowerCase().includes("reject")
              ? "bg-red-50/95 border-red-500 text-red-950 shadow-red-500/20"
              : liveAlert.title?.toLowerCase().includes("edit")
              ? "bg-rose-50/95 border-rose-500 text-rose-950 shadow-rose-500/20"
              : liveAlert.title?.toLowerCase().includes("approve")
              ? "bg-emerald-50/95 border-emerald-500 text-emerald-950 shadow-emerald-500/20"
              : "bg-white/95 border-primary text-dark shadow-primary/20"
          )}>
            <div className="flex items-start gap-3.5">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                liveAlert.title?.toLowerCase().includes("reject")
                  ? "bg-red-500 text-white"
                  : liveAlert.title?.toLowerCase().includes("edit")
                  ? "bg-rose-600 text-white"
                  : liveAlert.title?.toLowerCase().includes("approve")
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-white"
              )}>
                {liveAlert.title?.toLowerCase().includes("reject") ? (
                  <AlertTriangle size={22} />
                ) : liveAlert.title?.toLowerCase().includes("edit") ? (
                  <Pencil size={20} />
                ) : liveAlert.title?.toLowerCase().includes("approve") ? (
                  <CheckCircle size={22} />
                ) : (
                  <Bell size={22} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-poppins font-bold text-sm sm:text-base leading-snug">
                    {liveAlert.title}
                  </h4>
                  <button
                    onClick={() => dismissLiveAlert(liveAlert.id)}
                    className="text-gray-500 hover:text-dark p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <p className="font-nunito text-xs sm:text-sm mt-1.5 whitespace-pre-line leading-relaxed opacity-90 font-medium">
                  {liveAlert.body}
                </p>

                <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-black/10">
                  <button
                    onClick={() => {
                      dismissLiveAlert(liveAlert.id)
                      navigate("/kitchen/menu")
                    }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-poppins font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm",
                      liveAlert.title?.toLowerCase().includes("reject") || liveAlert.title?.toLowerCase().includes("edit")
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    <span>View in Menu</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => dismissLiveAlert(liveAlert.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-poppins font-semibold bg-white/80 hover:bg-white text-gray-700 border border-gray-300 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </KitchenPanelContext.Provider>
  )

}


