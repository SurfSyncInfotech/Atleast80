import fs from "fs"

const paths = ["../backend/src/routes/locationRoutes.js", "../backend/src/routes/riderRoutes.js"]
paths.forEach(path => {
  if (fs.existsSync(path)) {
    console.log(`=== Inspecting ${path} ===`)
    const code = fs.readFileSync(path, "utf8")
    const lines = code.split("\n")
    lines.forEach((line, index) => {
      if (line.includes("requireRole")) {
        console.log(`${index + 1}: ${line.trim()}`)
      }
    })
  }
})
process.exit(0)
