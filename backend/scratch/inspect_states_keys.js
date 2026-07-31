async function run() {
  try {
    const res = await fetch("http://backend.surfsyncinfotech.in/api/surfsync/v1/states", {
      headers: {
        "X-API-Key": "ssx_d779b565a8501493d86b83534b3f9e81cb71f9aab8b122f8"
      }
    })
    const data = await res.json()
    console.log("Keys of states response:", Object.keys(data))
    if (Array.isArray(data.data)) {
      console.log("Data key is array. Length:", data.data.length)
      const bihar = data.data.find(s => s.name.toLowerCase().includes("bihar"))
      console.log("Bihar:", bihar)
    } else if (Array.isArray(data.states)) {
      console.log("States key is array. Length:", data.states.length)
      const bihar = data.states.find(s => s.name.toLowerCase().includes("bihar"))
      console.log("Bihar:", bihar)
    } else {
      console.log("Full data:", data)
    }
  } catch (e) {
    console.error("Error:", e.message)
  }
  process.exit(0)
}

run()
