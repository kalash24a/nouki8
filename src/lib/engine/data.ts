import tasksJson from "@/data/tasks.json";
import candidatesJson from "@/data/candidates.json";
import jobsJson from "@/data/jobs.json";
import type { Candidate, Job, Occupation, Task } from "./types";

export const occupation = tasksJson.occupation as Occupation;
export const taskList = tasksJson.tasks as Task[];
export const tasks: Record<string, Task> = Object.fromEntries(taskList.map((t) => [t.id, t]));
export const candidates = candidatesJson as Candidate[];
export const jobs = jobsJson as Job[];

export const taskLabel = (id: string) => tasks[id]?.label ?? id;

const SHORT: Record<string, string> = {
  T1: "Data pipelines",
  T2: "Data quality",
  T3: "Analysis",
  T4: "Visualisation",
  T5: "Reporting",
  T6: "Governance",
  T7: "Scripting",
  C1: "Stakeholders",
  C2: "Teamwork",
};
export const taskShort = (id: string) => SHORT[id] ?? id;
