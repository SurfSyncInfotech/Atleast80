import fs from "fs"

const path = "../mobile/src/app/(rider)/(tabs)/dashboard.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("api(") || line.includes("online") || line.includes("Online") || line.includes("Location") || line.includes("location")) {
      console.log(`${index + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
