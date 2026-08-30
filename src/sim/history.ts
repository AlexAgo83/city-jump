export interface CityHistory<T> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  record(snapshot: T): void;
  undo(current: T, restore: (snapshot: T) => void): boolean;
  redo(current: T, restore: (snapshot: T) => void): boolean;
  clear(): void;
}

export function createCityHistory<T>(limit = 20): CityHistory<T> {
  const undo: T[] = [];
  const redo: T[] = [];
  return {
    get canUndo() {
      return undo.length > 0;
    },
    get canRedo() {
      return redo.length > 0;
    },
    record(snapshot) {
      undo.push(snapshot);
      if (undo.length > limit) undo.shift();
      redo.length = 0;
    },
    undo(current, restore) {
      const snapshot = undo.pop();
      if (snapshot === undefined) return false;
      redo.push(current);
      restore(snapshot);
      return true;
    },
    redo(current, restore) {
      const snapshot = redo.pop();
      if (snapshot === undefined) return false;
      undo.push(current);
      if (undo.length > limit) undo.shift();
      restore(snapshot);
      return true;
    },
    clear() {
      undo.length = 0;
      redo.length = 0;
    },
  };
}
