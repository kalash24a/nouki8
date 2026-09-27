"use client";

import { useMemo } from "react";
import { jobs } from "./engine/data";
import type { Job } from "./engine/types";
import { useAppState } from "./store";

export function useJobs(): Job[] {
  const { postedJobs } = useAppState();
  return useMemo(() => [...jobs, ...postedJobs], [postedJobs]);
}

export function isPosted(job: Job): boolean {
  return "posted" in job;
}
