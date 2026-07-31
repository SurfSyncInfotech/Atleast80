import fs from "fs"

const path = "../mobile/src/app/(auth)/signup.jsx"
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, idx) => {
    if (line.includes("login") || line.includes("router") || line.includes("signup") || line.includes("verify")) {
      console.log(`${idx + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
