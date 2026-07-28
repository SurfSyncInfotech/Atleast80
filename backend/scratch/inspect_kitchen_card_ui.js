import fs from "fs"

const path = "../mobile/src/app/(kitchen)/(tabs)/enquiries.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  let inCard = false
  let bracketCount = 0
  lines.forEach((line, index) => {
    if (line.includes("renderItem") || line.includes("flatList") || line.includes("FlatList")) {
      console.log(`${index + 1}: ${line.trim()}`)
    }
    if (line.includes("enquiry.customerName")) {
      console.log(`=== Render starts around line ${index - 10} ===`)
      for (let i = Math.max(0, index - 15); i <= Math.min(lines.length - 1, index + 35); i++) {
        console.log(`${i + 1}: ${lines[i]}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
