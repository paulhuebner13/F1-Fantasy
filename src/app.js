import { loadAllData } from "./dataService.js";
import { calculateFantasyTeam } from "./optimizer.js";
import { computeTransfers } from "./transfers.js";
import {
  renderPickers,
  renderSelectedTeam,
  renderChanges,
  renderNewTeam,
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
    renderPickers(data, state, () => {
      renderSelectedTeam(data, state);
      renderPickers(data, state, rerenderLeft);
    });
    renderSelectedTeam(data, state);
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
    renderNewTeam(data, best);

    if (!best) return;

    const transfers = computeTransfers(state.currentTeam, best);
    renderChanges(
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
