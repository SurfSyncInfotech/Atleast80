const DEFAULT_KITCHEN_IMAGE =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"

export function toKitchenCard(kitchen) {
  const logo = kitchen.image || null
  const cover = kitchen.cover_image || null
  return {
    id: kitchen.id,
    name: kitchen.name,
    image: logo || DEFAULT_KITCHEN_IMAGE,
    logo,
    cover,
    city: kitchen.city || "",
    state: kitchen.state || "",
    speciality: kitchen.speciality || "",
    rating: Number(kitchen.rating) || 4.5,
    deliveryTime: kitchen.delivery_time || "30 min",
    hygieneScore: kitchen.hygiene_score || 0,
    hygieneVerified: (kitchen.hygiene_score || 0) >= 80,
    offer: kitchen.offer,
    bestItem: kitchen.best_item,
    kitchenType: kitchen.kitchen_type || "veg",
    festivalOffer: kitchen.festivalOffer?.active ? kitchen.festivalOffer : null,
    festival_offer_enabled: kitchen.festival_offer_enabled,
    festival_offer_title: kitchen.festival_offer_title,
    festival_offer_category: kitchen.festival_offer_category,
    festival_offer_discount_percent: kitchen.festival_offer_discount_percent,
    festival_offer_image: kitchen.festival_offer_image,
  }
}
