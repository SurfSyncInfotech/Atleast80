export const DEFAULT_PAGE_SIZES = [10, 15, 20, 25, 50]

export function getPaginationMeta(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize
  const end = Math.min(start + pageSize, total)

  return { total, totalPages, page: safePage, pageSize, start, end }
}

export function paginateSlice(items, page, pageSize) {
  const meta = getPaginationMeta(items.length, page, pageSize)
  return {
    ...meta,
    items: items.slice(meta.start, meta.end),
  }
}
