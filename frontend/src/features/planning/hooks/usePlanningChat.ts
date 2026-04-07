// ─────────────────────────────────────────────────────────────────────────────
// usePlanningChat — manages AI chat state and agentic messaging flow
// Extracts ALL business logic out of PlanningScreen component
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
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
      text: textToSend || "Đính kèm file",
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
          if (m.text && m.text !== "Đính kèm file") {
            parts.push({ type: "text", text: m.text });
          }
          for (const att of m.attachments) {
            if (att.type === "image") {
              parts.push({ type: "image", base64: att.content, mimeType: att.mimeType ?? "image/png" });
            } else {
              parts.push({ type: "text", text: `\n\n[NỘI DUNG FILE "${att.name}":\n${att.content}]` });
            }
          }
          return { role: "user", content: parts };
        });

        // Prepend agentic system prompt as a user message
        const systemMsg: MultimodalMessage = {
          role: "user",
          content: `Bạn là Intelligent Planning Assistant. Hãy phân tích chuyên sâu nội dung file/ảnh được đính kèm và trả lời người dùng trực tiếp bằng tiếng Việt, có sử dụng định dạng Markdown cho đẹp mắt. Dưới góc độ của một chuyên gia nhé.`,
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
              .map((a) => `[NỘI DUNG FILE "${a.name}":\n${a.content}]`)
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
          setMessages((prev) => [
            ...prev,
            { sender: "agent", text: parsedResponse!.reply, suggestedAction: null },
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
          setMessages((prev) => [
            ...prev,
            { sender: "agent", text: parsedResponse!.reply, suggestedAction: parsedResponse!.suggestedAction },
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
          { sender: "agent", text: replyText, suggestedAction: null },
        ]);
      }
    } catch (err) {
      console.error("[usePlanningChat] AI call failed:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.", suggestedAction: null },
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
