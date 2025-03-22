import { dummyData } from "@/components/ChatWindow/dummyData";
import ChatService from "@/models/chatService";
import { useEffect, useState } from "react";

export default function useChatHistory(settings = null, sessionId = null) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function fetchChatHistory() {
      if (!sessionId || !settings) return;
      console.log("sessionId", sessionId);

      if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {        
        setMessages(dummyData);
        setLoading(false);
      } 
     else {
        try {
          const formattedMessages = await ChatService.embedSessionHistory(
            settings,
            sessionId
          );
          setMessages(formattedMessages);
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
