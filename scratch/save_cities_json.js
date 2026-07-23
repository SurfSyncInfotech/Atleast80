const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json');
    const data = await res.json();
    
    // Sort states and cities nicely
    const dir = path.join(__dirname, '../backend/src/data');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'cities.json'), JSON.stringify(data, null, 2));
    console.log("SUCCESSFULLY SAVED cities.json!");
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
