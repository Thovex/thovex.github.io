export const GEN_COLORS: Record<string, { r: number; g: number; b: number }> = {
  antenna:     { r: 126, g: 200, b: 227 },
  condenser:   { r: 100, g: 220, b: 180 },
  harvester:   { r: 168, g: 230, b: 207 },
  refinery:    { r: 200, g: 180, b: 100 },
  array:       { r: 255, g: 209, b: 102 },
  singularity: { r: 230, g: 140, b: 100 },
  rift:        { r: 230, g: 100, b: 130 },
  beacon:      { r: 212, g: 165, b: 255 },
  weaver:      { r: 170, g: 130, b: 255 },
  oracle:      { r: 130, g: 170, b: 255 },
  architect:   { r: 255, g: 255, b: 200 },
  godengine:   { r: 255, g: 255, b: 255 },
};

export const GEN_SHAPES: Record<string, string> = {
  antenna: 'circle', condenser: 'diamond', harvester: 'triangle',
  refinery: 'square', array: 'hex', singularity: 'star',
  rift: 'diamond', beacon: 'star', weaver: 'hex',
  oracle: 'triangle', architect: 'star', godengine: 'hex',
};
