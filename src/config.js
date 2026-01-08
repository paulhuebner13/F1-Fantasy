// src/config.js
// Centralised configuration that can be changed without touching business logic.

// Season progress settings
export const SEASON = {
  // Total number of races in the season
  totalRaces: 24,

  // How many races have already been completed (0..totalRaces)
  racesCompleted: 24
};

// Weighting logic between expected points and expected price change.
// pointsImportanceMax is the maximum weight for points at the start of the season.
// Over the season this weight follows a smooth S-curve down to 0.
export const WEIGHTS = {
  // Max weight for points at season start. Typical range: 0.0 .. 1.0
  pointsImportanceMax: 1.00,

  // When should points start losing importance. 0.0 = immediately, 1.0 = never.
  // Example: 0.45 means around mid-season.
  dropStart: 0.45,

  // Over how much of the season should the drop happen.
  // Example: 0.40 means it fades out across 40% of the season.
  dropLength: 0.60,

  // Shape parameter for the curve (based on your Excel formula BC^1.6).
  // Values > 1 make the curve flatter early and steeper later.
  shape: 1.6
};
