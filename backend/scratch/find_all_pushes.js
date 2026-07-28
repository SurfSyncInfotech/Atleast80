import fs from "fs"
import path from "path"

const dirs = ["src/routes"]
dirs.forEach(dir => {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const fullPath = path.join(dir, file)
    if (file.endsWith(".js")) {
      const code = fs.readFileSync(fullPath, "utf8")
      const lines = code.split("\n")
      lines.forEach((line, index) => {
        if (line.includes("sendPushToUser")) {
          console.log(`${file}:${index + 1}: ${line.trim()}`)
        }
      })
    }
  })
})
process.exit(0)
