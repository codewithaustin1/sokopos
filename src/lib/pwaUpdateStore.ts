import { useSyncExternalStore } from 'react';

interface PwaUpdateState {
  needsRefresh: boolean;
  isUpdating: boolean;
}

type UpdateRunner = (reloadPage?: boolean) => Promise<void>;

let state: PwaUpdateState = {
  needsRefresh: false,
  isUpdating: false,
};

let updateRunner: UpdateRunner | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function registerPwaUpdateAvailable(runner: UpdateRunner) {
  updateRunner = runner;
  if (!state.needsRefresh) {
    state = { needsRefresh: true, isUpdating: false };
    emitChange();
  }
}

export function dismissPwaUpdate() {
  if (state.needsRefresh) {
    state = { ...state, needsRefresh: false, isUpdating: false };
    emitChange();
  }
}

export async function applyPwaUpdate() {
  if (!updateRunner) {
    dismissPwaUpdate();
    return;
  }
  state = { ...state, isUpdating: true };
  emitChange();
  try {
    await updateRunner(true);
  } catch {
    state = { ...state, isUpdating: false };
    emitChange();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PwaUpdateState {
  return state;
}

export function usePwaUpdateState(): PwaUpdateState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
