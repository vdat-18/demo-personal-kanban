// ─────────────────────────────────────────────────────────────────────────────
// useAgentChat — manages streaming agent chat for TaskChat page
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { chatWithAgent } from "@/lib/llm";
import type { ChatMessage } from "@/types/domain";

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  streamingReply: string;
  isStreaming: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  send: () => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function useAgentChat(agentType: string): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingReply, setStreamingReply] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingReply]);

  const send = async () => {
    if (!inputText.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: inputText.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInputText("");
    setIsStreaming(true);
    setStreamingReply("");

    let fullReply = "";
    await chatWithAgent(agentType, history, (delta) => {
      fullReply += delta;
      setStreamingReply(fullReply);
    });

    setMessages((prev) => [...prev, { role: "assistant", content: fullReply }]);
    setStreamingReply("");
    setIsStreaming(false);
  };

  return {
    messages,
    streamingReply,
    isStreaming,
    inputText,
    setInputText,
    send,
    messagesEndRef,
  };
}
