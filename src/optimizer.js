// Penalty per extra change is intentionally NOT exposed in the UI
const PENALTY_PER_EXTRA_CHANGE = 10;

// Placeholder expected delta price for display (replace later)
function expectedDeltaPrice(price) {
  return 0.2 - 0.01 * price;
}

// Converts objects into array format: [id, price, points]
function toDriverArray(drivers, driverPtsMap) {
  return drivers.map(d => [d.id, Number(d.price), Number(driverPtsMap[d.id] ?? 0)]);
}

function toConstructorArray(constructors, constructorPtsMap) {
  return constructors.map(c => [c.id, Number(c.price), Number(constructorPtsMap[c.id] ?? 0)]);
}

export function calculateFantasyTeam(budgetCap, lastTeamIds, data, maxFreeChanges) {
  const driverPtsMap = data.expectedPoints?.drivers ?? {};
  const constructorPtsMap = data.expectedPoints?.constructors ?? {};

  // IMPORTANT: inactive drivers are allowed in lastTeamIds, but ignored for new suggestions
  const activeDrivers = data.drivers.filter(d => d.active);
  const activeConstructors = data.constructors.filter(c => c.active);

  const drivers = toDriverArray(activeDrivers, driverPtsMap);
  const constructors = toConstructorArray(activeConstructors, constructorPtsMap);

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

                // x2 on best driver (captain logic)
                const driverXPts = {};
                let totalDriverPts = 0;

                for (let p = 0; p < driverCombo.length; p++) {
                  const id = driverCombo[p][0];
                  const pts = driverCombo[p][2];
                  const xpts = (p === maxIdx) ? pts * 2 : pts;
                  driverXPts[id] = xpts;
                  totalDriverPts += xpts;
                }

                const constructorXPts = {
                  [constructorCombo[0][0]]: constructorCombo[0][2],
                  [constructorCombo[1][0]]: constructorCombo[1][2]
                };

                const totalPts = totalDriverPts + constructorCombo[0][2] + constructorCombo[1][2];
                const roundedPts = Math.round(totalPts * 10) / 10;

                const driverIds = driverCombo.map(d => d[0]);
                const constructorIds = constructorCombo.map(c => c[0]);

                // lastTeamIds may include inactive picks, but set logic still works with IDs
                const changesNeeded = new Set([...driverIds, ...constructorIds, ...lastTeamIds]).size - lastTeamIds.length;
                const additional = Math.max(changesNeeded - maxFreeChanges, 0);
                const penalised = Math.round((roundedPts - additional * PENALTY_PER_EXTRA_CHANGE) * 10) / 10;

                // Expected delta price for display only
                const driverXDelta = {};
                for (const id of driverIds) {
                  const dObj = data.drivers.find(x => x.id === id);
                  driverXDelta[id] = expectedDeltaPrice(Number(dObj?.price ?? 0));
                }
                const constructorXDelta = {};
                for (const id of constructorIds) {
                  const cObj = data.constructors.find(x => x.id === id);
                  constructorXDelta[id] = expectedDeltaPrice(Number(cObj?.price ?? 0));
                }

                const teamObj = {
                  driverIds,
                  constructorIds,
                  cost,
                  totalXPts: roundedPts,
                  penalisedPoints: penalised,
                  changesNeeded,
                  additionalChanges: additional,
                  driverXPts,
                  constructorXPts,
                  driverXDelta,
                  constructorXDelta,
                  penaltyPerExtraChange: PENALTY_PER_EXTRA_CHANGE
                };

                if (!best || teamObj.penalisedPoints > best.penalisedPoints) {
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
