// Pi RPC Client — wraps a `pi --mode rpc` child process
// Protocol: newline-delimited JSON over stdin/stdout

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { EventEmitter } from "node:events";

export interface PiEvent {
  type: string;
  [key: string]: unknown;
}

export class PiRpcClient extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = "";
  private decoder = new StringDecoder("utf8");
  private ready = false;
  private piPath: string;
  private args: string[];

  constructor(piPath: string, args: string[] = []) {
    super();
    this.piPath = piPath;
    this.args = args;
    this.proc = this.start();
  }

  private start() {
    const defaultArgs = ["--mode", "rpc", "--no-session"];
    const proc = spawn(this.piPath, [...defaultArgs, ...this.args], {
      env: { 
        ...process.env,
        // Map the project environment variables to OpenAI standardized keys for Pi
        OPENAI_API_KEY: process.env.PI_API_KEY || process.env.LLM_API_KEY || process.env.VITE_LLM_API_KEY || "9router-dat",
        OPENAI_BASE_URL: process.env.PI_BASE_URL || process.env.LLM_BASE_URL || process.env.VITE_LLM_BASE_URL || "http://e1.chiasegpu.vn:27318/v1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      // Pi sometimes writes startup info to stderr — ignore
      process.stderr.write(`[pi stderr] ${chunk.toString()}`);
    });

    proc.on("exit", (code) => {
      this.emit("exit", code);
    });

    // Parse JSONL from stdout
    const decoder = new StringDecoder("utf8");
    proc.stdout.on("data", (chunk: Buffer) => {
      this.buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
      let newlineIdx: number;
      while ((newlineIdx = this.buffer.indexOf("\n")) !== -1) {
        let line = this.buffer.slice(0, newlineIdx);
        this.buffer = this.buffer.slice(newlineIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.trim()) continue;
        try {
          const event: PiEvent = JSON.parse(line);
          process.stdout.write(`[pi event] ${JSON.stringify(event)}\n`);
          this.emit("event", event);
          this.emit(event.type, event);
        } catch {
          // ignore non-JSON lines (rare startup msgs)
        }
      }
    });

    // Give pi 500ms to initialise before marking ready
    setTimeout(() => {
      this.ready = true;
      this.emit("ready");
    }, 500);

    return proc;
  }

  /** Send a command JSON to pi stdin */
  send(cmd: Record<string, unknown>) {
    this.proc.stdin.write(JSON.stringify(cmd) + "\n");
  }

  /** Send a prompt and await a full agent_end reply */
  prompt(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);

      const onEvent = (event: PiEvent) => {
        if (event.type === "agent_end") {
          this.removeListener("event", onEvent);
          let replyText = "";
          try {
            const e = event as any;
            if (e.messages && Array.isArray(e.messages)) {
              const lastMsg = e.messages[e.messages.length - 1];
              if (lastMsg && lastMsg.role === "assistant" && Array.isArray(lastMsg.content)) {
                for (const block of lastMsg.content) {
                  if (block.type === "text" && typeof block.text === "string") {
                    replyText += block.text;
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error parsing agent_end", err);
          }
          resolve(replyText);
        }
        if (event.type === "error") {
          this.removeListener("event", onEvent);
          reject(new Error(String(event.message ?? "Pi RPC error")));
        }
      };

      this.on("event", onEvent);
      this.send({ 
        id, 
        type: "prompt", 
        message,
        streamingBehavior: "steer" 
      });
    });
  }

  /** Send a skill command to load a skill, then prompt */
  async promptWithSkill(skillName: string, message: string): Promise<string> {
    // Pi skill commands: /skill:name
    return this.prompt(`/skill:${skillName}\n\n${message}`);
  }

  /** Stream events from a prompt — calls onDelta for each text chunk */
  promptStream(
    message: string,
    onDelta: (delta: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);

      const onEvent = (event: PiEvent) => {
        if (event.type === "message_update") {
          const e = event.assistantMessageEvent as Record<string, unknown> | undefined;
          if (e?.type === "text_delta" && typeof e.delta === "string") {
            onDelta(e.delta);
          }
        }
        if (event.type === "agent_end") {
          this.removeListener("event", onEvent);
          resolve();
        }
        if (event.type === "error") {
          this.removeListener("event", onEvent);
          reject(new Error(String(event.message ?? "Pi RPC error")));
        }
      };

      this.on("event", onEvent);
      this.send({ 
        id, 
        type: "prompt", 
        message,
        streamingBehavior: "steer" 
      });
    });
  }

  /** Start a fresh session (clear context) */
  newSession() {
    this.send({ type: "new_session" });
  }

  kill() {
    this.proc.kill();
  }
}
