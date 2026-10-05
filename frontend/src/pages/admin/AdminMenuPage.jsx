import { useEffect, useState, useCallback, useMemo } from "react"
import {
  UtensilsCrossed, CheckCircle, XCircle, ChevronDown, Store, Trash2, MessageSquare, Pencil, Check, ShieldCheck,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import Chip from "../../components/common/Chip"
import MenuItemDetailModal from "../../components/common/MenuItemDetailModal"
import TablePagination from "../../components/ui/TablePagination"
import { api } from "../../lib/api"
import { resolveMediaUrl, resolveMenuItemMedia } from "../../lib/media"
import { paginateSlice } from "../../lib/pagination"
import { cn } from "../../lib/utils"

const FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
]

const TABLE_HEADERS = ["Item", "Category", "Packaging / GST", "Type", "Price", "Submitted", "Status", "Availability", "Admin comment", "Actions"]

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full capitalize",
        status === "approved"
          ? "bg-emerald-100 text-emerald-700"
          : status === "rejected"
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-800"
      )}
    >
      {status}
    </span>
  )
}

function AdminEditModal({ item, saving, onClose, onSubmit }) {
  if (!item) return null

  const pkgType = item.packaging_type || item.packagingType || "packaged"
  const defaultGst = item.category === "grocery" ? (pkgType === "loose" ? 0 : 5) : 18

  const [name, setName] = useState(item.name || "")
  const [localName, setLocalName] = useState(item.local_name || item.localName || "")
  const [price, setPrice] = useState(String(item.price || ""))
  const [category, setCategory] = useState(item.category || "food")
  const [packagingType, setPackagingType] = useState(pkgType)
  const [gstRate, setGstRate] = useState(Number(item.gst_rate !== undefined && item.gst_rate !== null ? item.gst_rate : (item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : defaultGst)))

  const handleCategoryChange = (newCat) => {
    setCategory(newCat)
    if (newCat === "grocery") {
      setGstRate(packagingType === "loose" ? 0 : 5)
    } else {
      setGstRate(18)
    }
  }

  const handlePackagingChange = (newPkg) => {
    setPackagingType(newPkg)
    if (category === "grocery") {
      setGstRate(newPkg === "loose" ? 0 : 5)
    }
  }

  const handleSubmit = (autoApprove = false) => {
    const finalGstRate = category === "grocery" ? (packagingType === "loose" ? 0 : 5) : 18
    onSubmit({
      id: item.id,
      name: name.trim(),
      localName: localName.trim() || null,
      price: Number(price),
      category,
      packagingType,
      gstRate: finalGstRate,
      autoApprove,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-poppins font-bold text-lg text-dark">Edit & Verify Item</h3>
            <p className="font-nunito text-xs text-gray">Verify GST tax tiers, local name & item details</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray cursor-pointer">
            ✕
          </button>
        </div>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-poppins font-semibold text-dark block mb-1">Item Title (English)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-nunito focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-poppins font-semibold text-dark block mb-1">Local / Hindi Title</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="e.g. दाल मखनी / चीनी"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-nunito focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-poppins font-semibold text-dark block mb-1">Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-nunito focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-poppins font-semibold text-dark block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-nunito focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="food">Food</option>
                <option value="grocery">Grocery / Ration</option>
              </select>
            </div>
          </div>

          {category === "grocery" && (
            <div>
              <label className="text-xs font-poppins font-semibold text-dark block mb-1">Packaging Type</label>
              <div className="flex gap-2">
                {[
                  { id: "packaged", label: "Packaged / Branded" },
                  { id: "loose", label: "Loose / Raw" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePackagingChange(p.id)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-xs font-poppins font-medium cursor-pointer transition-colors",
                      packagingType === p.id
                        ? p.id === "loose"
                          ? "border-slate-600 bg-slate-50 text-slate-900 font-bold"
                          : "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                        : "border-gray-200 text-gray hover:bg-gray-50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === "grocery" && (
            packagingType === "loose" ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-poppins font-semibold text-slate-900">Grocery GST Tax Rate</span>
                <span className="text-xs font-poppins font-bold bg-slate-700 text-white px-2.5 py-0.5 rounded-full">
                  0% (Exempted / Zero GST)
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-poppins font-semibold text-emerald-950">Grocery GST Tax Rate</span>
                <span className="text-xs font-poppins font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                  5% (Standard Fixed)
                </span>
              </div>
            )
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-gray-200 font-poppins text-xs font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-primary text-primary font-poppins text-xs font-bold hover:bg-primary/5 cursor-pointer disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white font-poppins text-xs font-bold hover:bg-primary-dark cursor-pointer disabled:opacity-50 shadow-sm"
            >
              Save & Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionModal({ modal, comment, setComment, saving, onClose, onSubmit }) {
  if (!modal) return null

  const titles = {
    reject: "Reject menu item",
    comment: "Admin comment",
    delete: "Delete menu item",
  }

  const descriptions = {
    reject: "This comment will be shown to the kitchen seller on their menu page.",
    comment: "Leave feedback for the kitchen seller about this menu item.",
    delete: "The item will be permanently removed. An optional comment can be sent to the kitchen seller as an alert.",
  }

  const submitLabels = {
    reject: "Reject item",
    comment: "Save comment",
    delete: "Delete item",
  }

  const requireComment = modal.mode === "reject" || modal.mode === "comment"

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-poppins font-bold text-lg text-[#1c1c1c]">{titles[modal.mode]}</h3>
        <p className="font-nunito text-[#696969] text-sm mt-1">{descriptions[modal.mode]}</p>
        {modal.itemName && (
          <p className="font-poppins font-semibold text-sm text-[#1c1c1c] mt-3">{modal.itemName}</p>
        )}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            modal.mode === "delete"
              ? "Optional note for the kitchen seller..."
              : "Image quality issue, wrong pricing, missing details..."
          }
          className="w-full mt-4 px-4 py-3 bg-[#f8f8f8] rounded-lg border border-[#e8e8e8] focus:outline-none focus:border-primary font-nunito text-sm min-h-[100px] resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg border border-[#e8e8e8] font-poppins text-sm font-medium cursor-pointer hover:bg-[#fafafa] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || (requireComment && !comment.trim())}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-white font-poppins text-sm font-semibold cursor-pointer disabled:opacity-50",
              modal.mode === "delete" ? "bg-red-600 hover:bg-red-700" : modal.mode === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"
            )}
          >
            {saving ? "Saving..." : submitLabels[modal.mode]}
          </button>
        </div>
      </div>
    </div>
  )
}

function KitchenMenuTable({
  kitchen,
  actionId,
  expanded,
  onToggle,
  onApprove,
  onEditItem,
  onOpenModal,
  onViewItem,
  onToggleAvailability,
}) {
  const [itemPage, setItemPage] = useState(1)
  const [itemPageSize, setItemPageSize] = useState(10)

  const paginatedItems = useMemo(
    () => paginateSlice(kitchen.items, itemPage, itemPageSize),
    [kitchen.items, itemPage, itemPageSize]
  )

  useEffect(() => {
    setItemPage(1)
  }, [kitchen.id, kitchen.items.length])

  useEffect(() => {
    if (itemPage > paginatedItems.totalPages) setItemPage(paginatedItems.totalPages)
  }, [itemPage, paginatedItems.totalPages])

  const cover = resolveMediaUrl(kitchen.coverImage)

  return (
    <section className="bg-white border border-[#e8e8e8] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-[#fafafa] transition-colors border-b border-[#f0f0f0]"
      >
        <div className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0 border border-[#e8e8e8]">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray">
              <Store size={18} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-poppins font-semibold text-sm text-[#1c1c1c]">{kitchen.name}</h2>
            <span className="text-[10px] font-poppins font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {kitchen.items.length} item{kitchen.items.length === 1 ? "" : "s"}
            </span>
            {kitchen.pendingCount > 0 && (
              <span className="text-[10px] font-poppins font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {kitchen.pendingCount} pending
              </span>
            )}
          </div>
          <p className="font-nunito text-xs text-[#999] mt-0.5">
            {kitchen.ownerName ? `${kitchen.ownerName} · ` : ""}
            {kitchen.city || "City not set"}
          </p>
        </div>

        <ChevronDown
          size={18}
          className={cn("text-[#999] flex-shrink-0 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 font-poppins text-[11px] font-semibold text-[#696969] uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.items.map((item) => {
                const thumb = resolveMediaUrl(item.image || item.images?.[0])
                const status = item.approvalStatus || item.approval_status || "pending"
                const category = item.category === "grocery" ? "Grocery" : "Food"
                const itemType = item.item_type === "non_veg" ? "Non-veg" : "Veg"
                const localName = item.local_name || item.localName
                const isGrocery = item.category === "grocery"
                const packaging = item.packaging_type || item.packagingType || "packaged"
                const defaultGst = isGrocery ? (packaging === "loose" ? 0 : 5) : 5
                const gstRate = item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : defaultGst)
                const adminComment = item.reviewComment || item.review_comment
                const isAvail = item.is_available === 1 || item.is_available === true || item.isAvailable === true

                return (
                  <tr key={item.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => onViewItem(item, kitchen)}
                          className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0 border border-[#eee] rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                          aria-label={`View ${item.name}`}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#bbb] font-nunito">
                              —
                            </div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewItem(item, kitchen)}
                            className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate text-left hover:text-primary cursor-pointer block"
                          >
                            {item.name}
                          </button>
                          {localName && (
                            <p className="font-nunito text-[11px] text-gray-500 truncate">{localName}</p>
                          )}
                          {item.description && (
                            <p className="font-nunito text-xs text-[#999] truncate max-w-[220px]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">{category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex text-[10px] font-poppins font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize w-fit">
                          {packaging}
                        </span>
                        <span className={cn(
                          "inline-flex text-[10px] font-poppins font-bold px-2 py-0.5 rounded border w-fit",
                          gstRate === 0
                            ? "bg-slate-50 text-slate-700 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        )}>
                          GST: {gstRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">{itemType}</td>
                    <td className="px-4 py-3 font-poppins font-semibold text-sm text-primary whitespace-nowrap">
                      ₹{Number(item.price)}
                    </td>
                    <td className="px-4 py-3 font-nunito text-xs text-[#696969] whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleAvailability(item)}
                          disabled={actionId === item.id}
                          className={cn(
                            "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                            isAvail ? "bg-emerald-500" : "bg-gray-300"
                          )}
                          title={isAvail ? "Click to mark as unavailable" : "Click to mark as available"}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              isAvail ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                        <span className={cn("text-xs font-nunito font-semibold", isAvail ? "text-emerald-700" : "text-gray-400")}>
                          {isAvail ? "Available" : "Disabled"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {adminComment ? (
                        <p className="font-nunito text-xs text-[#363636] line-clamp-2" title={adminComment}>
                          {adminComment}
                        </p>
                      ) : (
                        <span className="font-nunito text-xs text-[#bbb]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        {status === "pending" && (
                          <button
                            type="button"
                            onClick={() => onApprove(item.id)}
                            disabled={actionId === item.id}
                            title="Approve"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-white text-[11px] font-poppins font-semibold hover:bg-primary-dark cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle size={12} />
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          title="Edit & Verify GST"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-poppins font-semibold hover:bg-emerald-100 cursor-pointer"
                        >
                          <Pencil size={11} />
                          Edit / GST
                        </button>
                        {status === "pending" && (
                          <button
                            type="button"
                            onClick={() => onOpenModal("reject", item)}
                            disabled={actionId === item.id}
                            title="Reject"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-600 text-[11px] font-poppins font-semibold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenModal("comment", item, adminComment)}
                          disabled={actionId === item.id}
                          title="Comment"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#e8e8e8] text-[#363636] text-[11px] font-poppins font-semibold hover:bg-[#fafafa] cursor-pointer disabled:opacity-50"
                        >
                          <MessageSquare size={12} />
                          Comment
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenModal("delete", item)}
                          disabled={actionId === item.id}
                          title="Delete"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-600 text-[11px] font-poppins font-semibold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <TablePagination
            page={paginatedItems.page}
            pageSize={itemPageSize}
            total={paginatedItems.total}
            onPageChange={setItemPage}
            onPageSizeChange={(size) => { setItemPageSize(size); setItemPage(1) }}
            compact={kitchen.items.length <= 10}
          />
        </div>
      )}
    </section>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-white border border-[#e8e8e8] overflow-hidden">
      <div className="h-14 bg-[#fafafa] border-b border-[#e8e8e8] animate-pulse" />
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function AdminMenuPage() {
  const [kitchens, setKitchens] = useState([])
  const [filter, setFilter] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [modal, setModal] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [kitchenPage, setKitchenPage] = useState(1)
  const [kitchenPageSize, setKitchenPageSize] = useState(10)

  const paginatedKitchens = useMemo(
    () => paginateSlice(kitchens, kitchenPage, kitchenPageSize),
    [kitchens, kitchenPage, kitchenPageSize]
  )

  useEffect(() => {
    setKitchenPage(1)
  }, [filter])

  useEffect(() => {
    if (kitchenPage > paginatedKitchens.totalPages) setKitchenPage(paginatedKitchens.totalPages)
  }, [kitchenPage, paginatedKitchens.totalPages])

  const load = useCallback((showSkeleton = true) => {
    if (showSkeleton) setLoading(true)
    const params = filter ? `?status=${filter}` : ""
    api(`/api/admin/menu${params}`, {}, "admin")
      .then((d) => {
        const list = d.kitchens || []
        setKitchens(list)
        setExpandedIds((prev) => {
          if (prev.size === 0) return new Set(list.map((k) => k.id))
          const next = new Set(prev)
          list.forEach((k) => {
            if (!prev.has(k.id) && k.pendingCount > 0) next.add(k.id)
          })
          return next
        })
      })
      .catch(() => {
        if (showSkeleton) {
          setKitchens([])
          setExpandedIds(new Set())
        }
      })
      .finally(() => {
        if (showSkeleton) setLoading(false)
      })
  }, [filter])

  useEffect(() => {
    load(true)
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!editItem && !modal && !saving && !actionId) {
        load(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [load, editItem, modal, saving, actionId])

  const toggleKitchen = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const closeModal = () => {
    setModal(null)
    setComment("")
    setSaving(false)
  }

  const openModal = (mode, item, existingComment = "") => {
    setModal({ mode, itemId: item.id, itemName: item.name })
    setComment(existingComment || "")
  }

  const handleViewItem = (item, kitchen) => {
    setSelectedItem(
      resolveMenuItemMedia({
        ...item,
        kitchen: kitchen.name,
        kitchen_name: kitchen.name,
      })
    )
  }

  const handleApprove = async (id) => {
    setActionId(id)
    try {
      await api(`/api/admin/menu/${id}/approve`, { method: "PATCH" }, "admin")
      load()
    } catch (err) {
      alert(err.message || "Failed to approve")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleAvailability = async (item) => {
    setActionId(item.id)
    try {
      const isAvail = item.is_available === 1 || item.is_available === true || item.isAvailable === true
      await api(`/api/admin/menu/${item.id}/toggle-availability`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !isAvail }),
      }, "admin")
      load()
    } catch (err) {
      alert(err.message || "Failed to update item availability")
    } finally {
      setActionId(null)
    }
  }

  const handleEditSubmit = async (payload) => {
    setSaving(true)
    try {
      await api(`/api/admin/menu/${payload.id}/edit`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, "admin")
      setEditItem(null)
      load()
    } catch (err) {
      alert(err.message || "Failed to update item")
    } finally {
      setSaving(false)
    }
  }

  const handleModalSubmit = async () => {
    if (!modal) return
    setSaving(true)
    setActionId(modal.itemId)

    try {
      if (modal.mode === "reject") {
        await api(`/api/admin/menu/${modal.itemId}/reject`, {
          method: "PATCH",
          body: JSON.stringify({ comment: comment.trim() }),
        }, "admin")
      } else if (modal.mode === "comment") {
        await api(`/api/admin/menu/${modal.itemId}/comment`, {
          method: "PATCH",
          body: JSON.stringify({ comment: comment.trim() }),
        }, "admin")
      } else if (modal.mode === "delete") {
        await api(`/api/admin/menu/${modal.itemId}`, {
          method: "DELETE",
          body: JSON.stringify({ comment: comment.trim() || null }),
        }, "admin")
      }
      closeModal()
      load()
    } catch (err) {
      alert(err.message || "Action failed")
      setSaving(false)
    } finally {
      setActionId(null)
    }
  }

  const totalItems = kitchens.reduce((sum, k) => sum + k.items.length, 0)

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <UtensilsCrossed size={22} className="text-primary" />
          <h1 className="font-poppins font-bold text-xl sm:text-2xl text-[#1c1c1c]">Menu approvals</h1>
        </div>
        <p className="font-nunito text-sm text-[#999] mb-6">
          Review menu items by kitchen. Verify GST tax tiers, edit details, approve or reject submissions.
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {FILTERS.map((f) => (
            <Chip key={f.id || "all"} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <TableSkeleton key={i} />
            ))}
          </div>
        ) : kitchens.length === 0 ? (
          <div className="bg-white border border-[#e8e8e8] p-12 text-center">
            <UtensilsCrossed size={36} className="text-[#ddd] mx-auto mb-3" />
            <p className="font-poppins font-medium text-[#1c1c1c]">No menu items found</p>
            <p className="font-nunito text-sm text-[#999] mt-1">Try a different filter</p>
          </div>
        ) : (
          <>
            <p className="font-nunito text-xs text-[#696969] mb-4">
              {kitchens.length} kitchen{kitchens.length === 1 ? "" : "s"} · {totalItems} menu item
              {totalItems === 1 ? "" : "s"}
            </p>
            <div className="space-y-4">
              {paginatedKitchens.items.map((kitchen) => (
                <KitchenMenuTable
                  key={kitchen.id}
                  kitchen={kitchen}
                  actionId={actionId}
                  expanded={expandedIds.has(kitchen.id)}
                  onToggle={() => toggleKitchen(kitchen.id)}
                  onApprove={handleApprove}
                  onEditItem={(item) => setEditItem(item)}
                  onOpenModal={openModal}
                  onViewItem={handleViewItem}
                  onToggleAvailability={handleToggleAvailability}
                />
              ))}
            </div>
            <div className="mt-4 bg-white border border-[#e8e8e8] overflow-hidden rounded-lg">
              <TablePagination
                page={paginatedKitchens.page}
                pageSize={kitchenPageSize}
                total={paginatedKitchens.total}
                onPageChange={setKitchenPage}
                onPageSizeChange={(size) => { setKitchenPageSize(size); setKitchenPage(1) }}
              />
            </div>
          </>
        )}
      </div>

      <ActionModal
        modal={modal}
        comment={comment}
        setComment={setComment}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <AdminEditModal
        item={editItem}
        saving={saving}
        onClose={() => setEditItem(null)}
        onSubmit={handleEditSubmit}
      />

      <MenuItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        adminView
      />
    </AdminLayout>
  )
}
