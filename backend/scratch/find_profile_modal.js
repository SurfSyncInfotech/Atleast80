import fs from "fs"

const path = "../mobile/src/app/(customer)/(tabs)/profile.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("modal") || line.includes("edit") || line.includes("Address") || line.includes("pincode")) {
      if (line.includes("const") || line.includes("function") || line.includes("useState") || line.includes("<Modal")) {
        console.log(`${index + 1}: ${line.trim()}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
