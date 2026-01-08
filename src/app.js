import { loadAllData } from "./dataService.js";
import { calculateFantasyTeam } from "./optimizer.js";
import { computeTransfers } from "./transfers.js";
import {
  renderPickers,
  renderComparison,
  readInputs
} from "./ui.js";

const state = {
  currentTeam: {
    driverIds: ["VER", "NOR", "PIA", "RUS", "GAS"],
    constructorIds: ["MCL", "MER"]
  }
};

let data = null;

function isSelectionValid(team) {
  return team.driverIds.length === 5 && team.constructorIds.length === 2;
}

async function main() {
  data = await loadAllData();

  const rerenderLeft = () => {
    renderPickers(data, state, rerenderLeft);
  };

  rerenderLeft();

  document.getElementById("btnSuggest").addEventListener("click", () => {
    if (!isSelectionValid(state.currentTeam)) {
      alert("Please select exactly 5 drivers and 2 constructors.");
      return;
    }

    const { budget, freeChanges } = readInputs();
    const lastTeamIds = [
      ...state.currentTeam.driverIds,
      ...state.currentTeam.constructorIds
    ];

    const best = calculateFantasyTeam(budget, lastTeamIds, data, freeChanges);

    if (!best) {
      renderComparison(data, state.currentTeam, null, null, freeChanges, 0, 0);
      return;
    }

    const transfers = computeTransfers(state.currentTeam, best);
    renderComparison(
      data,
      state.currentTeam,
      best,
      transfers,
      freeChanges,
      best.penaltyPerExtraChange,
      best.additionalChanges
    );
  });
}

main().catch(err => {
  console.error(err);
  const header = document.querySelector(".header");
  const box = document.createElement("div");
  box.style.marginTop = "8px";
  box.style.color = "#ff6b6b";
  box.style.fontSize = "12px";
  box.textContent = "Error: " + (err?.message ?? String(err));
  header.appendChild(box);
});
