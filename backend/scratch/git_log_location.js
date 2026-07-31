import { execSync } from "child_process"

try {
  const diff = execSync('git diff HEAD~1 -- C:\\Users\\Nikhil\\Desktop\\surfsync\\Atleast80\\backend\\src\\routes\\locationRoutes.js', { encoding: "utf8" })
  console.log("=== Git Diff head~1 ===")
  console.log(diff)
} catch (e) {
  console.error("Error running git diff:", e.message)
}
process.exit(0)
