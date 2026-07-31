import fs from "fs"
import path from "path"

function searchDir(dir) {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const fullPath = path.join(dir, file)
    let stat
    try {
      stat = fs.statSync(fullPath)
    } catch (e) {
      return
    }
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== ".git") {
        searchDir(fullPath)
      }
    } else {
      if (file.endsWith(".js")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8")
          if (content.includes("5 * 60") || content.includes("300000") || content.includes("300 * 1000")) {
            console.log(`Found 5 min in: ${fullPath}`)
          }
        } catch (e) {}
      }
    }
  })
}

console.log("=== Searching Backend Folder ===")
searchDir("../backend/src")
process.exit(0)
