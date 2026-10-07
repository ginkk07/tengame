// v83 geology layer. The mask is reference-derived but contains no UI pixels.
// R = broad bare-soil/exposed-ground probability.
// G = broad steep/rock-surface probability.
export const GEOLOGY_CONFIG=Object.freeze({
  version:84,
  channels:Object.freeze({
    bareSoil:'r',
    rockSurface:'g'
  }),
  soilTint:[0.64,0.58,0.42],
  rockTint:[0.48,0.47,0.42],
  soilStrength:0.58,
  rockStrength:0.66
});
