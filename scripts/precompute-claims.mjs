import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local first.");
  process.exit(1);
}
const model = process.env.LLM_MODEL || "claude-sonnet-5";

const SYSTEM = `You map evidence in job-seeker documents to a fixed catalogue of occupation tasks.
Rules:
- Only use task ids from the catalogue.
- Each claim needs a quote copied exactly, character for character, from the document: one contiguous sentence or clause, at most 40 words.
- Only claim a task when the quoted text shows the person doing or learning that task. A job title alone is not evidence.
- A skills list line (e.g. "Skills: Python, SQL") may be quoted, but only for tasks it directly names.
- Do not rate level, quality or seniority.
Return JSON only: {"claims": [{"task_id": "T1", "quote": "..."}]}`;

function textHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

const tasks = JSON.parse(readFileSync("src/data/tasks.json", "utf8")).tasks;
const candidates = JSON.parse(readFileSync("src/data/candidates.json", "utf8"));
const catalogue = tasks.map((t) => `${t.id}: ${t.label}`).join("\n");
const outPath = "src/data/llm-claims.json";
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};

const client = new Anthropic({ apiKey: key });
let done = 0;
let skipped = 0;
for (const c of candidates) {
  for (const doc of c.documents) {
    const hash = textHash(doc.text);
    if (out[doc.id]?.text_hash === hash) {
      skipped++;
      continue;
    }
    const prompt = `<catalogue>\n${catalogue}\n</catalogue>\n\n<document type="${doc.doc_type}" title="${doc.title}">\n${doc.text}\n</document>\n\nReturn the JSON claims for this document.`;
    const msg = await client.messages.create({ model, max_tokens: 1500, system: SYSTEM, messages: [{ role: "user", content: prompt }] });
    let text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
    const claims = JSON.parse(text).claims ?? [];
    out[doc.id] = { text_hash: hash, model, claims };
    done++;
    console.log(`${doc.id}: ${claims.length} claims`);
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`\n${done} documents extracted, ${skipped} unchanged. Quotes are checked verbatim at build time; rejected ones are counted on each passport.`);
console.log("Next: npm run build (or push to Vercel) so the passports use the new claims.");
