async function run() {
  try {
    const res = await fetch("https://backend.atleast80.com/api/locations/cities?state=MH", {
      headers: {
        "Authorization": "Bearer dummy_token"
      }
    })
    console.log("Status with token:", res.status)
    const text = await res.text()
    console.log("Body:", text.substring(0, 500))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
