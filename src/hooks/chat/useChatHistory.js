import { dummyData } from "@/components/ChatWindow/dummyData";
import ChatService from "@/models/chatService";
import { useEffect, useState } from "react";

export default function useChatHistory(settings = null, sessionId = null) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function fetchChatHistory() {
      if (!sessionId || !settings) return;
      if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {
        setMessages(dummyData);
        setLoading(false);
      } else {
        const welcomeMessage = {
          type: "chat",
          role: "assistant",
          content:
            'Hello there! How can I help you on your journey to health and wellness with Plix today? 🌿✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n    "Can you tell me about Reginald\'s products?",\n     "How is Reginald diffrent from other brand\s?"\n]\n@@PROMPTS END@@',
          sources: [],
          chatId: 1142,
          sentAt: 1742638816,
          feedbackScore: null,
          metrics: {
            completion_tokens: 100,
            prompt_tokens: 1318,
            total_tokens: 1418,
            outputTps: 61.12469437652812,
            duration: 1.636,
          },
          id: "f3060caf-26e7-4de7-a8bf-e2fdf8e93932",
          sender: "system",
          textResponse:
            'Hello there! How can I help you on your journey with Reginald today? 🌿✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n    "Can you tell me about Reginald\'s products?",\n     "How is Reginald diffrent from other brand\s?"\n]\n@@PROMPTS END@@',
          close: false,
        };
        try {
          const formattedMessages = await ChatService.embedSessionHistory(
            settings,
            sessionId
          );
          setMessages([welcomeMessage, ...formattedMessages]);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching historical chats:", error);
          setLoading(false);
        }
      }
    }
    fetchChatHistory();
  }, [sessionId, settings]);
  
  return { chatHistory: messages, setChatHistory: setMessages, loading };
}
