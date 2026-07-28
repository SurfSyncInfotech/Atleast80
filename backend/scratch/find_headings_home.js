import fs from "fs"

const path = "../mobile/src/app/(customer)/(tabs)/home.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("<Text") && (line.includes("bold") || line.includes("semibold") || line.includes("font-poppins")) && line.includes(">")) {
      // Find what text is inside this tag or nearby
      console.log(`${index + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
