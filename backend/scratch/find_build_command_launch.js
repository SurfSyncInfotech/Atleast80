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
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          if (tc.name === "run_command" && (tc.args.CommandLine.includes("gradlew") || tc.args.CommandLine.includes("assemble"))) {
            console.log("Launch Command:", tc.args.CommandLine)
            console.log("Cwd:", tc.args.Cwd)
          }
        })
      }
    } catch (e) {}
  })
} else {
  console.log("Transcript not found")
}
process.exit(0)
