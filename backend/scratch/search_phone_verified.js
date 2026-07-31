import fs from "fs"

const path = "../backend/src/routes/authRoutes.js"
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes("verified")) {
      console.log(`${idx + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
