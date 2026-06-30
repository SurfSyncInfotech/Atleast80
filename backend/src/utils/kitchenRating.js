export const MIN_RATINGS_TO_SHOW = 10

/** Subquery — works even before migrate:v19 adds rating_count column */
export const SQL_RATING_COUNT = `(SELECT COUNT(*) FROM order_reviews r WHERE r.kitchen_id = k.id) AS rating_count`

export function getKitchenRatingStats(kitchen) {
  const count = Number(kitchen?.rating_count ?? kitchen?.ratingCount) || 0
  const avg = Number(kitchen?.rating) || 0
  const visible = count >= MIN_RATINGS_TO_SHOW

  return {
    ratingCount: count,
    rating: visible ? avg : null,
    ratingVisible: visible,
    ratingsNeeded: visible ? 0 : Math.max(0, MIN_RATINGS_TO_SHOW - count),
  }
}

export function withPublicRating(kitchen) {
  if (!kitchen) return kitchen
  const stats = getKitchenRatingStats(kitchen)
  return {
    ...kitchen,
    rating_count: stats.ratingCount,
    rating: stats.rating,
    ratingVisible: stats.ratingVisible,
    ratingsNeeded: stats.ratingsNeeded,
  }
}

export function withPublicRatings(kitchens) {
  return (kitchens || []).map(withPublicRating)
}
