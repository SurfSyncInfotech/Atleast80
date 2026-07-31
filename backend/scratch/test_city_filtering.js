import fetch from "node-fetch"

async function testFilter(paramName, paramVal) {
  try {
    const url = `http://backend.surfsyncinfotech.in/api/surfsync/v1/cities?${paramName}=${paramVal}`
    const res = await fetch(url, {
      headers: {
        "X-API-Key": "ssx_d779b565a8501493d86b83534b3f9e81cb71f9aab8b122f8"
      }
    })
    const data = await res.json()
    const match = data.data?.[0]?.stateCode === paramVal || data.data?.[0]?.stateCode === "MH"
    console.log(`Param: ${paramName}=${paramVal} | Total: ${data.meta?.total} | First City State: ${data.data?.[0]?.stateCode} | Matches: ${match}`)
  } catch (e) {
    console.log(`Param: ${paramName}=${paramVal} | Failed: ${e.message}`)
  }
}

async function run() {
  await testFilter("state", "MH")
  await testFilter("stateCode", "MH")
  await testFilter("state_code", "MH")
  await testFilter("stateId", "IN:MH")
  await testFilter("state_id", "IN:MH")
  await testFilter("state_id", "MH")
  await testFilter("stateCode", "IN-MH")
  await testFilter("stateCode", "IN:MH")
  process.exit(0)
}

run()
