import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Search, ChefHat, MapPin, SlidersHorizontal, X, Store } from "lucide-react"
import Navbar from "../components/layout/Navbar"
import PageWrapper from "../components/layout/PageWrapper"
import KitchenCard from "../components/common/KitchenCard"
import Chip from "../components/common/Chip"
import { api } from "../lib/api"
import { toKitchenCard } from "../lib/kitchen"
import { kitchens as mockKitchens } from "../data/mockData"
import { cn } from "../lib/utils"

const filters = [
  { id: "all", label: "All" },
  { id: "rating", label: "Top Rated" },
  { id: "veg", label: "Pure Veg" },
  { id: "ration", label: "Ration" },
]

const sortOptions = [
  { id: "relevance", label: "Relevance" },
  { id: "rating", label: "Rating: High to Low" },
  { id: "delivery", label: "Fastest Delivery" },
  { id: "name", label: "Name A–Z" },
]

function parseDeliveryMinutes(str) {
  const match = String(str || "").match(/(\d+)/)
  return match ? Number(match[1]) : 99
}

function matchesQuery(kitchen, query) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    kitchen.name?.toLowerCase().includes(q) ||
    kitchen.speciality?.toLowerCase().includes(q) ||
    kitchen.city?.toLowerCase().includes(q) ||
    kitchen.bestItem?.toLowerCase().includes(q)
  )
}

function matchesFilter(kitchen, filterId) {
  switch (filterId) {
    case "rating":
      return kitchen.ratingVisible && kitchen.rating != null && kitchen.rating >= 4.5
    case "veg":
      return kitchen.kitchenType === "veg"
    case "ration":
      return /ration|grocery|essential/i.test(
        `${kitchen.speciality} ${kitchen.bestItem || ""}`
      )
    default:
      return true
  }
}

function sortKitchens(list, sortId) {
  const items = [...list]
  switch (sortId) {
    case "rating":
      return items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    case "delivery":
      return items.sort(
        (a, b) => parseDeliveryMinutes(a.deliveryTime) - parseDeliveryMinutes(b.deliveryTime)
      )
    case "name":
      return items.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return items
  }
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [showSort, setShowSort] = useState(false)

  useEffect(() => {
    api("/api/kitchens")
      .then((data) => setKitchens(data.kitchens.map(toKitchenCard)))
      .catch(() => setKitchens(mockKitchens))
      .finally(() => setLoading(false))
  }, [])

  const results = useMemo(() => {
    const filtered = kitchens.filter(
      (k) => matchesQuery(k, query) && matchesFilter(k, activeFilter)
    )
    return sortKitchens(filtered, sortBy)
  }, [kitchens, query, activeFilter, sortBy])

  const clearSearch = () => setQuery("")

  return (
    <>
      <Navbar />

      <PageWrapper className="pt-3 md:pt-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Page header — desktop */}
          <div className="hidden md:flex items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Store size={18} />
                <span className="font-poppins text-xs font-semibold uppercase tracking-wider">
                  Browse kitchens
                </span>
              </div>
              <h1 className="font-poppins font-bold text-dark text-3xl lg:text-4xl">
                All Home Kitchens
              </h1>
              <p className="font-nunito text-gray text-base mt-2 whitespace-nowrap">
                Discover verified home kitchens offering homemade food and daily ration near you.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-nunito text-gray bg-white px-4 py-2.5 rounded-xl border border-gray-light shadow-sm">
              <MapPin size={16} className="text-primary" />
              Delivering across <span className="font-semibold text-dark">India</span>
            </div>
          </div>

          {/* Mobile title */}
          <div className="md:hidden mb-4">
            <h1 className="font-poppins font-bold text-dark text-xl">All Kitchens</h1>
            <p className="font-nunito text-gray text-sm mt-0.5">
              Homemade food &amp; ration from trusted kitchens
            </p>
          </div>

          {/* Search + sort toolbar */}
          <div className="sticky top-[57px] md:top-[73px] z-30 -mx-4 px-4 md:mx-0 md:px-0 py-3 md:py-0 bg-cream/95 backdrop-blur-md md:bg-transparent md:static md:backdrop-blur-none mb-4 md:mb-6">
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search kitchens, food, city..."
                  className="w-full pl-12 pr-10 py-3.5 md:py-4 bg-white rounded-2xl border border-gray-light text-sm md:text-base font-nunito placeholder:text-gray focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray hover:bg-gray-light cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Desktop sort */}
              <div className="hidden md:block relative min-w-[200px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-full appearance-none pl-4 pr-10 py-3.5 bg-white rounded-2xl border border-gray-light text-sm font-nunito text-dark focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm cursor-pointer"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <SlidersHorizontal size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray pointer-events-none" />
              </div>

              {/* Mobile sort toggle */}
              <button
                type="button"
                onClick={() => setShowSort(!showSort)}
                className={cn(
                  "md:hidden flex-shrink-0 p-3.5 rounded-2xl border shadow-sm cursor-pointer transition-colors",
                  showSort ? "bg-primary text-white border-primary" : "bg-white text-gray border-gray-light"
                )}
                aria-label="Sort options"
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>

            {showSort && (
              <div className="md:hidden mt-3 p-3 bg-white rounded-2xl border border-gray-light shadow-sm">
                <p className="font-poppins text-xs font-semibold text-gray mb-2 uppercase tracking-wide">Sort by</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={sortBy === opt.id}
                      onClick={() => { setSortBy(opt.id); setShowSort(false) }}
                      className="text-xs"
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 mb-5 md:mb-6">
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                active={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </Chip>
            ))}
          </div>

          {/* Results meta */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <p className="font-nunito text-gray text-sm">
              {loading ? "Loading kitchens..." : (
                <>
                  <span className="font-semibold text-dark">{results.length}</span>
                  {" "}kitchen{results.length !== 1 ? "s" : ""} found
                </>
              )}
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-28 sm:h-32 bg-gray-100" />
                  <div className="p-4 pt-10 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 md:py-24 px-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ChefHat size={32} className="text-primary" />
              </div>
              <h3 className="font-poppins font-semibold text-dark text-lg">No kitchens found</h3>
              <p className="font-nunito text-gray text-sm mt-2 max-w-sm mx-auto">
                {kitchens.length === 0
                  ? "No approved kitchens are live yet. Check back soon!"
                  : "Try a different search term or clear your filters."}
              </p>
              {(query || activeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setActiveFilter("all") }}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-poppins font-semibold cursor-pointer hover:bg-primary-dark transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 lg:gap-6"
            >
              {results.map((kitchen, i) => (
                <motion.div
                  key={kitchen.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <KitchenCard
                    kitchen={kitchen}
                    onClick={() => navigate(`/kitchen/${kitchen.id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
