async function run() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json');
    const data = await res.json();
    console.log("DATA LENGTH:", data.length);
    console.log("FIRST 5:", data.slice(0, 5));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
