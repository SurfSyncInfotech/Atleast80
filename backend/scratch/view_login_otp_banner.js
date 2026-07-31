import fs from "fs"

const path = "../mobile/src/app/(auth)/login.jsx"
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, idx) => {
    if (line.includes("demoOtp") || line.includes("Demo OTP")) {
      console.log(`${idx + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
