"use client";

import { useSyncExternalStore } from "react";
import type { Job } from "./engine/types";
import type { Attempt } from "./engine/worksample";

const KEY = "talentbridge:v1";

export type PostedJob = Job & { posted: true; created: string; min_aqf: number | null };
type State = { attempts: Attempt[]; revealed: string[]; postedJobs: PostedJob[] };
const EMPTY: State = { attempts: [], revealed: [], postedJobs: [] };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as State) };
  } catch {
    state = EMPTY;
  }
}

function emit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const actions = {
  upsertAttempt(a: Attempt) {
    load();
    emit({ ...state, attempts: [...state.attempts.filter((x) => x.id !== a.id), a] });
  },
  reveal(cid: string) {
    load();
    if (!state.revealed.includes(cid)) emit({ ...state, revealed: [...state.revealed, cid] });
  },
  resetCandidate(cid: string) {
    load();
    emit({ ...state, attempts: state.attempts.filter((a) => a.candidate_id !== cid), revealed: state.revealed.filter((r) => r !== cid) });
  },
  postJob(job: PostedJob) {
    load();
    emit({ ...state, postedJobs: [...state.postedJobs.filter((j) => j.id !== job.id), job] });
  },
  removeJob(id: string) {
    load();
    emit({ ...state, postedJobs: state.postedJobs.filter((j) => j.id !== id) });
  },
  resetAll() {
    emit(EMPTY);
  },
};
