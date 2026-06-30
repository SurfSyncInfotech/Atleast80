import { Pencil, Trash2, MessageSquare } from "lucide-react"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const HEADERS = ["Item", "Category", "Type", "Price", "Status", "Admin comment", "Actions"]

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function MenuStatusBadge({ status }) {
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
      {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"}
    </span>
  )
}

export default function KitchenMenuTable({
  items,
  deletingId,
  onComment,
  onEdit,
  onDelete,
  onToggleAvailability,
}) {
  if (!items.length) return null

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
            {HEADERS.map((h) => (
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
          {items.map((item) => {
            const thumb = resolveMediaUrl(item.image || item.images?.[0])
            const status = item.approvalStatus || item.approval_status || "pending"
            const adminComment = item.reviewComment || item.review_comment
            const category = item.category === "grocery" ? "Grocery" : "Food"
            const itemType = item.item_type === "non_veg" ? "Non-veg" : "Veg"

            return (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors",
                  !item.is_available && "opacity-70"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0 border border-[#eee]">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#bbb] font-nunito">—</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-poppins font-semibold text-sm text-[#1c1c1c] truncate">{item.name}</p>
                      <p className="font-nunito text-[11px] text-[#999]">{formatDate(item.created_at)}</p>
                      {!item.is_available && (
                        <span className="text-[10px] font-poppins font-semibold text-gray-500">Unavailable</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">{category}</td>
                <td className="px-4 py-3 font-nunito text-sm text-[#363636] whitespace-nowrap">{itemType}</td>
                <td className="px-4 py-3 font-poppins font-semibold text-sm text-primary whitespace-nowrap">
                  ₹{Number(item.price)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <MenuStatusBadge status={status} />
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onComment?.(item)}
                      disabled={!adminComment}
                      title="View admin comment"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#e8e8e8] text-[#363636] text-[11px] font-poppins font-semibold hover:bg-[#fafafa] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageSquare size={12} />
                      Comment
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(item)}
                      title="Edit item"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#e8e8e8] text-[#363636] text-[11px] font-poppins font-semibold hover:bg-[#fafafa] cursor-pointer"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    {onToggleAvailability && (
                      <button
                        type="button"
                        onClick={() => onToggleAvailability(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#e8e8e8] text-[#363636] text-[11px] font-poppins font-semibold hover:bg-[#fafafa] cursor-pointer"
                      >
                        {item.is_available ? "Disable" : "Enable"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete?.(item)}
                      disabled={deletingId === item.id}
                      title="Delete item"
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
  )
}
