import fs from "fs"
import path from "path"

function searchDir(dir) {
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
      if (file !== "node_modules" && file !== ".git" && file !== "build" && file !== ".cxx") {
        searchDir(fullPath)
      }
    } else {
      if (file.endsWith(".xml") || file.endsWith(".json") || file.endsWith(".gradle") || file.endsWith(".java") || file.endsWith(".kt")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8")
          if (content.includes("splashscreen_logo")) {
            console.log(`Found in: ${fullPath}`)
          }
        } catch (e) {}
      }
    }
  })
}

searchDir("android")
process.exit(0)
