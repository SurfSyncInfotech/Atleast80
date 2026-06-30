import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, "../../uploads/menu")
export const KITCHEN_UPLOADS_DIR = path.join(__dirname, "../../uploads/kitchen")
export const STORIES_UPLOADS_DIR = path.join(__dirname, "../../uploads/stories")
export const HYGIENE_UPLOADS_DIR = path.join(__dirname, "../../uploads/hygiene")
export const QUOTATION_UPLOADS_DIR = path.join(__dirname, "../../uploads/quotations")

for (const dir of [UPLOADS_DIR, KITCHEN_UPLOADS_DIR, STORIES_UPLOADS_DIR, HYGIENE_UPLOADS_DIR, QUOTATION_UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const FSSAI_TYPES = [...IMAGE_TYPES, "application/pdf"]

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin"
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`
    cb(null, safe)
  },
})

function fileFilter(_req, file, cb) {
  const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Only images (JPG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed"))
  }
}

export const menuUpload = multer({
  storage,
  fileFilter,
})

export function getPublicBaseUrl(req) {
  const fromEnv = process.env.PUBLIC_API_URL?.replace(/\/$/, "")
  if (fromEnv) return fromEnv
  const proto = (req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim()
  return `${proto}://${req.get("host")}`
}

export function getPublicFileUrl(req, filename) {
  return `${getPublicBaseUrl(req)}/uploads/menu/${filename}`
}

const kitchenLogoStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, KITCHEN_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

function imageOnlyFilter(_req, file, cb) {
  if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true)
  else cb(new Error("Only JPG, PNG, WebP, or GIF images are allowed"))
}

export const kitchenLogoUpload = multer({
  storage: kitchenLogoStorage,
  fileFilter: imageOnlyFilter,
})

const kitchenCoverStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, KITCHEN_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `cover-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

export const kitchenCoverUpload = multer({
  storage: kitchenCoverStorage,
  fileFilter: imageOnlyFilter,
})

const fssaiLicenseStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, KITCHEN_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf"
    cb(null, `fssai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

function fssaiLicenseFilter(_req, file, cb) {
  if (FSSAI_TYPES.includes(file.mimetype)) cb(null, true)
  else cb(new Error("FSSAI license must be JPG, PNG, WebP, GIF, or PDF"))
}

export const fssaiLicenseUpload = multer({
  storage: fssaiLicenseStorage,
  fileFilter: fssaiLicenseFilter,
})

export function getKitchenFileUrl(req, filename) {
  return `${getPublicBaseUrl(req)}/uploads/kitchen/${filename}`
}

export function getKitchenLogoUrl(req, filename) {
  return getKitchenFileUrl(req, filename)
}

export function isImageMime(mime) {
  return IMAGE_TYPES.includes(mime)
}

export function isVideoMime(mime) {
  return VIDEO_TYPES.includes(mime)
}

const storyStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, STORIES_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin"
    cb(null, `story-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

export const storyUpload = multer({
  storage: storyStorage,
  fileFilter,
})

export function getStoryFileUrl(req, filename) {
  return `${getPublicBaseUrl(req)}/uploads/stories/${filename}`
}

const hygieneStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, HYGIENE_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".webm"
    cb(null, `hygiene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

function videoOnlyFilter(_req, file, cb) {
  if (VIDEO_TYPES.includes(file.mimetype)) cb(null, true)
  else cb(new Error("Only video files (MP4, WebM, MOV) are allowed for hygiene checks"))
}

export const hygieneVideoUpload = multer({
  storage: hygieneStorage,
  fileFilter: videoOnlyFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
})

export function getHygieneFileUrl(req, filename) {
  return `${getPublicBaseUrl(req)}/uploads/hygiene/${filename}`
}

const quotationStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, QUOTATION_UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf"
    cb(null, `quote-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})

function quotationFileFilter(_req, file, cb) {
  if (FSSAI_TYPES.includes(file.mimetype)) cb(null, true)
  else cb(new Error("Quotation must be JPG, PNG, WebP, GIF, or PDF"))
}

export const quotationUpload = multer({
  storage: quotationStorage,
  fileFilter: quotationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})

export function getQuotationFileUrl(req, filename) {
  return `${getPublicBaseUrl(req)}/uploads/quotations/${filename}`
}
