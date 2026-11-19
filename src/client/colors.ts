const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
}


const luma = (rgb: readonly [number, number, number]): number => {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}


const hueToRGB = (hue: number, Y: number = 0.5): string => {
  if (hue < 0 || hue > 1) {
    throw new Error("Hue must be between 0 and 1");
  }
  const base_rgb = [
    clamp(Math.abs(hue * 6 - 3) - 1, 0, 1),
    clamp(2 - Math.abs(hue * 6 - 2), 0, 1),
    clamp(2 - Math.abs(hue * 6 - 4), 0, 1),
  ] as const;

  // scale based on luma
  const current_luma = luma(base_rgb);
  let final_rgb: [number, number, number];
  if (current_luma >= Y) {
    // too bright - simply scale down
    const scale = Y / current_luma;
    final_rgb = [
      clamp(base_rgb[0] * scale, 0, 1),
      clamp(base_rgb[1] * scale, 0, 1),
      clamp(base_rgb[2] * scale, 0, 1),
    ];
  } else {
    // too dark - add white to reach the target luma
    const offset = (Y - current_luma) / luma([1, 1, 1]);
    final_rgb = [
      clamp(base_rgb[0] + offset, 0, 1),
      clamp(base_rgb[1] + offset, 0, 1),
      clamp(base_rgb[2] + offset, 0, 1),
    ];
  }
  
  return `rgb(${final_rgb.map(value => Math.round(value * 255)).join(', ')})`;
}


// function to find the angle of a point relative to the overall centroid
// we will use this to assign hues to each group in a smooth manner
const centroidAngle = (centroid: [number, number], point: [number, number], baseAngle: number = 0.5): number => {
  const dx = point[0] - centroid[0];
  const dy = point[1] - centroid[1];
  const normalizedAngle = Math.atan2(dy, dx) / (2 * Math.PI); // angle normalized to a range of 1
  const adjustedAngle = (normalizedAngle + baseAngle) % 1; // adjust angle to be in the range [0, 1]
  return (adjustedAngle < 0 ? adjustedAngle + 1 : adjustedAngle); // ensure angle is non-negative
}


// enforce a minimum hue separation within a group of hues
const separateHues = (hueRecord: Record<string, number>, minSeparation: number = 0.01): Record<string, number> => {
  const hues = Object.values(hueRecord);
  const keys = Object.keys(hueRecord);

  // sort hues and keys together based on hue values
  const sortedIndices = hues.map((_, index) => index).sort((a, b) => hues[a] - hues[b]);
  const sortedHues = sortedIndices.map(index => hues[index]);
  const sortedKeys = sortedIndices.map(index => keys[index]);

  // adjust hues to ensure minimum separation
  for (let i = 1; i < sortedHues.length; i++) {
    if (sortedHues[i] - sortedHues[i - 1] < minSeparation) {
      sortedHues[i] = sortedHues[i - 1] + minSeparation;
    }
  }

  // wrap around if the last hue exceeds 1
  if (sortedHues[sortedHues.length - 1] > 1) {
    const overflow = sortedHues[sortedHues.length - 1] - 1;
    for (let i = sortedHues.length - 1; i >= 0; i--) {
      sortedHues[i] -= overflow;
      if (i > 0 && sortedHues[i] - sortedHues[i - 1] < minSeparation) {
        sortedHues[i - 1] = sortedHues[i] - minSeparation;
      }
    }
  }

  // create a new record with adjusted hues
  const adjustedHueRecord: Record<string, number> = {};
  for (let i = 0; i < sortedKeys.length; i++) {
    adjustedHueRecord[sortedKeys[i]] = sortedHues[i];
  }

  return adjustedHueRecord;
}



export { hueToRGB, centroidAngle, separateHues };