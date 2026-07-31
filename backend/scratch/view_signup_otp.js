import fs from "fs"

const path = "../mobile/src/app/(auth)/signup.jsx"
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes("demo") || line.toLowerCase().includes("otp")) {
      console.log(`${idx + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
