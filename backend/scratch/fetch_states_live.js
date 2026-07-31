async function run() {
  try {
    const res = await fetch("https://backend.atleast80.com/api/locations/states")
    console.log("Status:", res.status)
    const json = await res.json()
    console.log("=== States Response ===")
    console.log(JSON.stringify(json, null, 2).substring(0, 800))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
