import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Plus, Minus, Play } from "lucide-react"
import { useCart } from "../../context/CartContext"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"

export default function MenuItemDetailModal({ item, onClose }) {
  const { addItem, removeItem, getItemQty } = useCart()
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (item) setActiveImage(0)
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [item, onClose])

  const images = (item?.images?.length ? item.images : item?.image ? [item.image] : [])
    .map(resolveMediaUrl)
    .filter(Boolean)
  const videos = (item?.videos || []).map(resolveMediaUrl).filter(Boolean)
  const displayImages = images.length > 0 ? images : [PLACEHOLDER]
  const qty = item ? getItemQty(item.id) : 0
  const isVeg = item?.itemType === "veg" || item?.item_type === "veg"

  const prevImage = () => setActiveImage((i) => (i === 0 ? displayImages.length - 1 : i - 1))
  const nextImage = () => setActiveImage((i) => (i === displayImages.length - 1 ? 0 : i + 1))

  return (
    <AnimatePresence>
      {item && (
      <motion.div
        key={item.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-lg lg:max-w-xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/40 hover:bg-black/55 text-white rounded-full flex items-center justify-center cursor-pointer backdrop-blur-sm transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Image gallery */}
          <div className="relative bg-gray-100 flex-shrink-0">
            <div className="aspect-[4/3] sm:aspect-[16/10] relative overflow-hidden">
              <img
                src={displayImages[activeImage]}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-white transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-white transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {displayImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all cursor-pointer",
                          i === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/50"
                        )}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-b border-gray-100">
                {displayImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden ring-2 cursor-pointer transition-all",
                      i === activeImage ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center",
                  isVeg ? "border-emerald-600" : "border-red-600"
                )}
              >
                <span className={cn("w-[7px] h-[7px] rounded-full", isVeg ? "bg-emerald-600" : "bg-red-600")} />
              </span>
              <span className="text-[10px] font-poppins font-semibold uppercase tracking-wider text-gray">
                {item.category === "grocery" ? "Ration" : "Food"}
              </span>
            </div>

            <h2 className="font-poppins font-bold text-dark text-xl sm:text-2xl leading-tight pr-8">
              {item.name}
            </h2>

            {item.description && (
              <p className="font-nunito text-gray text-sm mt-3 leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            )}

            {videos.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Play size={14} className="text-primary" />
                  <h3 className="font-poppins font-semibold text-dark text-sm">Videos</h3>
                </div>
                <div className="space-y-3">
                  {videos.map((src, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-black ring-1 ring-gray-100">
                      <video
                        src={src}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[240px] object-contain bg-black"
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.kitchen && (
              <p className="font-nunito text-xs text-gray mt-4">From {item.kitchen}</p>
            )}
          </div>

          {/* Footer — price + add to cart */}
          <div className="flex-shrink-0 border-t border-gray-100 p-4 sm:p-5 bg-white flex items-center justify-between gap-4">
            <p className="font-poppins font-bold text-dark text-xl">₹{Number(item.price)}</p>
            {qty > 0 ? (
              <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-primary cursor-pointer p-1"
                  aria-label="Decrease quantity"
                >
                  <Minus size={18} />
                </button>
                <span className="font-poppins font-bold text-primary text-base min-w-[20px] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => addItem(item)}
                  className="text-primary cursor-pointer p-1"
                  aria-label="Increase quantity"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addItem(item)}
                className="bg-primary text-white font-poppins font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Add to cart
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
