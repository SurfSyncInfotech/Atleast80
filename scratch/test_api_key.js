async function run() {
  try {
    const res = await fetch('https://api.countrystatecity.in/v1/countries/IN/states/UP/cities', {
      headers: { 'X-CSCAPI-KEY': 'ssx_1a462e7d00a67faae12d43509aaefed1474665a6cfc39b03' }
    });
    console.log("STATUS:", res.status);
    const text = await res.text();
    console.log("TEXT:", text.slice(0, 500));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
