import fs from "fs"

const path = "../mobile/src/app/(customer)/(tabs)/kitchen/[id].jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("Bulk Order Enquiry") || line.includes("Enquiry") || line.includes("Est:") || line.includes("est:")) {
      console.log(`${index + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
