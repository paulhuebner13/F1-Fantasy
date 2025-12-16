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

  // expectedPoints is optional: if missing or invalid, fall back to empty maps
  let expectedPoints = { drivers: {}, constructors: {} };
  try {
    const r = await fetch("data/expectedPoints.json");
    if (r.ok) expectedPoints = await r.json();
  } catch (e) {
    expectedPoints = { drivers: {}, constructors: {} };
  }

  return { drivers, constructors, expectedPoints };
}
