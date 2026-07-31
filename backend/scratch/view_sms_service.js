import fs from "fs"

const path = "../backend/src/utils/smsService.js"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  console.log(code)
} else {
  console.log("File not found")
}
process.exit(0)
