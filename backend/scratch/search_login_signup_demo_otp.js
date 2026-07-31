import fs from "fs"

const files = [
  "../mobile/src/app/(auth)/login.jsx",
  "../mobile/src/app/(auth)/signup.jsx",
  "../mobile/src/app/(kitchen)/login.jsx",
  "../mobile/src/app/(rider)/login.jsx"
]

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf8")
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes("demo") || line.toLowerCase().includes("otp")) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`)
      }
    })
  }
})
process.exit(0)
