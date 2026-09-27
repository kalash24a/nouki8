import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const RUBRIC = `You grade one part of a timed data-analyst work sample. Be strict and specific.
Bands: approaches (partly correct or unclear), meets (correct and usable by a colleague), exceeds (correct, clear, and shows judgement beyond the brief).
Return JSON only: {"band": "approaches|meets|exceeds", "reason": "one sentence citing the submission"}`;

const QUESTIONS = `You write viva questions for a data-analyst work sample the candidate just submitted.
Write exactly 3 short questions that can only be answered well by someone who did this specific work:
reference their own numbers, code lines or wording. Ask why, not what. No trick questions.
Return JSON only: {"questions": ["...", "...", "..."]}`;

const VERDICT = `You compare a candidate's viva answers with the work they submitted.
Judge only consistency and understanding, not English fluency or style.
Return JSON only: {"verdict": "consistent|unclear|inconsistent", "reason": "one sentence"}`;

type Body =
  | { kind: "grade"; part: "T3" | "T7"; criteria: string; submission: string }
  | { kind: "questions"; submission: string }
  | { kind: "verdict"; submission: string; transcript: string };

const cache = new Map<string, unknown>();

function build(body: Body): { system: string; prompt: string; maxTokens: number } | null {
  if (body.kind === "grade") return { system: RUBRIC, prompt: `<part>${body.part}</part>\n<criteria>${body.criteria}</criteria>\n<submission>\n${body.submission}\n</submission>`, maxTokens: 300 };
  if (body.kind === "questions") return { system: QUESTIONS, prompt: `<submission>\n${body.submission}\n</submission>`, maxTokens: 400 };
  if (body.kind === "verdict") return { system: VERDICT, prompt: `<submission>\n${body.submission}\n</submission>\n<viva>\n${body.transcript}\n</viva>`, maxTokens: 200 };
  return null;
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || process.env.DEMO_MODE === "offline") return Response.json({ available: false });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ available: false, error: "bad request" }, { status: 400 });
  }
  const spec = build(body);
  if (!spec || JSON.stringify(body).length > 20000) return Response.json({ available: false, error: "bad request" }, { status: 400 });

  const cacheKey = JSON.stringify(body);
  if (cache.has(cacheKey)) return Response.json({ available: true, data: cache.get(cacheKey) });

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: process.env.LLM_MODEL || "claude-sonnet-5",
      max_tokens: spec.maxTokens,
      system: spec.system,
      messages: [{ role: "user", content: spec.prompt }],
    });
    let text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
    const data = JSON.parse(text);
    if (cache.size > 200) cache.clear();
    cache.set(cacheKey, data);
    return Response.json({ available: true, data });
  } catch (e) {
    return Response.json({ available: false, error: e instanceof Error ? e.name : "error" });
  }
}
