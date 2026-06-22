import { useEffect, useState, useCallback } from "react"
import { Star, Search, MapPin, CheckCircle } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function AdminFeaturedKitchensPage() {
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [actionId, setActionId] = useState(null)

  const loadKitchens = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api("/api/admin/kitchens/featured")
      setKitchens(data.kitchens)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKitchens() }, [loadKitchens])

  const toggleFeatured = async (kitchen) => {
    setActionId(kitchen.id)
    try {
      await api(`/api/admin/kitchens/${kitchen.id}/feature`, {
        method: "PATCH",
        body: JSON.stringify({ featured: !kitchen.is_featured }),
      })
      await loadKitchens()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionId(null)
    }
  }

  const featured = kitchens.filter((k) => k.is_featured)
  const query = searchInput.trim().toLowerCase()
  const approved = kitchens.filter((k) => {
    if (!query) return true
    return (
      k.name?.toLowerCase().includes(query) ||
      k.city?.toLowerCase().includes(query) ||
      k.speciality?.toLowerCase().includes(query)
    )
  })

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Featured Kitchens</h1>
        <p className="font-nunito text-[#696969] text-sm mt-1">
          Choose which approved kitchens appear on the homepage · {featured.length} featured
        </p>
      </div>

      {featured.length > 0 && (
        <div className="bg-white rounded-xl border border-primary/20 p-4 mb-5">
          <p className="font-poppins text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            Live on homepage
          </p>
          <div className="flex flex-wrap gap-2">
            {featured.map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-poppins font-medium"
              >
                <Star size={12} className="fill-primary" />
                {k.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#e8e8e8] p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search approved kitchens..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#f8f8f8] rounded-lg text-sm font-nunito border border-transparent focus:outline-none focus:border-primary/40 focus:bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : approved.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8e8] py-16 text-center">
          <p className="font-poppins font-medium text-[#1c1c1c]">No approved kitchens found</p>
          <p className="font-nunito text-sm text-[#999] mt-1">Approve kitchens first, then feature them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approved.map((k) => (
            <div
              key={k.id}
              className={cn(
                "bg-white rounded-xl border p-4 flex items-center gap-4 transition-shadow",
                k.is_featured ? "border-primary/30 shadow-sm ring-1 ring-primary/10" : "border-[#e8e8e8]"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-poppins font-bold">
                {k.name?.[0] || "K"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate">{k.name}</p>
                  {k.is_featured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Star size={10} className="fill-primary" /> Featured
                    </span>
                  )}
                </div>
                <p className="font-nunito text-xs text-[#999] truncate mt-0.5">{k.speciality}</p>
                <p className="font-nunito text-xs text-[#696969] flex items-center gap-1 mt-1">
                  <MapPin size={11} /> {k.city}, {k.state}
                </p>
              </div>
              <button
                onClick={() => toggleFeatured(k)}
                disabled={actionId === k.id}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-poppins font-semibold cursor-pointer transition-colors flex-shrink-0",
                  k.is_featured
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-primary text-white hover:bg-primary-dark",
                  actionId === k.id && "opacity-50"
                )}
              >
                <Star size={14} className={k.is_featured ? "fill-amber-500 text-amber-500" : ""} />
                {actionId === k.id ? "..." : k.is_featured ? "Remove" : "Feature"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="font-nunito text-xs text-[#999] mt-6 flex items-center gap-1.5">
        <CheckCircle size={14} className="text-primary" />
        Featured kitchens show in the &quot;Featured Kitchens&quot; section on the homepage.
      </p>
    </AdminLayout>
  )
}
