import fs from "fs"
import path from "path"

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else {
      results.push(full)
    }
  })
  return results
}

const files = walk("../mobile/src/app/(customer)")
files.forEach(f => console.log(f))
process.exit(0)
