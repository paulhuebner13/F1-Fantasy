// Loads static JSON files from /data
export async function loadAllData() {
  const [drivers, constructors] = await Promise.all([
    fetch("data/drivers.json").then(r => {
      if (!r.ok) throw new Error("drivers.json not found");
      return r.json();
    }),
    fetch("data/constructors.json").then(r => {
      if (!r.ok) throw new Error("constructors.json not found");
      return r.json();
    })
  ]);

  // expected is optional: if missing or invalid, fall back to empty maps
  // Format:
  // {
  //   "drivers": { "NOR": { "points": 38.0, "delta": 0.12 }, ... },
  //   "constructors": { "MCL": { "points": 91.2, "delta": 0.05 }, ... }
  // }
  let expected = { drivers: {}, constructors: {} };
  try {
    const r = await fetch("data/expectedPoints.json");
    if (r.ok) expected = await r.json();
  } catch (e) {
    expected = { drivers: {}, constructors: {} };
  }

  return { drivers, constructors, expected };
}
