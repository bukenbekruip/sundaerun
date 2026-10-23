import {
  STORAGE_KEY,
  loadState,
  createInitialState,
  serializeState,
} from "./state.js";

/** Storage can be disabled or full; the game must still work in memory. */
export function createProgressStorage(
  getStorage = () => globalThis.localStorage,
) {
  let available = true;
  return {
    get available() {
      return available;
    },
    load() {
      try {
        return loadState(getStorage().getItem(STORAGE_KEY));
      } catch {
        available = false;
        return createInitialState();
      }
    },
    save(state) {
      try {
        getStorage().setItem(STORAGE_KEY, serializeState(state));
        available = true;
      } catch {
        available = false;
      }
      return available;
    },
  };
}
