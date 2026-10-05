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
    `SELECT id, media_url AS mediaUrl, recorded_at AS recordedAt, status, rejection_reason AS rejectionReason
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
  const status = latestRow?.status || "missing"

  const isApproved = Boolean(uploaded && status === "approved")
  const isPending = Boolean(uploaded && status === "pending")
  const isRejected = Boolean(uploaded && status === "rejected")

  const area = {
    area: HYGIENE_AREA,
    label: HYGIENE_AREA_LABEL,
    latest,
    uploaded,
    status,
  }

  let uploadMessage = null
  if (!uploaded) {
    uploadMessage = HYGIENE_EXPIRED_MESSAGE
  } else if (isPending) {
    uploadMessage = "Daily hygiene video uploaded! Waiting for Admin verification and approval."
  } else if (isRejected) {
    uploadMessage = `Daily video rejected by Admin (${latestRow?.rejectionReason || "Video does not match kitchen setup"}). Please re-upload a clear video.`
  }

  return {
    compliant: isApproved,
    isApproved,
    isPending,
    isRejected,
    status,
    rejectionReason: latestRow?.rejectionReason || null,
    latest,
    uploaded,
    requiresUpload: !uploaded || isRejected,
    uploadMessage,
    areas: [area],
    video: latestRow
      ? {
          id: latestRow.id,
          mediaUrl: latestRow.mediaUrl,
          recordedAt: latestRow.recordedAt,
          status: latestRow.status,
          rejectionReason: latestRow.rejectionReason,
        }
      : null,
  }
}

export async function isKitchenPubliclyVisible(pool, kitchen) {
  if (!kitchen || kitchen.status !== "approved") return false
  if (kitchen.is_active === 0 || kitchen.is_active === false) return false

  const visibility = kitchen.visibility_status || "auto"
  if (visibility === "hidden") return false
  if (visibility === "visible") return true

  const { compliant } = await getHygieneCompliance(pool, kitchen.id)
  if (compliant) return true

  return false
}

export async function getKitchenVisibilityInfo(pool, kitchen) {
  const compliance = await getHygieneCompliance(pool, kitchen.id)
  const publiclyVisible = await isKitchenPubliclyVisible(pool, kitchen)
  return {
    hygieneCompliant: compliance.compliant,
    dailyVideoStatus: compliance.status,
    isPendingHygiene: compliance.isPending,
    isRejectedHygiene: compliance.isRejected,
    rejectionReason: compliance.rejectionReason,
    dailyVideoUrl: compliance.video?.mediaUrl || null,
    hygieneLatest: compliance.latest,
    requiresUpload: compliance.requiresUpload,
    publiclyVisible,
    visibilityStatus: kitchen.visibility_status || "auto",
  }
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
