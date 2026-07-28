import fs from "fs"
import path from "path"

const dir = "scripts"
const files = fs.readdirSync(dir)

console.log("Searching for site_settings in migrations:")
files.forEach(file => {
  if (file.startsWith("migrate") && file.endsWith(".js")) {
    const content = fs.readFileSync(path.join(dir, file), "utf8")
    if (content.includes("site_settings")) {
      console.log(`Found in: ${file}`)
    }
  }
})
