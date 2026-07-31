import fs from "fs"

const path = "../mobile/src/app/(customer)/(tabs)/home.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("filter") || line.includes("kitchens") || line.includes("city")) {
      if (line.includes("==") || line.includes("===") || line.includes("toLowerCase")) {
        console.log(`${index + 1}: ${line.trim()}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
