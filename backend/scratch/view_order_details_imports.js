import fs from "fs"

const path = "../mobile/src/app/(customer)/orders/[id].jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  console.log(code.split("\n").slice(0, 30).join("\n"))
} else {
  console.log("File not found")
}
process.exit(0)
