import fs from "fs"

const path = "../backend/src/data/cities.json"
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, "utf8"))
  
  const citiesToAdd = [
    { name: "Kolad", state: "Maharashtra" },
    { name: "Roha", state: "Maharashtra" },
    { name: "Kulgaon Badlapur", state: "Maharashtra" }
  ]
  
  let addedCount = 0
  citiesToAdd.forEach(newCity => {
    const exists = data.some(c => c.name.toLowerCase() === newCity.name.toLowerCase() && c.state.toLowerCase() === newCity.state.toLowerCase())
    if (!exists) {
      const maxId = Math.max(...data.map(c => parseInt(c.id) || 0))
      data.push({
        id: (maxId + 1).toString(),
        name: newCity.name,
        state: newCity.state
      })
      addedCount++
    }
  })
  
  if (addedCount > 0) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8")
    console.log(`Successfully added ${addedCount} cities to cities.json`)
  } else {
    console.log("All cities already exist in cities.json")
  }
} else {
  console.log("File not found")
}
process.exit(0)
