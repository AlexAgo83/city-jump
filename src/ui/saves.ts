/**
 * Named cities in localStorage, plus the autosave. One key per city, so writing one never has to
 * rewrite another, and an index key holding just the names for the picker.
 * ponytail: localStorage and JSON. IndexedDB buys nothing until a city outgrows the ~5MB budget,
 * which is tens of thousands of segments away.
 */
import { parseCity, type CitySave } from "../sim/save";

const PREFIX = "cityjump.save.";
const INDEX_KEY = "cityjump.saves";
/** Its own key rather than a reserved name, so it can never collide with a city the player names. */
const AUTOSAVE_KEY = "cityjump.autosave";

export function listSaves(): string[] {
  const raw = read(INDEX_KEY);
  if (!raw) return [];
  try {
    const names: unknown = JSON.parse(raw);
    return Array.isArray(names) ? names.filter((name): name is string => typeof name === "string").sort() : [];
  } catch {
    return [];
  }
}

/** False when the browser refuses the write: a full or disabled store, or private browsing. */
export function writeSave(name: string, city: CitySave): boolean {
  if (!write(PREFIX + name, JSON.stringify(city))) return false;
  const names = listSaves();
  if (!names.includes(name)) write(INDEX_KEY, JSON.stringify([...names, name]));
  return true;
}

export function readSave(name: string): CitySave | null {
  const raw = read(PREFIX + name);
  return raw === null ? null : parseCity(raw);
}

export function deleteSave(name: string): void {
  write(PREFIX + name, null);
  write(INDEX_KEY, JSON.stringify(listSaves().filter((candidate) => candidate !== name)));
}

export function writeAutosave(city: CitySave): void {
  write(AUTOSAVE_KEY, JSON.stringify(city));
}

export function readAutosave(): CitySave | null {
  const raw = read(AUTOSAVE_KEY);
  return raw === null ? null : parseCity(raw);
}

/** The toolbar's own checkboxes, not the city -- so a reload comes back exactly as it was left. */
export interface UiSettings {
  grid?: boolean;
  buildings?: boolean;
  gridSnap?: boolean;
  sunAuto?: boolean;
  shortNight?: boolean;
}

const SETTINGS_KEY = "cityjump.settings";

export function readSettings(): UiSettings {
  const raw = read(SETTINGS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as UiSettings) : {};
  } catch {
    return {};
  }
}

export function writeSettings(settings: UiSettings): void {
  write(SETTINGS_KEY, JSON.stringify(settings));
}

/** Which named save the picker should show as the one currently loaded, if any. */
const ACTIVE_SAVE_KEY = "cityjump.activeSave";

export function readActiveSave(): string | null {
  return read(ACTIVE_SAVE_KEY);
}

export function writeActiveSave(name: string | null): void {
  write(ACTIVE_SAVE_KEY, name);
}

/** Where the camera was looking, so a reload resumes the view instead of snapping back to it. */
export interface CameraState {
  targetX: number;
  targetY: number;
  targetZ: number;
  alpha: number;
  beta: number;
  radius: number;
}

const CAMERA_KEY = "cityjump.camera";

export function readCameraState(): CameraState | null {
  const raw = read(CAMERA_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const s = parsed as Partial<CameraState>;
    const fields = [s.targetX, s.targetY, s.targetZ, s.alpha, s.beta, s.radius];
    return fields.every((f) => typeof f === "number" && Number.isFinite(f)) ? (s as CameraState) : null;
  } catch {
    return null;
  }
}

export function writeCameraState(state: CameraState): void {
  write(CAMERA_KEY, JSON.stringify(state));
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage disabled: the game still runs, it just cannot remember
  }
}

function write(key: string, value: string | null): boolean {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // a browser that refuses storage is not a reason to stop building
  }
}
