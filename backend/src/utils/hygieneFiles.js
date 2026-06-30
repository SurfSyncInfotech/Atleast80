import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const HYGIENE_UPLOADS_DIR = path.join(__dirname, "../../uploads/hygiene")

export function removeHygieneFile(mediaUrl) {
  if (!mediaUrl || typeof mediaUrl !== "string") return

  try {
    const marker = "/uploads/hygiene/"
    const idx = mediaUrl.indexOf(marker)
    const filename = idx >= 0 ? mediaUrl.slice(idx + marker.length) : path.basename(mediaUrl)
    const filePath = path.join(HYGIENE_UPLOADS_DIR, path.basename(filename))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (error) {
    console.warn("Could not delete hygiene file:", error.message)
  }
}
