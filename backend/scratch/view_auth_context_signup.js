import fs from "fs"

const path = "../mobile/src/context/AuthContext.js"
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, idx) => {
    if (line.includes("signupCustomer")) {
      console.log(`=== Line ${idx + 1} ===`)
      for (let i = Math.max(0, idx - 5); i <= Math.min(lines.length - 1, idx + 15); i++) {
        console.log(`${i + 1}: ${lines[i]}`)
      }
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
