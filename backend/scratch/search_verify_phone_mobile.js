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
    } else if (file.endsWith(".jsx") || file.endsWith(".js")) {
      results.push(full)
    }
  })
  return results
}

const files = walk("../mobile/src")
files.forEach(file => {
  const content = fs.readFileSync(file, "utf8")
  if (content.includes("Verify your phone") || content.includes("Account created! Please sign in")) {
    console.log(file)
  }
})
process.exit(0)
