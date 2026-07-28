import fs from "fs"

const path = "../frontend/src/pages/kitchen/KitchenBulkEnquiriesPage.jsx"
if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, "utf8")
  const lines = code.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("Chat with Customer") || line.includes("chat") || line.includes("Chat") || line.includes("chatModal")) {
      console.log(`${index + 1}: ${line.trim()}`)
    }
  })
} else {
  console.log("File not found")
}
process.exit(0)
