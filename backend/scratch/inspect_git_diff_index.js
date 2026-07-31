import { execSync } from "child_process"

try {
  const diff = execSync('git diff HEAD~5 -- C:\\Users\\Nikhil\\Desktop\\surfsync\\Atleast80\\backend\\src\\index.js', { encoding: "utf8" })
  console.log("=== Git Diff index.js HEAD~5 ===")
  console.log(diff)
} catch (e) {
  console.error("Error running git diff:", e.message)
}
process.exit(0)
