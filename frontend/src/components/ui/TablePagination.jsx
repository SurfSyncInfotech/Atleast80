import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"
import { DEFAULT_PAGE_SIZES } from "../../lib/pagination"

export default function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  className,
  compact = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

  if (total === 0) return null

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#e8e8e8] bg-[#fafafa]",
        className
      )}
    >
      <div className="flex items-center gap-2 font-nunito text-xs text-[#696969]">
        {!compact && onPageSizeChange && (
          <>
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-[#e8e8e8] bg-white text-xs cursor-pointer"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </>
        )}
        <span className={cn(!compact && onPageSizeChange && "ml-1")}>
          {start}–{end} of {total}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="p-2 rounded-md bg-white border border-[#e8e8e8] hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 font-poppins text-xs text-[#696969] min-w-[72px] text-center">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="p-2 rounded-md bg-white border border-[#e8e8e8] hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
