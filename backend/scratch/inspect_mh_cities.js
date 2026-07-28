import fs from "fs"

const path = "../backend/src/data/cities.json"
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, "utf8"))
  const mhCities = data.filter(c => c.state?.toLowerCase() === "maharashtra")
  console.log("Maharashtra cities count:", mhCities.length)
  console.log("Sample Maharashtra cities:", mhCities.slice(0, 10))
} else {
  console.log("File not found")
}
process.exit(0)
