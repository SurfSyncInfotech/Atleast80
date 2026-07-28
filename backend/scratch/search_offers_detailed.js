import fs from "fs"
import path from "path"

function searchDir(dir, query) {
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
      if (file !== "node_modules" && file !== ".git" && file !== "build" && file !== ".cxx" && file !== ".expo") {
        searchDir(fullPath, query)
      }
    } else {
      if (file.endsWith(".jsx") || file.endsWith(".js") || file.endsWith(".tsx") || file.endsWith(".ts")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8")
          if (content.toLowerCase().includes(query.toLowerCase())) {
            const lines = content.split("\n")
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                console.log(`${fullPath}:${idx + 1}: ${line.trim()}`)
              }
            })
          }
        } catch (e) {}
      }
    }
  })
}

console.log("=== Searching Frontend for 'offers' ===")
searchDir("../frontend/src", "offers")
console.log("=== Searching Mobile for 'offers' ===")
searchDir("../mobile/src", "offers")
process.exit(0)
