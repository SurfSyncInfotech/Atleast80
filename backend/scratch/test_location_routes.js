import fetch from "node-fetch"

async function run() {
  try {
    const statesRes = await fetch("http://localhost:8080/api/locations/states")
    const states = await statesRes.json()
    console.log("States response status:", statesRes.status)
    console.log("Total States:", states.states?.length)
    console.log("Sample State:", states.states?.[0])

    const citiesRes = await fetch("http://localhost:8080/api/locations/cities?state=MH")
    const cities = await citiesRes.json()
    console.log("\nCities response status:", citiesRes.status)
    console.log("Total Cities in MH:", cities.cities?.length)
    console.log("Sample City in MH:", cities.cities?.[0])
  } catch (e) {
    console.error("Failed to query local routes:", e.message)
  }
  process.exit(0)
}

run()
