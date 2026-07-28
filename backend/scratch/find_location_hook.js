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
      searchDir(fullPath, query)
    } else {
      if (file.endsWith(".jsx") || file.endsWith(".js") || file.endsWith(".tsx") || file.endsWith(".ts")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8")
          if (content.toLowerCase().includes(query.toLowerCase())) {
            console.log(`Found "${query}" in: ${fullPath}`)
          }
        } catch (e) {}
      }
    }
  })
}

searchDir("../frontend/src", "useLocationPreference")
process.exit(0)
