import fs from "fs"

const path = "../backend/config/firebase-service-account.json"
if (fs.existsSync(path)) {
  console.log("File exists")
  try {
    const raw = fs.readFileSync(path, "utf8")
    console.log("Raw length:", raw.length)
    const json = JSON.parse(raw)
    console.log("JSON keys:", Object.keys(json))
  } catch (e) {
    console.log("Error parsing:", e.message)
  }
} else {
  console.log("File does not exist")
}
process.exit(0)
