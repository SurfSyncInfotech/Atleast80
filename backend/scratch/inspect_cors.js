import fs from "fs"

const path = "../backend/src/index.js"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.slice(20, 45).forEach((line, index) => {
    console.log(`${index + 21}: ${line}`)
  })
} else {
  console.log("File not found")
}
process.exit(0)
