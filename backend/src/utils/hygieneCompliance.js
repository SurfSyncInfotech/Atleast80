import { removeHygieneFile } from "./hygieneFiles.js"

export const HYGIENE_AREA = "daily_check"

export const HYGIENE_AREA_LABEL = "Daily kitchen check"

/** @deprecated kept for legacy rows */
export const HYGIENE_AREAS = [HYGIENE_AREA]

export const HYGIENE_AREA_LABELS = {
  daily_check: HYGIENE_AREA_LABEL,
  washing_area: "Washing area",
  fridge: "Refrigerator",
  cooking_area: "Cooking area",
}

export const HYGIENE_WINDOW_MS = 24 * 60 * 60 * 1000

export const HYGIENE_EXPIRED_MESSAGE =
  "Your daily hygiene video has expired and was removed. Please record and upload a new video."

export async function purgeExpiredHygieneVideos(pool, kitchenId) {
  const cutoff = new Date(Date.now() - HYGIENE_WINDOW_MS)

  const [rows] = await pool.query(
    `SELECT id, media_url AS mediaUrl
     FROM hygiene_checks
     WHERE kitchen_id = ? AND area = ? AND recorded_at <= ?`,
    [kitchenId, HYGIENE_AREA, cutoff]
  )

  for (const row of rows) {
    await pool.query("DELETE FROM hygiene_checks WHERE id = ?", [row.id])
    removeHygieneFile(row.mediaUrl)
  }

  return rows.length
}

export async function getHygieneCompliance(pool, kitchenId) {
  await purgeExpiredHygieneVideos(pool, kitchenId)

  const [videoRows] = await pool.query(
    `SELECT id, media_url AS mediaUrl, recorded_at AS recordedAt
     FROM hygiene_checks
     WHERE kitchen_id = ? AND area = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [kitchenId, HYGIENE_AREA]
  )

  const latestRow = videoRows[0] || null
  const latest = latestRow?.recordedAt || null
  const cutoff = new Date(Date.now() - HYGIENE_WINDOW_MS)
  const uploaded = Boolean(latest && new Date(latest) > cutoff)

  const area = {
    area: HYGIENE_AREA,
    label: HYGIENE_AREA_LABEL,
    latest,
    uploaded,
  }

  return {
    compliant: uploaded,
    latest,
    uploaded,
    requiresUpload: !uploaded,
    uploadMessage: uploaded ? null : HYGIENE_EXPIRED_MESSAGE,
    areas: [area],
    video: latestRow
      ? {
          id: latestRow.id,
          mediaUrl: latestRow.mediaUrl,
          recordedAt: latestRow.recordedAt,
        }
      : null,
  }
}

export async function isKitchenPubliclyVisible(pool, kitchen) {
  if (!kitchen || kitchen.status !== "approved") return false

  const { compliant } = await getHygieneCompliance(pool, kitchen.id)
  if (compliant) return true

  if (kitchen.reviewed_at) {
    const reviewedAt = new Date(kitchen.reviewed_at)
    if (Date.now() - reviewedAt.getTime() < HYGIENE_WINDOW_MS) return true
  }

  return false
}

export async function getVisibleApprovedKitchenIds(pool) {
  const [kitchens] = await pool.query(
    "SELECT id, status, reviewed_at FROM kitchens WHERE status = 'approved'"
  )

  const ids = []
  for (const k of kitchens) {
    if (await isKitchenPubliclyVisible(pool, k)) ids.push(k.id)
  }
  return ids
}
