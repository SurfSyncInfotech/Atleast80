import fs from "fs"
import path from "path"

function findFiles(dir, nameQuery) {
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
        findFiles(fullPath, nameQuery)
      }
    } else {
      if (file.toLowerCase().includes(nameQuery.toLowerCase())) {
        console.log(`Found file: ${fullPath}`)
      }
    }
  })
}

findFiles("android", "splash")
process.exit(0)
