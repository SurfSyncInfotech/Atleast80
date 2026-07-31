import fetch from "node-fetch"

async function run() {
  try {
    const res = await fetch("http://backend.surfsyncinfotech.in/api/surfsync/v1/cities?stateCode=MH", {
      headers: {
        "X-API-Key": "ssx_d779b565a8501493d86b83534b3f9e81cb71f9aab8b122f8"
      }
    })
    const data = await res.json()
    console.log("Total cities:", data.meta?.total)
    console.log("Sample City:", JSON.stringify(data.data[0], null, 2))
    console.log("Sample City 2:", JSON.stringify(data.data[1], null, 2))
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
