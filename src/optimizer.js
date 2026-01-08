// src/optimizer.js
import { SEASON, WEIGHTS } from "./config.js";

// Penalty per extra change is intentionally NOT exposed in the UI
const PENALTY_PER_EXTRA_CHANGE = 10;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(x) {
  return 3 * x * x - 2 * x * x * x;
}

export function valueChangeImportanceNow() {
  const p = clamp01(SEASON.racesCompleted / SEASON.totalRaces);

  // Windowing
  const start = WEIGHTS.dropStart;
  const length = WEIGHTS.dropLength;

  const w = clamp01((p - start) / length);

  // Shape (Excel: BC^1.6)
  const shaped = Math.pow(w, WEIGHTS.shape);

  // FALLING S-CURVE: 1 → 0
  const curve01 = 1 - smoothstep(shaped);

  return WEIGHTS.pointsImportanceMax * curve01;
}

// Extract expected points and expected delta from data.expected.
// Falls back to 0 for missing entries.
function getExpectedForId(map, id) {
  const v = map?.[id];
  if (!v) return { points: 0, delta: 0 };
  const pts = Number(v.points ?? 0);
  const del = Number(v.delta ?? 0);
  return { points: pts, delta: del };
}

// Converts objects into array format: [id, price, points, delta]
function toDriverArray(drivers, expectedDriversMap) {
  return drivers.map(d => {
    const exp = getExpectedForId(expectedDriversMap, d.id);
    return [d.id, Number(d.price), exp.points, exp.delta];
  });
}

function toConstructorArray(constructors, expectedConstructorsMap) {
  return constructors.map(c => {
    const exp = getExpectedForId(expectedConstructorsMap, c.id);
    return [c.id, Number(c.price), exp.points, exp.delta];
  });
}

export function calculateFantasyTeam(budgetCap, lastTeamIds, data, maxFreeChanges) {
  const expectedDriversMap = data.expected?.drivers ?? {};
  const expectedConstructorsMap = data.expected?.constructors ?? {};

  // IMPORTANT: inactive drivers are allowed in lastTeamIds, but ignored for new suggestions
  const activeDrivers = data.drivers.filter(d => d.active);
  const activeConstructors = data.constructors.filter(c => c.active);

  // Arrays: [id, price, points, delta]
  const drivers = toDriverArray(activeDrivers, expectedDriversMap);
  const constructors = toConstructorArray(activeConstructors, expectedConstructorsMap);

  // Weighting between points and delta
  const wDelta = valueChangeImportanceNow();
  const wPoints = 1 - wDelta;


  let best = null;

  for (let i = 0; i < drivers.length - 4; i++) {
    for (let j = i + 1; j < drivers.length - 3; j++) {
      for (let k = j + 1; k < drivers.length - 2; k++) {
        for (let l = k + 1; l < drivers.length - 1; l++) {
          for (let m = l + 1; m < drivers.length; m++) {
            for (let n = 0; n < constructors.length - 1; n++) {
              for (let o = n + 1; o < constructors.length; o++) {

                const driverCombo = [drivers[i], drivers[j], drivers[k], drivers[l], drivers[m]];
                const constructorCombo = [constructors[n], constructors[o]];

                let cost = 0;
                let maxIdx = 0;
                let maxPts = -Infinity;

                for (let p = 0; p < driverCombo.length; p++) {
                  cost += driverCombo[p][1];
                  if (driverCombo[p][2] > maxPts) {
                    maxPts = driverCombo[p][2];
                    maxIdx = p;
                  }
                }

                cost += constructorCombo[0][1] + constructorCombo[1][1];
                if (cost > budgetCap) continue;

                // Captain logic: x2 ONLY on points, NOT on delta
                const driverXPts = {};
                const driverXDelta = {};
                let totalPoints = 0;
                let totalDelta = 0;

                for (let p = 0; p < driverCombo.length; p++) {
                  const id = driverCombo[p][0];
                  const pts = driverCombo[p][2];
                  const del = driverCombo[p][3];

                  const xpts = (p === maxIdx) ? pts * 2 : pts;

                  driverXPts[id] = xpts;
                  driverXDelta[id] = del;

                  totalPoints += xpts;
                  totalDelta += del;
                }

                const constructorXPts = {
                  [constructorCombo[0][0]]: constructorCombo[0][2],
                  [constructorCombo[1][0]]: constructorCombo[1][2]
                };

                const constructorXDelta = {
                  [constructorCombo[0][0]]: constructorCombo[0][3],
                  [constructorCombo[1][0]]: constructorCombo[1][3]
                };

                totalPoints += constructorCombo[0][2] + constructorCombo[1][2];
                totalDelta += constructorCombo[0][3] + constructorCombo[1][3];

                // Combined objective
                const combined = wPoints * totalPoints + wDelta * totalDelta;

                const roundedPoints = Math.round(totalPoints * 10) / 10;
                const roundedDelta = Math.round(totalDelta * 100) / 100;
                const roundedCombined = Math.round(combined * 10) / 10;

                const driverIds = driverCombo.map(d => d[0]);
                const constructorIds = constructorCombo.map(c => c[0]);

                // lastTeamIds may include inactive picks, but set logic still works with IDs
                const changesNeeded = new Set([...driverIds, ...constructorIds, ...lastTeamIds]).size - lastTeamIds.length;
                const additional = Math.max(changesNeeded - maxFreeChanges, 0);

                // Apply penalties to the combined objective (so changes matter for the real decision)
                const penalised = Math.round((roundedCombined - additional * PENALTY_PER_EXTRA_CHANGE) * 10) / 10;

                const teamObj = {
                  driverIds,
                  constructorIds,
                  cost,

                  // For display
                  totalXPts: roundedPoints,
                  totalXDelta: roundedDelta,

                  // For decision-making
                  combinedScore: roundedCombined,
                  penalisedScore: penalised,

                  changesNeeded,
                  additionalChanges: additional,

                  driverXPts,
                  constructorXPts,
                  driverXDelta,
                  constructorXDelta,

                  penaltyPerExtraChange: PENALTY_PER_EXTRA_CHANGE,

                  // Expose current weights for UI/debug
                  weights: { wPoints, wDelta }
                };

                if (!best || teamObj.penalisedScore > best.penalisedScore) {
                  best = teamObj;
                }
              }
            }
          }
        }
      }
    }
  }

  return best;
}
