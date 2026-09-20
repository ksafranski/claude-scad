/** What the viewer needs to know about a printer. */

export interface UserSettings {
  /** The build plate's width and depth in millimetres. Square plates only, which is most of them. */
  plateSizeMm: number;
}

export const DEFAULT_SETTINGS: UserSettings = { plateSizeMm: 220 };

/** Common bed sizes, plus room to type your own. */
export const PLATE_PRESETS = [120, 180, 200, 220, 235, 250, 256, 300, 350, 400] as const;

export const MIN_PLATE_MM = 50;
export const MAX_PLATE_MM = 1000;

export function normalizePlateSize(value: unknown): number | null {
  const size = Math.round(Number(value));
  if (!Number.isFinite(size) || size < MIN_PLATE_MM || size > MAX_PLATE_MM) return null;
  return size;
}
