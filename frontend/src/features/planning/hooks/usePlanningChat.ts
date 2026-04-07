// ─────────────────────────────────────────────────────────────────────────────
// usePlanningChat — manages AI chat state and agentic messaging flow
// Extracts ALL business logic out of PlanningScreen component
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

/**
 * Remove raw JSON objects and fenced code blocks from a chat reply string.
 * This prevents the AI's internal JSON scaffolding from leaking into the UI.
 */
function stripJsonBlocks(text: string): string {
  return text
    // Remove ```json ... ``` and ``` ... ``` code fences
    .replace(/`{3}(?:json)?\s*[\s\S]*?`{3}/g, "")
    // Remove bare JSON objects { ... } at the end of the string
    .replace(/\s*\{[\s\S]*\}\s*$/, "")
    .trim();
}

import { useProjectStore } from "@/store";
import { chatWithAgenticAI, postChatMultimodal } from "@/lib/llm";
import type { MultimodalMessage, MultimodalPart } from "@/lib/llm";
import type { SuggestedAction, AgenticResponse } from "@/types/domain";
import type { ExtractedAttachment } from "@/lib/fileReader";

export interface ChatMessage {
  sender: "agent" | "user";
  text: string;
  suggestedAction?: SuggestedAction | null;
  attachments?: ExtractedAttachment[];
}

export interface UsePlanningChatOptions {
  projectId: string;
  projectName: string;
  reportContent: string;
  onActionConfirmed: (action: SuggestedAction) => void;
}

export interface UsePlanningChatReturn {
  messages: ChatMessage[];
  isTyping: boolean;
  isSending: boolean;
  messageQueue: string[];
  pendingAction: SuggestedAction | null;
  sendMessage: (text?: string) => void;
  /** Inject a message directly (e.g. agent proactive suggestion after report) */
  pushAgentMessage: (text: string, suggestedAction?: SuggestedAction | null) => void;
  setPendingAction: (action: SuggestedAction | null) => void;
  inputText: string;
  setInputText: (text: string) => void;
  /** Files queued to be sent with the next message */
  pendingAttachments: ExtractedAttachment[];
  addAttachment: (file: ExtractedAttachment) => void;
  addAttachments: (files: ExtractedAttachment[]) => void;
  removeAttachment: (name: string) => void;
}

export function usePlanningChat({
  projectId,
  projectName,
  reportContent,
  onActionConfirmed,
}: UsePlanningChatOptions): UsePlanningChatReturn {
  const {
    projects,
    addProject,
    updateProjectPlanning,
    updateProjectDetailedTask,
  } = useProjectStore();

  const existingProject = projects.find((p) => p.id === projectId);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (existingProject?.planningMessages && existingProject.planningMessages.length > 0) {
      return existingProject.planningMessages as ChatMessage[];
    }
    return [
      {
        sender: "agent",
        text: `Hi there! 👋 I'm your Intelligent Planning Assistant. We're starting on the project **"${projectName}"**. Could you share your vision or ideas for this project? Feel free to explain it in your own words!`,
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<SuggestedAction | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ExtractedAttachment[]>([]);

  const addAttachment = (file: ExtractedAttachment) =>
    setPendingAttachments((prev) => [...prev, file]);

  const addAttachments = (files: ExtractedAttachment[]) =>
    setPendingAttachments((prev) => [...prev, ...files]);

  const removeAttachment = (name: string) =>
    setPendingAttachments((prev) => prev.filter((a) => a.name !== name));

  // ── Sync to store whenever messages change ─────────────────────────────────
  useEffect(() => {
    if (existingProject) {
      updateProjectPlanning(projectId, messages);
    } else if (messages.length > 1) {
      addProject({
        id: projectId,
        name: projectName,
        description: "",
        status: "planning",
        tasks: [],
        planningMessages: messages,
        createdAt: new Date().toISOString(),
      });
    }
  }, [messages]);

  // ── Queue processor ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSending && messageQueue.length > 0) {
      const [next, ...rest] = messageQueue;
      setMessageQueue(rest);
      sendMessage(next);
    }
  }, [isSending, messageQueue]);

  // ── Core send logic ────────────────────────────────────────────────────────
  const sendMessage = async (manualText?: string) => {
    const textToSend = manualText ?? inputText;
    if (!textToSend.trim() && pendingAttachments.length === 0) return;

    if (isSending) {
      setMessageQueue((prev) => [...prev, textToSend]);
      if (!manualText) setInputText("");
      return;
    }

    setIsSending(true);
    if (!manualText) setInputText("");

    const snapshot = [...pendingAttachments];
    setPendingAttachments([]);

    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend || "Attachment",
      attachments: snapshot.length > 0 ? snapshot : undefined,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsTyping(true);

    try {
      // ── Decide: multimodal (has images) or plain text ──────────────────────
      const hasImages = snapshot.some((a) => a.type === "image");

      let responseText: string;
      let parsedResponse: AgenticResponse | null = null;

      if (hasImages) {
        // Build multimodal history for vision endpoint
        const multimodalHistory: MultimodalMessage[] = updated.map((m) => {
          if (m.sender !== "user" || !m.attachments?.length) {
            return { role: m.sender === "user" ? "user" : "assistant", content: m.text };
          }
          const parts: MultimodalPart[] = [];
          if (m.text && m.text !== "Attachment") {
            parts.push({ type: "text", text: m.text });
          }
          for (const att of m.attachments) {
            if (att.type === "image") {
              parts.push({ type: "image", base64: att.content, mimeType: att.mimeType ?? "image/png" });
            } else {
              parts.push({ type: "text", text: `\n\n[FILE CONTENT "${att.name}":\n${att.content}]` });
            }
          }
          return { role: "user", content: parts };
        });

        // Prepend agentic system prompt as a user message
        const systemMsg: MultimodalMessage = {
          role: "user",
          content: `You are the Intelligent Planning Assistant. Please analyze the attached files/images in depth and respond directly to the user in English, using beautiful Markdown formatting. Respond from an expert perspective.`,
        };
        responseText = await postChatMultimodal({
          messages: [systemMsg, ...multimodalHistory],
        });
      } else {
        // Plain text path (existing logic, supports text file attachments)
        const history = updated.map((m) => {
          let content = m.text;
          if (m.attachments?.length) {
            content += "\n\n" + m.attachments
              .map((a) => `[FILE CONTENT "${a.name}":\n${a.content}]`)
              .join("\n\n");
          }
          return {
            role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
            content,
          };
        });

        const response: AgenticResponse = await chatWithAgenticAI(
          history,
          pendingAction?.type,
          reportContent
        );
        parsedResponse = response;
        responseText = response.reply;
      }

      // ── Handle response ────────────────────────────────────────────────────
      if (parsedResponse) {
        // Structured agentic response (text-only path)
        if (parsedResponse.userIntent === "confirm") {
          // Use the action from AI's response if it differs from pendingAction,
          // otherwise fall back to pendingAction. This handles cases where AI
          // returns "confirm" + "generate_report" when user wants to update the report.
          const responseAction = parsedResponse.suggestedAction;
          const actionToDispatch =
            responseAction?.type === "generate_report"
              ? responseAction
              : pendingAction ?? { type: "generate_report" as const, hint: "Generating..." };
          setPendingAction(null);

          // Show a short in-progress message for every action type.
          // The raw parsedResponse.reply is NEVER shown here because:
          //   - generate_report: pushAgentMessage() in handleGenerateReport() sends the real result
          //   - suggest_tasks:   dispatchAction() calls elaborate() which notifies via pushAgentMessage()
          // Showing the raw reply would dump the full task breakdown / report into the chat.
          const ACTION_CONFIRM_MSGS: Record<string, string> = {
            generate_report: "Got it! Generating your strategy report now — it will appear on the right ✨",
            suggest_tasks:   "On it! Elaborating all tasks now — they will appear in the Execution Plan.",
            proceed_to_tasks: "Switching to the Execution Plan view now.",
          };
          const confirmMsg =
            ACTION_CONFIRM_MSGS[actionToDispatch.type] ??
            "Got it! Working on that now…";

          setMessages((prev) => [
            ...prev,
            { sender: "agent", text: confirmMsg, suggestedAction: null },
          ]);
          setTimeout(() => onActionConfirmed(actionToDispatch), 600);
        } else {
          const resp = parsedResponse as AgenticResponse & { taskUpdate?: { index: number; title: string; description: string } };
          if (resp.taskUpdate) {
            updateProjectDetailedTask(
              projectId,
              resp.taskUpdate.index,
              { title: resp.taskUpdate.title, description: resp.taskUpdate.description },
              "ai"
            );
          }
          setPendingAction(parsedResponse.suggestedAction);
          // Strip any stray JSON / code-fence blocks before displaying in chat
          const cleanReply = stripJsonBlocks(parsedResponse!.reply);
          setMessages((prev) => [
            ...prev,
            { sender: "agent", text: cleanReply, suggestedAction: parsedResponse!.suggestedAction },
          ]);
        }
      } else {
        // Vision path — raw reply (may or may not be JSON)
        let replyText = responseText;
        try {
          const parsed = JSON.parse(responseText.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? responseText.slice(responseText.indexOf("{")));
          replyText = parsed.reply ?? responseText;
        } catch { /* not JSON, use raw */ }

        setMessages((prev) => [
          ...prev,
          { sender: "agent", text: stripJsonBlocks(replyText), suggestedAction: null },
        ]);
      }
    } catch (err) {
      console.error("[usePlanningChat] AI call failed:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "An error occurred while calling the AI. Please try again.", suggestedAction: null },
      ]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const pushAgentMessage = (text: string, suggestedAction?: SuggestedAction | null) => {
    setMessages((prev) => [
      ...prev,
      { sender: "agent", text, suggestedAction: suggestedAction ?? null },
    ]);
  };

  return {
    messages,
    isTyping,
    isSending,
    messageQueue,
    pendingAction,
    sendMessage,
    pushAgentMessage,
    setPendingAction,
    inputText,
    setInputText,
    pendingAttachments,
    addAttachment,
    addAttachments,
    removeAttachment,
  };
}
