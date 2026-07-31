import fs from "fs"
import path from "path"

const dir = "../backend/src/routes"
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).forEach(f => console.log(f))
} else {
  console.log("Directory not found")
}
process.exit(0)
