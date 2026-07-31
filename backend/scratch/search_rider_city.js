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
      if (file !== "node_modules" && file !== "dist" && file !== ".git") {
        searchDir(fullPath, query)
      }
    } else {
      if (file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".ts") || file.endsWith(".tsx")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8")
          if (content.includes(query)) {
            console.log(`Found "${query}" in: ${fullPath}`)
          }
        } catch (e) {}
      }
    }
  })
}

console.log("=== Searching Rider Files for city ===")
searchDir("../mobile/src/app/(rider)", "city")
searchDir("../mobile/src/app/(rider)", "City")
process.exit(0)
