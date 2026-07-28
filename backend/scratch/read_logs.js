import fs from "fs"
import path from "path"

const debugLogPath = "rider_debug.log"
const errLogPath = "backend_stderr.log"

console.log("=== RIDER DEBUG LOG (Last 20 lines) ===")
if (fs.existsSync(debugLogPath)) {
  const content = fs.readFileSync(debugLogPath, "utf8")
  const lines = content.split("\n")
  console.log(lines.slice(-20).join("\n"))
} else {
  console.log("No rider_debug.log found")
}

console.log("\n=== BACKEND STDERR LOG (Last 20 lines) ===")
if (fs.existsSync(errLogPath)) {
  const content = fs.readFileSync(errLogPath, "utf8")
  const lines = content.split("\n")
  console.log(lines.slice(-20).join("\n"))
} else {
  console.log("No backend_stderr.log found")
}
