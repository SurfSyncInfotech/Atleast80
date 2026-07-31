import fs from "fs"

const path = "../mobile/src/app/(rider)/(tabs)/dashboard.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("Cancel at Doorstep")) {
      console.log(`=== Line ${index + 1} ===`)
      for (let i = Math.max(0, index - 5); i <= Math.min(lines.length - 1, index + 25); i++) {
        console.log(`${i + 1}: ${lines[i]}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
