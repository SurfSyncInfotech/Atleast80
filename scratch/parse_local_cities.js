const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '../backend/src/data/cities.json'), 'utf8');
const data = JSON.parse(raw);

const states = [...new Set(data.map(item => item.state))].sort();
console.log("STATES:", states);
console.log("TOTAL STATES:", states.length);
