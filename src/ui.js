// src/ui.js

function colorForDriver(driver, constructorsById) {
  const c = constructorsById.get(driver.teamId);
  return c?.color ?? "#777777";
}

function colorForConstructor(constructor) {
  return constructor?.color ?? "#777777";
}

function normalizeHex(hex) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h.startsWith("#")) return null;
  if (h.length === 7) return h;
  if (h.length === 4) {
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return null;
}

function textColorForBackground(bgHex) {
  const hex = normalizeHex(bgHex);
  if (!hex) return "#ffffff";

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Relative luminance (sRGB)
  const linear = x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const L = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  // Simple threshold for UI readability
  return L > 0.6 ? "#000000" : "#ffffff";
}

function makeBadge({ id, title, color, selected, inactive, priceText }) {
  const div = document.createElement("div");
  div.className = "badgeBtn" + (selected ? " selected" : "") + (inactive ? " inactive" : "");
  div.style.borderColor = color;

  if (selected) {
    div.style.background = color;
    div.style.color = textColorForBackground(color);
  } else {
    div.style.background = "#0f0f0f";
    div.style.color = "#e5e5e5";
  }

  const code = document.createElement("div");
  code.className = "badgeCode";
  code.textContent = id;
  div.appendChild(code);

  if (priceText) {
    const price = document.createElement("div");
    price.className = "badgePrice";
    price.textContent = priceText;
    div.appendChild(price);
  }

  div.title = title;
  return div;
}

function makeTile({ id, title, color, selected, lines, size }) {
  const div = document.createElement("div");
  div.className = "tile" + (size === "sm" ? " sm" : "") + (selected ? " selected" : "");
  div.style.borderColor = color;

  if (selected) {
    div.style.background = color;
    div.style.color = textColorForBackground(color);
  } else {
    div.style.background = "#0f0f0f";
    div.style.color = "#eeeeee";
  }

  const top = document.createElement("div");
  top.className = "tileTop";

  const code = document.createElement("div");
  code.className = "code";
  code.textContent = id;

  top.appendChild(code);
  div.appendChild(top);

  if (title) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = title;
    div.appendChild(meta);
  }

  if (lines && lines.length > 0) {
    const meta2 = document.createElement("div");
    meta2.className = "meta";
    meta2.textContent = lines.join(" | ");
    div.appendChild(meta2);
  }

  return div;
}

function toggleDriver(state, id) {
  const arr = state.currentTeam.driverIds;
  const idx = arr.indexOf(id);

  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  if (arr.length >= 5) return;
  arr.push(id);
}

function toggleConstructor(state, id) {
  const arr = state.currentTeam.constructorIds;
  const idx = arr.indexOf(id);

  if (idx >= 0) {
    arr.splice(idx, 1);
    return;
  }
  if (arr.length >= 2) return;
  arr.push(id);
}

// Reads inputs from the left panel (robust)
export function readInputs() {
  const budgetRaw = document.getElementById("budgetInput")?.value ?? "0";
  const freeRaw = document.getElementById("freeChangesInput")?.value ?? "0";

  const budget = Number(budgetRaw);
  const freeChanges = Number(freeRaw);

  return {
    budget: Number.isFinite(budget) ? budget : 0,
    freeChanges: Number.isFinite(freeChanges) ? freeChanges : 0
  };
}

// Renders selectable badges for drivers and constructors
export function renderPickers(data, state, onChange) {
  const driversWrap = document.getElementById("driversPicker");
  const constructorsWrap = document.getElementById("constructorsPicker");
  if (!driversWrap || !constructorsWrap) return;

  driversWrap.innerHTML = "";
  constructorsWrap.innerHTML = "";

  const constructorsById = new Map(data.constructors.map(c => [c.id, c]));

  // Sort constructors alphabetically (name), and sort drivers by that constructor order.
  const constructorsSorted = [...data.constructors].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const teamOrder = new Map(constructorsSorted.map((c, idx) => [c.id, idx]));

  const driversSorted = [...data.drivers].sort((a, b) => {
    const ta = teamOrder.get(a.teamId) ?? 999;
    const tb = teamOrder.get(b.teamId) ?? 999;
    if (ta !== tb) return ta - tb;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  for (const d of driversSorted) {
    const selected = state.currentTeam.driverIds.includes(d.id);
    const color = colorForDriver(d, constructorsById);

    const badge = makeBadge({
      id: d.id,
      title: d.name,
      color,
      selected,
      inactive: !d.active,
      priceText: `$${Number(d.price).toFixed(1)}`
    });

    badge.addEventListener("click", () => {
      // Inactive drivers can be selected in the current team
      toggleDriver(state, d.id);
      onChange();
    });

    driversWrap.appendChild(badge);
  }

  for (const c of constructorsSorted) {
    const selected = state.currentTeam.constructorIds.includes(c.id);
    const color = colorForConstructor(c);

    const badge = makeBadge({
      id: c.id,
      title: c.name,
      color,
      selected,
      inactive: !c.active,
      priceText: `$${Number(c.price).toFixed(1)}`
    });

    badge.addEventListener("click", () => {
      toggleConstructor(state, c.id);
      onChange();
    });

    constructorsWrap.appendChild(badge);
  }
}

// Renders the currently selected team grid (left bottom) - optional, safe if missing DOM
export function renderSelectedTeam(data, state) {
  const driversWrap = document.getElementById("selectedDriversGrid");
  const constructorsWrap = document.getElementById("selectedConstructorsGrid");
  if (!driversWrap || !constructorsWrap) return;

  driversWrap.innerHTML = "";
  constructorsWrap.innerHTML = "";

  const constructorsById = new Map(data.constructors.map(c => [c.id, c]));
  const driversById = new Map(data.drivers.map(d => [d.id, d]));

  for (const id of state.currentTeam.driverIds) {
    const d = driversById.get(id);
    if (!d) continue;

    const color = colorForDriver(d, constructorsById);
    driversWrap.appendChild(
      makeTile({
        id: d.id,
        title: "",
        color,
        selected: true,
        lines: [`$${Number(d.price).toFixed(1)}` + (!d.active ? " | inactive" : "")]
      })
    );
  }

  for (const id of state.currentTeam.constructorIds) {
    const c = constructorsById.get(id);
    if (!c) continue;

    const color = colorForConstructor(c);
    constructorsWrap.appendChild(
      makeTile({
        id: c.id,
        title: "",
        color,
        selected: true,
        lines: [`$${Number(c.price).toFixed(1)}`]
      })
    );
  }
}

/* ======================================================================
   Legacy views (keep safe if DOM nodes do not exist)
   ====================================================================== */

export function renderChanges(data, oldTeam, newTeam, transfers, freeChanges, penaltyPerExtraChange, additionalChanges) {
  const header = document.getElementById("changesHeader");
  const list = document.getElementById("changesList");
  if (!list) return;

  if (header) {
    header.textContent =
      `Transfers: ${transfers.outDrivers.length + transfers.outConstructors.length} | Free: ${freeChanges} | Additional: ${additionalChanges} | Penalty per extra: hidden`;
  }

  list.innerHTML = "";

  const constructorsById = new Map(data.constructors.map(c => [c.id, c]));
  const driversById = new Map(data.drivers.map(d => [d.id, d]));

  const columns = document.createElement("div");
  columns.className = "changesColumns";

  const leftCol = document.createElement("div");
  const rightCol = document.createElement("div");

  const leftTitle = document.createElement("div");
  leftTitle.className = "changesColTitle";
  leftTitle.textContent = "Driver changes";

  const rightTitle = document.createElement("div");
  rightTitle.className = "changesColTitle";
  rightTitle.textContent = "Team changes";

  const leftList = document.createElement("div");
  leftList.className = "changesColList";

  const rightList = document.createElement("div");
  rightList.className = "changesColList";

  function addRow(target, leftTile, rightTile) {
    const row = document.createElement("div");
    row.className = "changeRow";

    const arrow = document.createElement("div");
    arrow.className = "arrow";
    arrow.textContent = "→";

    row.appendChild(leftTile);
    row.appendChild(arrow);
    row.appendChild(rightTile);
    target.appendChild(row);
  }

  // Drivers
  const maxDriverPairs = Math.max(transfers.outDrivers.length, transfers.inDrivers.length);
  for (let i = 0; i < maxDriverPairs; i++) {
    const dOut = transfers.outDrivers[i] ? driversById.get(transfers.outDrivers[i]) : null;
    const dIn = transfers.inDrivers[i] ? driversById.get(transfers.inDrivers[i]) : null;

    const leftTile = dOut
      ? makeTile({ id: dOut.id, title: "", color: colorForDriver(dOut, constructorsById), selected: false, size: "sm", lines: [`$${Number(dOut.price).toFixed(1)}`] })
      : makeTile({ id: "----", title: "", color: "#333", selected: false, size: "sm", lines: [] });

    const rightTile = dIn
      ? makeTile({ id: dIn.id, title: "", color: colorForDriver(dIn, constructorsById), selected: true, size: "sm", lines: [`$${Number(dIn.price).toFixed(1)}`] })
      : makeTile({ id: "----", title: "", color: "#333", selected: true, size: "sm", lines: [] });

    addRow(leftList, leftTile, rightTile);
  }

  // Constructors
  const maxConstructorPairs = Math.max(transfers.outConstructors.length, transfers.inConstructors.length);
  for (let i = 0; i < maxConstructorPairs; i++) {
    const cOut = transfers.outConstructors[i] ? constructorsById.get(transfers.outConstructors[i]) : null;
    const cIn = transfers.inConstructors[i] ? constructorsById.get(transfers.inConstructors[i]) : null;

    const leftTile = cOut
      ? makeTile({ id: cOut.id, title: "", color: colorForConstructor(cOut), selected: false, size: "sm", lines: [`$${Number(cOut.price).toFixed(1)}`] })
      : makeTile({ id: "----", title: "", color: "#333", selected: false, size: "sm", lines: [] });

    const rightTile = cIn
      ? makeTile({ id: cIn.id, title: "", color: colorForConstructor(cIn), selected: true, size: "sm", lines: [`$${Number(cIn.price).toFixed(1)}`] })
      : makeTile({ id: "----", title: "", color: "#333", selected: true, size: "sm", lines: [] });

    addRow(rightList, leftTile, rightTile);
  }

  leftCol.appendChild(leftTitle);
  leftCol.appendChild(leftList);
  rightCol.appendChild(rightTitle);
  rightCol.appendChild(rightList);

  columns.appendChild(leftCol);
  columns.appendChild(rightCol);
  list.appendChild(columns);
}

export function renderNewTeam(data, best) {
  const driversGrid = document.getElementById("bestDriversGrid");
  const constructorsGrid = document.getElementById("bestConstructorsGrid");
  const totals = document.getElementById("bestTeamTotals");

  if (driversGrid) driversGrid.innerHTML = "";
  if (constructorsGrid) constructorsGrid.innerHTML = "";
  if (totals) totals.textContent = "";

  if (!best) {
    if (totals) totals.textContent = "No team found. Check budget.";
    return;
  }

  if (!driversGrid || !constructorsGrid || !totals) return;

  const constructorsById = new Map(data.constructors.map(c => [c.id, c]));
  const driversById = new Map(data.drivers.map(d => [d.id, d]));

  let sumDelta = 0;

  for (const id of best.driverIds) {
    const d = driversById.get(id);
    if (!d) continue;

    const color = colorForDriver(d, constructorsById);
    const xpts = best.driverXPts?.[id] ?? 0;
    const xdel = best.driverXDelta?.[id] ?? 0;
    sumDelta += xdel;

    driversGrid.appendChild(
      makeTile({
        id: d.id,
        title: "",
        color,
        selected: true,
        lines: [`$${Number(d.price).toFixed(1)}`, `xPts ${xpts.toFixed(1)}`, `xΔ$ ${xdel.toFixed(2)}`]
      })
    );
  }

  for (const id of best.constructorIds) {
    const c = constructorsById.get(id);
    if (!c) continue;

    const color = colorForConstructor(c);
    const xpts = best.constructorXPts?.[id] ?? 0;
    const xdel = best.constructorXDelta?.[id] ?? 0;
    sumDelta += xdel;

    constructorsGrid.appendChild(
      makeTile({
        id: c.id,
        title: "",
        color,
        selected: true,
        lines: [`$${Number(c.price).toFixed(1)}`, `xPts ${xpts.toFixed(1)}`, `xΔ$ ${xdel.toFixed(2)}`]
      })
    );
  }

  const wPoints = best.weights?.wPoints ?? 0;
  const wDelta = best.weights?.wDelta ?? 0;

  totals.textContent =
    `Cost $${best.cost.toFixed(1)} | xPts ${best.totalXPts.toFixed(1)} | xΔ$ ${sumDelta.toFixed(2)} | wPts ${wPoints.toFixed(2)} | wΔ ${wDelta.toFixed(2)} | Combined ${best.combinedScore.toFixed(1)} | Penalised ${best.penalisedScore.toFixed(1)}`;
}

/* ======================================================================
   New merged right panel (comparison)
   ====================================================================== */

function getExpected(map, id) {
  const v = map?.[id];
  if (!v) return { points: 0, delta: 0 };
  return {
    points: Number(v.points ?? 0),
    delta: Number(v.delta ?? 0)
  };
}

function makeCompCard({ name, color, cost, pts, delta, selected }) {
  const div = document.createElement("div");
  div.className = "compCard" + (selected ? " selected" : "");
  div.style.borderColor = color;

  if (selected) {
    div.style.background = color;
    div.style.color = textColorForBackground(color);
  }

  const top = document.createElement("div");
  top.className = "compName";
  top.textContent = name ?? "";
  div.appendChild(top);

  const bottom = document.createElement("div");
  bottom.className = "compBottom";

  const a = document.createElement("div");
  a.className = "stat";
  a.innerHTML = `<strong>Cost</strong>$${Number(cost ?? 0).toFixed(1)}`;

  const b = document.createElement("div");
  b.className = "stat";
  b.innerHTML = `<strong>Pts</strong>${Number(pts ?? 0).toFixed(1)}`;

  const c = document.createElement("div");
  c.className = "stat";
  c.innerHTML = `<strong>Δ$</strong>${Number(delta ?? 0).toFixed(2)}`;

  bottom.appendChild(a);
  bottom.appendChild(b);
  bottom.appendChild(c);

  div.appendChild(bottom);
  return div;
}

function makePlaceholder() {
  const div = document.createElement("div");
  div.className = "compPlaceholder";
  return div;
}

// Empty middle slot (for unchanged rows)
function makeMidEmpty() {
  const div = document.createElement("div");
  div.className = "midArrow";
  div.textContent = "";
  return div;
}

function addComparisonRow(target, leftEl, midEl, rightEl) {
  const row = document.createElement("div");
  row.className = "changeRow";

  const mid = document.createElement("div");
  mid.className = "midCell";
  mid.appendChild(midEl);

  row.appendChild(leftEl);
  row.appendChild(mid);
  row.appendChild(rightEl);

  target.appendChild(row);
}

export function renderComparison(data, oldTeam, best, transfers, freeChanges, penaltyPerExtraChange, additionalChanges) {
  const list = document.getElementById("changesList");
  const totals = document.getElementById("bestTeamTotals");
  if (!list || !totals) return;

  list.innerHTML = "";
  totals.textContent = "";

  if (!best) {
    totals.textContent = "No team found. Check budget.";
    return;
  }

  const constructorsById = new Map(data.constructors.map(c => [c.id, c]));
  const driversById = new Map(data.drivers.map(d => [d.id, d]));

  const expD = data.expected?.drivers ?? {};
  const expC = data.expected?.constructors ?? {};

  const columns = document.createElement("div");
  columns.className = "changesColumns";

  const leftCol = document.createElement("div");
  const rightCol = document.createElement("div");

  const leftTitle = document.createElement("div");
  leftTitle.className = "changesColTitle";
  leftTitle.textContent = "Driver changes";

  const rightTitle = document.createElement("div");
  rightTitle.className = "changesColTitle";
  rightTitle.textContent = "Team changes";

  const leftList = document.createElement("div");
  leftList.className = "changesColList";

  const rightList = document.createElement("div");
  rightList.className = "changesColList";

  const newDriversSet = new Set(best.driverIds);
  const newConstructorsSet = new Set(best.constructorIds);

  // Drivers: show all old drivers, unchanged go to RIGHT slot
  let inIdx = 0;
  for (const oldId of oldTeam.driverIds) {
    const oldD = driversById.get(oldId);
    if (!oldD) continue;

    if (newDriversSet.has(oldId)) {
      const color = colorForDriver(oldD, constructorsById);
      const xpts = best.driverXPts?.[oldId] ?? getExpected(expD, oldId).points;
      const xdel = best.driverXDelta?.[oldId] ?? getExpected(expD, oldId).delta;

      addComparisonRow(
        leftList,
        makePlaceholder(),
        makeMidEmpty(),
        makeCompCard({ name: oldD.name, color, cost: oldD.price, pts: xpts, delta: xdel, selected: true })
      );
    } else {
      const newId = transfers?.inDrivers?.[inIdx++];
      const newD = newId ? driversById.get(newId) : null;

      const oldExp = getExpected(expD, oldId);
      const leftTile = makeCompCard({
        name: oldD.name,
        color: colorForDriver(oldD, constructorsById),
        cost: oldD.price,
        pts: oldExp.points,
        delta: oldExp.delta,
        selected: false
      });

      const midArrow = document.createElement("div");
      midArrow.className = "midArrow";
      midArrow.textContent = "→";

      const rightTile = newD
        ? makeCompCard({
            name: newD.name,
            color: colorForDriver(newD, constructorsById),
            cost: newD.price,
            pts: best.driverXPts?.[newId] ?? getExpected(expD, newId).points,
            delta: best.driverXDelta?.[newId] ?? getExpected(expD, newId).delta,
            selected: true
          })
        : makePlaceholder();

      addComparisonRow(leftList, leftTile, midArrow, rightTile);
    }
  }

  // Constructors: show all old constructors, unchanged go to RIGHT slot
  let inCIdx = 0;
  for (const oldId of oldTeam.constructorIds) {
    const oldC = constructorsById.get(oldId);
    if (!oldC) continue;

    if (newConstructorsSet.has(oldId)) {
      const color = colorForConstructor(oldC);
      const xpts = best.constructorXPts?.[oldId] ?? getExpected(expC, oldId).points;
      const xdel = best.constructorXDelta?.[oldId] ?? getExpected(expC, oldId).delta;

      addComparisonRow(
        rightList,
        makePlaceholder(),
        makeMidEmpty(),
        makeCompCard({ name: oldC.name, color, cost: oldC.price, pts: xpts, delta: xdel, selected: true })
      );
    } else {
      const newId = transfers?.inConstructors?.[inCIdx++];
      const newC = newId ? constructorsById.get(newId) : null;

      const oldExp = getExpected(expC, oldId);
      const leftTile = makeCompCard({
        name: oldC.name,
        color: colorForConstructor(oldC),
        cost: oldC.price,
        pts: oldExp.points,
        delta: oldExp.delta,
        selected: false
      });

      const midArrow = document.createElement("div");
      midArrow.className = "midArrow";
      midArrow.textContent = "→";

      const rightTile = newC
        ? makeCompCard({
            name: newC.name,
            color: colorForConstructor(newC),
            cost: newC.price,
            pts: best.constructorXPts?.[newId] ?? getExpected(expC, newId).points,
            delta: best.constructorXDelta?.[newId] ?? getExpected(expC, newId).delta,
            selected: true
          })
        : makePlaceholder();

      addComparisonRow(rightList, leftTile, midArrow, rightTile);
    }
  }

  leftCol.appendChild(leftTitle);
  leftCol.appendChild(leftList);

  rightCol.appendChild(rightTitle);
  rightCol.appendChild(rightList);

  columns.appendChild(leftCol);
  columns.appendChild(rightCol);

  list.appendChild(columns);

  const wPoints = best.weights?.wPoints ?? 0;
  const wDelta = best.weights?.wDelta ?? 0;

  totals.textContent =
    `Cost $${best.cost.toFixed(1)} | xPts ${best.totalXPts.toFixed(1)} | xΔ$ ${best.totalXDelta.toFixed(2)} | wPts ${wPoints.toFixed(2)} | wΔ ${wDelta.toFixed(2)} | Penalised ${best.penalisedScore.toFixed(1)}`;
}
