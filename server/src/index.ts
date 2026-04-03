import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { PiRpcClient } from "./pi-client.ts";

// ── Pi process ────────────────────────────────────────────────────────────────

const PI_PATH = process.env.PI_PATH ?? "pi";
const PORT = Number(process.env.PORT ?? 3001);

// Spawn ONE Pi RPC process per server instance. 
// Sessions are per-project via new_session commands.
let pi: PiRpcClient | null = null;

function getPi(): PiRpcClient {
  if (!pi) {
    const provider = process.env.PI_PROVIDER || "chiasegpu";
    const model = process.env.PI_MODEL || "gemini-unlimited";
    
    pi = new PiRpcClient(PI_PATH, [
      "--provider", provider,
      "--model",    model,
    ]);
    pi.on("exit", (code: number) => {
      console.error(`[pi] process exited with code ${code}. Respawning on next request.`);
      pi = null;
    });
    console.log(`[pi] RPC process started (path=${PI_PATH})`);
  }
  return pi;
}

// ── Type helpers ──────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  projectName: string;
  agentType?: string;           // 'Planner Agent' | 'Doer Agent' | 'Reviewer Agent' ...
  messages: ChatMessage[];      // full history
}

// Map agentType → Pi skill file name (in server/.pi/skills/)
const AGENT_SKILL: Record<string, string> = {
  "Planner Agent":   "planner",
  "Doer Agent":      "doer",
  "Reviewer Agent":  "reviewer",
  "Reporter Agent":  "reporter",
  "Starter Agent":   "starter",
};

// Build a prompt string that includes conversation history + last user message
function buildPrompt(req: ChatRequest): string {
  const history = req.messages
    .slice(0, -1)   // everything except last
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const lastMsg = req.messages.at(-1);
  const userMessage = lastMsg?.role === "user" ? lastMsg.content : "";

  return history
    ? `Previous conversation:\n${history}\n\nUser: ${userMessage}`
    : userMessage;
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:5173", allowMethods: ["GET", "POST", "OPTIONS"] }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", pi: !!pi }));

// Reset Pi session (call when switching projects)
app.post("/api/session/new", (c) => {
  getPi().newSession();
  return c.json({ success: true });
});

// ── POST /api/chat — single turn (blocking) ──────────────────────────────────
app.post("/api/chat", async (c) => {
  try {
    const req = await c.req.json<ChatRequest>();
    if (!req.messages?.length) return c.json({ error: "messages required" }, 400);

    const piClient = getPi();
    const prompt = buildPrompt(req);
    const skill = req.agentType ? AGENT_SKILL[req.agentType] : null;

    const reply = skill
      ? await piClient.promptWithSkill(skill, prompt)
      : await piClient.prompt(prompt);

    return c.json({ reply });
  } catch (err) {
    console.error("[/api/chat]", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ── POST /api/chat/stream — SSE streaming ────────────────────────────────────
app.post("/api/chat/stream", async (c) => {
  const req = await c.req.json<ChatRequest>();
  if (!req.messages?.length) return c.json({ error: "messages required" }, 400);

  const piClient = getPi();
  const prompt = buildPrompt(req);
  const skill = req.agentType ? AGENT_SKILL[req.agentType] : null;

  return streamSSE(c, async (stream) => {
    try {
      const fullPrompt = skill ? `/skill:${skill}\n\n${prompt}` : prompt;

      await piClient.promptStream(fullPrompt, async (delta) => {
        await stream.writeSSE({ data: JSON.stringify({ delta }), event: "delta" });
      });

      await stream.writeSSE({ data: JSON.stringify({ done: true }), event: "done" });
    } catch (err) {
      await stream.writeSSE({ data: JSON.stringify({ error: String(err) }), event: "error" });
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

console.log(`[server] listening on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

// Warm up Pi on startup
getPi();
