import fs from "fs"
import path from "path"

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else if (file.endsWith(".js") || file.endsWith(".json")) {
      results.push(full)
    }
  })
  return results
}

const files = walk("../backend/src")
files.forEach(file => {
  const content = fs.readFileSync(file, "utf8")
  if (content.toLowerCase().includes("rescue")) {
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes("rescue")) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`)
      }
    })
  }
})
process.exit(0)
