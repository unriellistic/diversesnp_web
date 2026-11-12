const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
}


const luma = (rgb: readonly [number, number, number]): number => {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
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

export { hueToRGB };