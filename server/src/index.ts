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

// ── POST /api/chat/multimodal — vision-capable, bypasses Pi RPC ───────────────
// Accepts messages where content can be string or array of {type, text/base64} parts.
// Converts to OpenAI Vision format and calls the LLM REST API directly.
app.post("/api/chat/multimodal", async (c) => {
  try {
    const { messages: rawMessages } = await c.req.json<{ messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; base64?: string; mimeType?: string }> }> }>();
    if (!rawMessages?.length) return c.json({ error: "messages required" }, 400);

    const apiKey  = process.env.LLM_API_KEY  || process.env.VITE_LLM_API_KEY  || "9router-dat";
    const baseUrl = process.env.LLM_BASE_URL || process.env.VITE_LLM_BASE_URL || "http://e1.chiasegpu.vn:27318/v1";
    const model   = process.env.LLM_MODEL_NAME || process.env.VITE_LLM_MODEL_NAME || "gemini-unlimited";

    // Convert messages to OpenAI Vision format
    const openaiMessages = rawMessages.map((msg) => {
      // Plain string content — keep as-is
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }

      // Array of parts — convert each part
      const content = msg.content.map((part) => {
        if (part.type === "text") {
          return { type: "text", text: part.text ?? "" };
        }
        if (part.type === "image" && part.base64 && part.mimeType) {
          return {
            type: "image_url",
            image_url: { url: `data:${part.mimeType};base64,${part.base64}` },
          };
        }
        return { type: "text", text: "" };
      }).filter(Boolean);

      return { role: msg.role, content };
    });

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: openaiMessages, stream: false }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[/api/chat/multimodal] LLM error:", errText);
      return c.json({ error: errText }, 500);
    }
    
    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // In case the API stubbornly ignores stream: false and sends SSE anyway
      console.error("API returned non-JSON. Attempting to parse SSE:", rawText.slice(0, 50));
      const chunks = rawText.split("\n").filter(l => l.startsWith("data: "));
      let fullContent = "";
      for (const line of chunks) {
        if (line.includes("[DONE]")) continue;
        try {
          const chunkData = JSON.parse(line.slice(5).trim());
          const delta = chunkData.choices?.[0]?.delta?.content;
          if (delta) fullContent += delta;
        } catch { /* ignore bad chunk */ }
      }
      return c.json({ reply: fullContent });
    }

    const reply = data.choices?.[0]?.message?.content ?? "";
    return c.json({ reply });
  } catch (err) {
    console.error("[/api/chat/multimodal]", err);
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
