import fs from "fs"
import path from "path"

function walk(dir) {
  let results = []
  if (!fs.existsSync(dir)) return []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else if (file.endsWith(".jsx") || file.endsWith(".js") || file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(full)
    }
  })
  return results
}

const files = walk("../frontend/src")
files.forEach(file => {
  const content = fs.readFileSync(file, "utf8")
  if (content.includes("demoOtp") || content.includes("Demo OTP")) {
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      console.log(`${file}:${idx + 1}: ${line.trim()}`)
    })
  }
})
process.exit(0)
