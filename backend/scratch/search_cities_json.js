import fs from "fs"

const path = "../backend/src/data/cities.json"
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, "utf8"))
  const matches = data.filter(c => c.name.toLowerCase().includes("badlapur") || c.name.toLowerCase().includes("kulgaon"))
  console.log("Matches found:", matches)
} else {
  console.log("File not found")
}
process.exit(0)
