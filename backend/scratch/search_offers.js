import fs from "fs"
import path from "path"

function searchDir(dir, query) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`)
    return
  }
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
            console.log(`Found "${query}" in: ${fullPath}`)
          }
        } catch (e) {}
      }
    }
  })
}

console.log("=== Searching Frontend ===")
searchDir("../frontend/src", "offer")
console.log("=== Searching Mobile ===")
searchDir("../mobile/src", "offer")
process.exit(0)
