// ─────────────────────────────────────────────────────────────────────────────
// usePlanningChat — manages AI chat state and agentic messaging flow
// Extracts ALL business logic out of PlanningScreen component
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store";
import { chatWithAgenticAI } from "@/lib/llm";
import type { SuggestedAction, AgenticResponse } from "@/types/domain";

export interface ChatMessage {
  sender: "agent" | "user";
  text: string;
  suggestedAction?: SuggestedAction | null;
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
    const text = manualText ?? inputText;
    if (!text.trim()) return;

    if (isSending) {
      setMessageQueue((prev) => [...prev, text]);
      if (!manualText) setInputText("");
      return;
    }

    setIsSending(true);
    if (!manualText) setInputText("");

    const userMsg: ChatMessage = { sender: "user", text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsTyping(true);

    try {
      const history = updated.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const response: AgenticResponse = await chatWithAgenticAI(
        history,
        pendingAction?.type,
        reportContent
      );

      if (response.userIntent === "confirm") {
        // Inline report update if AI returned one
        if (response.suggestedAction?.type === "generate_report" && response.report) {
          // Caller handles report — just notify
        }
        const actionToDispatch = pendingAction ?? {
          type: "generate_report" as const,
          hint: "Generating based on your request...",
        };
        setPendingAction(null);
        setMessages((prev) => [
          ...prev,
          { sender: "agent", text: response.reply, suggestedAction: null },
        ]);
        setTimeout(() => onActionConfirmed(actionToDispatch), 600);
      } else {
        setPendingAction(response.suggestedAction);
        setMessages((prev) => [
          ...prev,
          {
            sender: "agent",
            text: response.reply,
            suggestedAction: response.suggestedAction,
          },
        ]);
      }
    } catch (err) {
      console.error("[usePlanningChat] AI call failed:", err);
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
  };
}
