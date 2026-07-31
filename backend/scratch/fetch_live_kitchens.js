async function run() {
  try {
    const res = await fetch("https://backend.atleast80.com/api/kitchens")
    console.log("Status:", res.status)
    const data = await res.json()
    console.log("=== Live Kitchens ===")
    if (data.kitchens) {
      data.kitchens.forEach(k => {
        console.log(`ID: ${k.id} | Name: "${k.name}" | Status: "${k.status}" | Active: ${k.is_active} | City: "${k.city}" | State: "${k.state}"`)
      })
    } else {
      console.log("No kitchens key in response:", data)
    }
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
