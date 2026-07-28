import fs from "fs"
const code = fs.readFileSync("src/routes/adminRoutes.js", "utf8")
const lines = code.split("\n")
console.log("Admin endpoints:")
lines.forEach((line, index) => {
  if (line.includes("router.") && (line.includes("get(") || line.includes("post(") || line.includes("patch(") || line.includes("put(") || line.includes("delete("))) {
    console.log(`${index + 1}: ${line.trim()}`)
  }
})
