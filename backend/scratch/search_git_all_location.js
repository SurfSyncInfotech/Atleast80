import { execSync } from "child_process"

try {
  const log = execSync('git log -p -S "authRequired" -- C:\\Users\\Nikhil\\Desktop\\surfsync\\Atleast80\\backend\\src\\routes\\locationRoutes.js', { encoding: "utf8" })
  console.log("=== Git history for authRequired in locationRoutes.js ===")
  console.log(log || "No history found")
} catch (e) {
  console.error("Error running git log:", e.message)
}
process.exit(0)
