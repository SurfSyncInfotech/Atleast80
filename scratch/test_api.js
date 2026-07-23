async function run() {
  try {
    const res = await fetch('https://backend.atleast80.com/api/locations/states');
    const data = await res.json();
    console.log("STATES:", data.states?.slice(0, 10));
    const res2 = await fetch('https://backend.atleast80.com/api/locations/cities?state=UP');
    const data2 = await res2.json();
    console.log("UP CITIES COUNT:", data2.cities?.length);
    console.log("UP CITIES FIRST 10:", data2.cities?.slice(0, 10));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
