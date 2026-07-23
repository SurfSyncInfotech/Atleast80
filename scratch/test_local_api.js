async function run() {
  try {
    const res = await fetch('http://localhost:8080/api/locations/states');
    const data = await res.json();
    console.log("LOCAL STATES:", data.states?.slice(0, 10));
    console.log("LOCAL STATES COUNT:", data.states?.length);
    const res2 = await fetch('http://localhost:8080/api/locations/cities?state=UP');
    const data2 = await res2.json();
    console.log("LOCAL UP CITIES COUNT:", data2.cities?.length);
    console.log("LOCAL UP CITIES FIRST 10:", data2.cities?.slice(0, 10));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
