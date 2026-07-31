async function run() {
  try {
    const res = await fetch("http://localhost:8080/api/locations/cities?state=MH")
    console.log("Status:", res.status)
    const text = await res.text()
    console.log("Body:", text.substring(0, 500))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
