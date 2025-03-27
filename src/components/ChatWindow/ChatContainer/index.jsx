import React, { useState, useEffect } from "react";
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import handleChat from "@/utils/chat";
import ChatService from "@/models/chatService";
export const SEND_TEXT_EVENT = "anythingllm-embed-send-prompt";
import BrandAnalytics from "@/models/brandAnalytics";

export default function ChatContainer({
  sessionId,
  settings,
  knownHistory = [],
}) {
  const [message, setMessage] = useState("");
  const [replyProduct, setReplyProduct] = useState();
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);

  // Resync history if the ref to known history changes
  // eg: cleared.
  useEffect(() => {
    if (knownHistory.length !== chatHistory.length)
      setChatHistory([...knownHistory]);
  }, [knownHistory]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message || message === "") return false;

    if (replyProduct) {
      const replied_product = JSON.stringify(replyProduct);
      const replyText = `->REPLY START-> ${replied_product} ->REPLY END-> ${message}`;
      const prevChatHistory = [
        ...chatHistory,
        {
          content: replyText,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: replyText,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
    } else {
      const prevChatHistory = [
        ...chatHistory,
        {
          content: message,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: message,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
    }
    await BrandAnalytics.sendAnalytics(settings, sessionId, "sent_message");
    setReplyProduct(null);
    setMessage("");
    setLoadingResponse(true);
  };

  //sending suggested question
  const handlePrompt = async (prompt) => {
    if (!prompt || prompt === "") return false;

    const prevChatHistory = [
      ...chatHistory,
      { content: prompt, role: "user", sentAt: Math.floor(Date.now() / 1000) },
      {
        content: "",
        role: "assistant",
        pending: true,
        userMessage: prompt,
        animate: true,
        sentAt: Math.floor(Date.now() / 1000),
      },
    ];
    await BrandAnalytics.sendAnalytics(settings, sessionId, "sent_message");
    setChatHistory(prevChatHistory);
    setMessage("");
    setLoadingResponse(true);
  };

  const sendCommand = (command, history = [], attachments = []) => {
    if (!command || command === "") return false;

    let prevChatHistory;
    if (history.length > 0) {
      // use pre-determined history chain.
      prevChatHistory = [
        ...history,
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: command,
          attachments,
          animate: true,
        },
      ];
    } else {
      prevChatHistory = [
        ...chatHistory,
        {
          content: command,
          role: "user",
          attachments,
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: command,
          animate: true,
        },
      ];
    }

    setChatHistory(prevChatHistory);
    setLoadingResponse(true);
  };

  useEffect(() => {
    async function fetchReply() {
      const promptMessage =
        chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      const remHistory = chatHistory.length > 0 ? chatHistory.slice(0, -1) : [];
      var _chatHistory = [...remHistory];

      if (!promptMessage || !promptMessage?.userMessage) {
        setLoadingResponse(false);
        return false;
      }

      await ChatService.streamChat(
        sessionId,
        settings,
        promptMessage.userMessage,
        (chatResult) =>
          handleChat(
            chatResult,
            setLoadingResponse,
            setChatHistory,
            remHistory,
            _chatHistory
          )
      );
      return;
    }

    loadingResponse === true && fetchReply();
  }, [loadingResponse, chatHistory]);

  const handleAutofillEvent = (event) => {
    if (!event.detail.command) return;
    sendCommand(event.detail.command, [], []);
  };

  useEffect(() => {
    window.addEventListener(SEND_TEXT_EVENT, handleAutofillEvent);
    return () => {
      window.removeEventListener(SEND_TEXT_EVENT, handleAutofillEvent);
    };
  }, []);

  return (
    <div className="allm-h-full allm-w-full allm-flex allm-flex-col">
      <div className="allm-flex-grow allm-overflow-y-auto">
        <ChatHistory
          settings={settings}
          history={chatHistory}
          handlePrompt={handlePrompt}
          setReplyProduct={setReplyProduct}
        />
      </div>
      <PromptInput
        message={message}
        submit={handleSubmit}
        onChange={handleMessageChange}
        inputDisabled={settings.inputbarDisabled || loadingResponse}
        buttonDisabled={loadingResponse}
        replyProduct={replyProduct}
        setReplyProduct={setReplyProduct}
        settings={settings}
      />
      <div className="allm-flex allm-items-center allm-justify-center allm-mt-[-2px] allm-mb-[10px]">
        <div
          style={{
            color: getContrastColor(settings.bgColor),
          }}
        >
          Powered by Shoppie
        </div>
      </div>
    </div>
  );
}

const getContrastColor = (hex) => {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Calculate luminance (Y) using the relative luminance formula
  let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#343434" : "#b2b2b2"; // Black for light BG, White for dark BG
};
