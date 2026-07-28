import fs from "fs"
import path from "path"

const logDir = "C:\\Users\\Nikhil\\.gemini\\antigravity\\brain\\8099d2d0-7b67-4e7b-b400-e82a155fb148\\.system_generated\\logs"
const transcriptPath = path.join(logDir, "transcript.jsonl")

if (fs.existsSync(transcriptPath)) {
  const content = fs.readFileSync(transcriptPath, "utf8")
  const lines = content.split("\n")
  lines.forEach(line => {
    if (!line.trim()) return
    try {
      const obj = JSON.parse(line)
      if (JSON.stringify(obj).includes("apk") || JSON.stringify(obj).includes("gradlew")) {
        // Print the step content or tool calls
        if (obj.tool_calls) {
          console.log("Tool Calls:", JSON.stringify(obj.tool_calls, null, 2))
        }
        if (obj.content && (obj.content.includes("apk") || obj.content.includes("gradlew"))) {
          console.log("Content snippet:", obj.content.substring(0, 300))
        }
      }
    } catch (e) {}
  })
} else {
  console.log("Transcript not found at:", transcriptPath)
}
process.exit(0)
