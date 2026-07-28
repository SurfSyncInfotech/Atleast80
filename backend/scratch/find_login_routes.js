import fs from "fs"
const code = fs.readFileSync("src/routes/authRoutes.js", "utf8")
const lines = code.split("\n")
lines.forEach((line, index) => {
  if (line.includes("login") && line.includes("router.post")) {
    console.log(`${index + 1}: ${line.trim()}`)
  }
})
