import fs from "fs"

const path = "../mobile/android/app/google-services.json"
if (fs.existsSync(path)) {
  console.log("google-services.json is present!")
  try {
    const data = JSON.parse(fs.readFileSync(path, "utf8"))
    console.log("Project info:", data.project_info)
  } catch (e) {
    console.log("Failed to parse JSON:", e.message)
  }
} else {
  console.log("google-services.json is NOT found in android/app!")
}
process.exit(0)
