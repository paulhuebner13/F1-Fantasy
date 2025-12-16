// Computes OUT and IN lists for drivers and constructors
export function computeTransfers(oldTeam, newTeam) {
  const oldDrivers = new Set(oldTeam.driverIds);
  const newDrivers = new Set(newTeam.driverIds);

  const oldConstructors = new Set(oldTeam.constructorIds);
  const newConstructors = new Set(newTeam.constructorIds);

  const outDrivers = oldTeam.driverIds.filter(id => !newDrivers.has(id));
  const inDrivers = newTeam.driverIds.filter(id => !oldDrivers.has(id));

  const outConstructors = oldTeam.constructorIds.filter(id => !newConstructors.has(id));
  const inConstructors = newTeam.constructorIds.filter(id => !oldConstructors.has(id));

  return { outDrivers, inDrivers, outConstructors, inConstructors };
}
