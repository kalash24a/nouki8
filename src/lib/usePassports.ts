"use client";

import { useMemo } from "react";
import { candidates } from "./engine/data";
import { passportFor, todayIso } from "./engine/scoring";
import type { Passport } from "./engine/types";
import { claimsFor } from "./engine/worksample";
import { useAppState } from "./store";

const today = todayIso();
const basePassports = new Map(candidates.map((c) => [c.id, passportFor(c, today)]));

export function basePassport(cid: string): Passport {
  return basePassports.get(cid)!;
}

export function usePassports() {
  const { attempts } = useAppState();
  return useMemo(() => {
    const map = new Map<string, Passport>();
    for (const c of candidates) {
      const extra = claimsFor(attempts, c.id);
      map.set(c.id, extra.length ? passportFor(c, today, extra) : basePassports.get(c.id)!);
    }
    return map;
  }, [attempts]);
}
