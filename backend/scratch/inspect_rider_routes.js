import fs from "fs"

const path = "../backend/src/routes/riderRoutes.js"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("sendPushToUser") || line.includes("push") || line.includes("notification") || line.includes("broadcast") || line.includes("assign") || line.includes("accept")) {
      console.log(`${index + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
