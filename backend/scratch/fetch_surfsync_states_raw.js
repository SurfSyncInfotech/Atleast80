async function run() {
  try {
    const res = await fetch("http://backend.surfsyncinfotech.in/api/surfsync/v1/states", {
      headers: {
        "X-API-Key": "ssx_d779b565a8501493d86b83534b3f9e81cb71f9aab8b122f8"
      }
    })
    console.log("Status:", res.status)
    const json = await res.json()
    console.log("=== Raw SurfSync States Response ===")
    console.log(JSON.stringify(json, null, 2).substring(0, 800))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
