export const MIN_RATINGS_TO_SHOW = 10

export function toKitchenCard(kitchen) {
  const logo = kitchen.image || null
  const cover = kitchen.cover_image || null
  const count = Number(kitchen.rating_count ?? kitchen.ratingCount) || 0
  const visible = kitchen.ratingVisible ?? count >= MIN_RATINGS_TO_SHOW
  const rating = visible ? Number(kitchen.rating) || null : null

  return {
    id: kitchen.id,
    name: kitchen.name,
    image: logo || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    logo,
    cover,
    city: kitchen.city || "",
    state: kitchen.state || "",
    speciality: kitchen.speciality || "",
    rating,
    ratingVisible: visible,
    ratingCount: count,
    ratingsNeeded: visible ? 0 : Math.max(0, MIN_RATINGS_TO_SHOW - count),
    deliveryTime: kitchen.delivery_time || kitchen.deliveryTime || "30 min",
    offer: kitchen.offer,
    bestItem: kitchen.best_item || kitchen.bestItem,
    kitchenType: kitchen.kitchen_type || kitchen.kitchenType || "veg",
  }
}
