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
  const [awaitingOrderId, setAwaitingOrderId] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [firstUserMessage, setFirstUserMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  const host = "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvc2hvcHBpZXRlc3RpbmdzdG9yZQ";

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

    // Check if the message contains order-related keywords
    const orderKeywords = [
      "order",
      "shipment",
      "tracking",
      "shipped",
      "delivery",
      "order status",
    ];
    const messageLowerCase = message.toLowerCase();

    if (
      !orderData &&
      orderKeywords.some((keyword) => messageLowerCase.includes(keyword))
    ) {
      const prevChatHistory = [
        ...chatHistory,
        {
          content: message,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "Enter your order id : ",
          role: "assistant",
          pending: false,
          userMessage: message,
          animate: false,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setFirstUserMessage(message);
      setChatHistory(prevChatHistory);
      setMessage("");
      setAwaitingOrderId(true);
      return; // Don't proceed further if it's an order-related query
    } else if (awaitingOrderId) {
      // Check if the entered text is a valid order ID (alphanumeric)

      const orderIdPattern = /^(?=.*[0-9])[a-zA-Z0-9.]+$/;

      if (orderIdPattern.test(message.trim())) {
        const orderId = message.trim();
        // Show loading message in chat
        const userEntry = {
          content: orderId,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        };
        const loadingEntry = {
          content: "Fetching order details...",
          role: "assistant",
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };
        setChatHistory([...chatHistory, userEntry, loadingEntry]);

        // Fetch order detail
        fetch(
          `https://shoppie-backend.aroundme.global/api/stores/order-detail?order_name=${orderId}&host=${host}`
        )
          .then((res) => res.json())
          .then((data) => {
            const shipment = data?.shipments?.track;
            const desc = shipment?.desc || "";

            const eddMs = data.shipments?.edd;
            const eddDate = eddMs
              ? new Date(eddMs).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "";

            const extracted = {
              products: data?.products,
              tracking_number: data.shipments?._id || "",
              payment_mode: data.payment_mode || "",
              status: shipment?.status || "",
              tracking_url: data?.tracking_url,
              edd: eddDate,
            };

            // If status is "Delivered", extract extra info
            if (
              shipment?.status === "Delivered" &&
              desc.includes("Shipment Delivered by SR")
            ) {
              const match = desc.match(
                /Shipment Delivered by SR:\s*(.+?),\s*DeliveryDate:\s*([\d\- :]+),\s*Receiver Name:\s*(.+)/
              );
              if (match) {
                extracted.delivered_by = match[1].trim();
                extracted.delivery_date = match[2].trim();
                extracted.receiver_name = match[3].trim();
              }
            }

            setOrderData(extracted);

            const updatedChat = [
              ...chatHistory,
              {
                content: orderId,
                role: "user",
                sentAt: Math.floor(Date.now() / 1000),
              },
              {
                content: `Order details:\n${JSON.stringify(extracted, null, 2)}`,
                role: "assistant",
                pending: false,
                sentAt: Math.floor(Date.now() / 1000),
              },
            ];
            setChatHistory(updatedChat);
          })
          .catch((err) => {
            const errorChat = [
              ...chatHistory,
              {
                content: orderId,
                role: "user",
                sentAt: Math.floor(Date.now() / 1000),
              },
              {
                content: `Could not fetch order details. Please try after soem time. Error: ${err.message}`,
                role: "assistant",
                pending: false,
                sentAt: Math.floor(Date.now() / 1000),
              },
            ];
            setChatHistory(errorChat);
          });
        setOrderId(orderId);
      } else {
        const prevChatHistory = [
          ...chatHistory,
          {
            content: message,
            role: "user",
            sentAt: Math.floor(Date.now() / 1000),
          },
          {
            content:
              "Invalid Order ID.Only enter order id nothign else. Please enter a valid alphanumeric order ID.",
            role: "assistant",
            pending: false,
            animate: false,
            sentAt: Math.floor(Date.now() / 1000),
          },
        ];
        setChatHistory(prevChatHistory);
      }

      setMessage("");
      setAwaitingOrderId(false);
      return;
    } else if (orderData) {
      const order = JSON.stringify(orderData);
      const orderText = `->ORDER DETAILS START->
      user:${firstUserMessage},
      bot:Enter your order id :,
      user:${orderId},
      bot:${order},
     ->ORDER DETAILS END-> ${message}`;
      const prevChatHistory = [
        ...chatHistory,
        {
          content: orderText,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: orderText,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
      setOrderData(null);
    } else if (replyProduct) {
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
    setReplyProduct(null);
    setMessage("");
    setLoadingResponse(true);
    // await BrandAnalytics.sendTokenAnalytics(settings, sessionId,);
  };

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
    setChatHistory(prevChatHistory);
    setMessage("");
    setLoadingResponse(true);
    // await BrandAnalytics.sendTokenAnalytics(settings, sessionId,);
  };

  const sendCommand = (command, history = [], attachments = []) => {
    if (!command || command === "") return false;

    let prevChatHistory;
    if (history.length > 0) {
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
      <div
        style={{
          boxSizing: "content-box",
        }}
        className="allm-flex-grow "
        // allm-overflow-y-auto allm-overscroll-contain
      >
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
    </div>
  );
}
