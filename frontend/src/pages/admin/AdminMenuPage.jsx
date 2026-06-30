import { useEffect, useState, useCallback } from "react"
import {
  UtensilsCrossed, CheckCircle, XCircle, ChevronDown, Store, Trash2, MessageSquare,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import Chip from "../../components/common/Chip"
import MenuItemDetailModal from "../../components/common/MenuItemDetailModal"
import { api } from "../../lib/api"
import { resolveMediaUrl, resolveMenuItemMedia } from "../../lib/media"
import { cn } from "../../lib/utils"

const FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
]

const TABLE_HEADERS = ["Item", "Category", "Type", "Price", "Submitted", "Status", "Admin comment", "Actions"]

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
  onOpenModal,
  onViewItem,
}) {
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
              {kitchen.items.map((item) => {
                const thumb = resolveMediaUrl(item.image || item.images?.[0])
                const status = item.approvalStatus || item.approval_status || "pending"
                const category = item.category === "grocery" ? "Grocery" : "Food"
                const itemType = item.item_type === "non_veg" ? "Non-veg" : "Veg"
                const adminComment = item.reviewComment || item.review_comment

                return (
                  <tr key={item.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => onViewItem(item, kitchen)}
                          className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0 border border-[#eee] cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
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
                            className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate text-left hover:text-primary cursor-pointer"
                          >
                            {item.name}
                          </button>
                          {item.description && (
                            <p className="font-nunito text-xs text-[#999] truncate max-w-[220px]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">{category}</td>
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
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = filter ? `?status=${filter}` : ""
    api(`/api/admin/menu${params}`, {}, "admin")
      .then((d) => {
        const list = d.kitchens || []
        setKitchens(list)
        setExpandedIds(new Set(list.map((k) => k.id)))
      })
      .catch(() => {
        setKitchens([])
        setExpandedIds(new Set())
      })
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

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
          Review menu items by kitchen. Reject or comment to send feedback to the seller.
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
              {kitchens.map((kitchen) => (
                <KitchenMenuTable
                  key={kitchen.id}
                  kitchen={kitchen}
                  actionId={actionId}
                  expanded={expandedIds.has(kitchen.id)}
                  onToggle={() => toggleKitchen(kitchen.id)}
                  onApprove={handleApprove}
                  onOpenModal={openModal}
                  onViewItem={handleViewItem}
                />
              ))}
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

      <MenuItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        adminView
      />
    </AdminLayout>
  )
}
