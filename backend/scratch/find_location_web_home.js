import fs from "fs"

const path = "../frontend/src/pages/HomePage.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("location") || line.includes("city") || line.includes("state")) {
      if (line.includes("const") || line.includes("useState") || line.includes("useEffect")) {
        console.log(`${index + 1}: ${line.trim()}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
