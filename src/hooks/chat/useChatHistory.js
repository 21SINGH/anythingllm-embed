import ChatService from "@/models/chatService";
import { useEffect, useState } from "react";

export default function useChatHistory(settings = null, sessionId = null) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    async function fetchChatHistory() {
      if (!sessionId || !settings) return;

      const welcomeMessage = {
        type: "chat",
        role: "assistant",
        content: `${settings.openingMessage}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n    
            "${settings?.suggestion1}",\n  " ${settings?.suggestion2}"\n,\n  " ${settings?.suggestion3}"\n,\n  " ${settings?.suggestion4}"\n,\n  " ${settings?.suggestion5}"\n]\n@@PROMPTS END@@`,
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
        textResponse: `${settings.openingMessage}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n    
            "${settings?.suggestion1}",\n  " ${settings?.suggestion2}"\n,\n  " ${settings?.suggestion3}"\n,\n  " ${settings?.suggestion4}"\n,\n  " ${settings?.suggestion5}"\n]\n@@PROMPTS END@@`,
        close: false,
      };
      try {
        const formattedMessages = await ChatService.embedSessionHistory(
          settings,
          sessionId
        );
        // if (formattedMessages.length > 0) {
        //   setMessages([...formattedMessages]);
        // } else
        setMessages([welcomeMessage, ...formattedMessages]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching historical chats:", error);
        setLoading(false);
      }
    }
    fetchChatHistory();
  }, [sessionId, settings]);

  return { chatHistory: messages, setChatHistory: setMessages, loading };
}
