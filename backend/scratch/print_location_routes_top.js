import fs from "fs"

const path = "../backend/src/routes/locationRoutes.js"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.slice(0, 70).forEach((line, index) => {
    console.log(`${index + 1}: ${line}`)
  })
} else {
  console.log("File not found")
}
process.exit(0)
