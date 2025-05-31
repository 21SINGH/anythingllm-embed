import React, { useState, useEffect } from "react";
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import handleChat from "@/utils/chat";
import ChatService from "@/models/chatService";
export const SEND_TEXT_EVENT = "anythingllm-embed-send-prompt";
import BrandAnalytics from "@/models/brandAnalytics";
import { motion, AnimatePresence } from "framer-motion";
import { RxCross2 } from "react-icons/rx";

export default function ChatContainer({
  sessionId,
  settings,
  knownHistory = [],
  openBottomSheet,
  setOpenBottomSheet,
}) {
  const [message, setMessage] = useState("");
  const [replyProduct, setReplyProduct] = useState();
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [awaitingOrderId, setAwaitingOrderId] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [orderId, setOrderId] = useState("");
  const [intent, setIntent] = useState("");
  const [allowAnonymous, setAllowAnonymus] = useState(false);
  const [loading, setLoading] = useState(false);
  const ANONYMOUS_MODE = `allm_${settings.embedId}_anonymous_mode`;

  useEffect(() => {
    const stored = window.localStorage.getItem(ANONYMOUS_MODE);
    setAllowAnonymus(stored === "true"); // Ensure it's a boolean
  }, []); // <- run only once on mount

  const host = "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvc2hvcHBpZXRlc3RpbmdzdG9yZQ";

  useEffect(() => {
    if (knownHistory.length !== chatHistory.length)
      setChatHistory([...knownHistory]);
  }, [knownHistory]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  useEffect(() => {
    if (chatHistory.length === 3) {
      const thirdMessage = chatHistory[2];

      if (
        thirdMessage.role === "assistant" &&
        thirdMessage.animate === false &&
        !thirdMessage.pending
      ) {
        fetch(
          "https://shoppie-backend.aroundme.global/api/store_prompts/add-user",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              host: settings.host, // or a specific value
              session_id: settings.sessionId, // Replace with actual session ID
              user_details: settings.customer,
            }),
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log("✅ API call successful:", data);
          })
          .catch((error) => {
            console.error("❌ API call failed:", error);
          });
      }
    }
  }, [chatHistory]);

  const handleAwaitingOrderId = async (mess) => {
    if (awaitingOrderId) {
      const orderIdPattern = /^(?=.*[0-9])[a-zA-Z0-9.]+$/;
      if (orderIdPattern.test(mess.trim())) {
        const orderId = mess.trim();
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
            const shipmentStatus = shipment?.status;
            const desc = shipment?.desc || "";
            const eddMs = data.shipments?.edd;

            let delay = false;

            console.log('shipment',shipment);

            if (shipmentStatus === "In Transit") {
              const transitEntry = shipment?.details?.find(
                (entry) => entry.status === "In Transit"
              );

              const inTransitStartTime = transitEntry?.ctime;
              const now = Date.now();
              const msIn7Days = 7 * 24 * 60 * 60 * 1000;

              if (inTransitStartTime) {
                const delayDuration = now - inTransitStartTime;
                if (delayDuration >= msIn7Days) {
                  delay = true;
                }
              }
            }

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
              delay: delay,
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
            content: mess,
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
      setAwaitingOrderId(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message || message === "") return false;

    const mess = message;
    setMessage("");

    if (awaitingOrderId) {
      const orderIdPattern = /^(?=.*[0-9])[a-zA-Z0-9.]+$/;
      if (orderIdPattern.test(mess.trim())) {
        const orderId = mess.trim();
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
            const shipmentStatus = shipment?.status;
            const desc = shipment?.desc || "";
            const eddMs = data.shipments?.edd;

            let delay = false;

            console.log('shipment',shipment);
            


            if (shipmentStatus === "In Transit") {
              const transitEntry = shipment?.details?.find(
                (entry) => entry.status === "In Transit"
              );

              const inTransitStartTime = transitEntry?.ctime;
              const now = Date.now();
              const msIn7Days = 7 * 24 * 60 * 60 * 1000;

              if (inTransitStartTime) {
                const delayDuration = now - inTransitStartTime;
                if (delayDuration >= msIn7Days) {
                  delay = true;
                  console.log(
                    "⚠️ Order Delayed: More than 7 days since entering In Transit."
                  );
                }
              }
            }

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
              delay: delay,
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
            content: mess,
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
      setAwaitingOrderId(false);
    } else if (orderData) {
      const order = JSON.stringify(orderData);
      const orderText = `->QUESTION START-> ${mess} ->QUESTION END->
       ->NOTE START-> Store the context of order details, and reply to what's asked above ->NOTE END->
       ->ORDER DETAILS START->
        user:${orderId},
        bot:${order},
       ->ORDER DETAILS END->
        d`;
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
      await BrandAnalytics.sendTokenAnalytics(settings, sessionId);
    } else if (replyProduct) {
      const replied_product = JSON.stringify(replyProduct);
      const replyText = `->REPLY START-> ${replied_product} ->REPLY END-> ${mess}`;
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
      await BrandAnalytics.sendTokenAnalytics(settings, sessionId);
    } else {
      let newMessage = mess;
      const prevChatHistory = [
        ...chatHistory,
        {
          content: newMessage,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: newMessage,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
      await BrandAnalytics.sendTokenAnalytics(settings, sessionId);
    }
    setReplyProduct(null);
    setLoadingResponse(true);
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
    setReplyProduct(null);
    setLoadingResponse(true);
    await BrandAnalytics.sendTokenAnalytics(settings, sessionId);
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

  const whatsAppClick = async () => {
    setLoading(true);
    const lastMessages = chatHistory.slice(-6);

    let id = null;

    // 1. Create API request body
    const bodyForSummary = lastMessages.map((item) => ({
      role: item.role === "user" ? "user" : "assistant",
      message: (item.textResponse || item.content || "").trim(),
      created_at: item.created_at || new Date().toISOString(),
    }));
    try {
      // 2. Hit summary API
      const res = await fetch(
        `https://shoppie-backend.aroundme.global/api/store_prompts/share-summary?host=${settings.host}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyForSummary),
        }
      );

      const data = await res.json();

      // 3. Format the messages
      const formattedMessages = lastMessages
        .map((item, index) => {
          const sender = item.role === "user" ? "*User*" : "*Shoppie*";
          const message = (item.textResponse || item.content || "").trim();
          id = item.id;
          let formattedMessage = "";

          if (item.role === "user") {
            const parsedData = parseMessageWithProductByUser(message);
            const { product, orderMessage, textAfterProduct } = parsedData;

            if (orderMessage) {
              const orderDetails = orderMessage?.bot1;
              const productLines =
                orderDetails?.products
                  ?.map((p) => {
                    return `${p.name}${p.variant_title ? ` (Variant: ${p.variant_title})` : ""} - ₹${p.price}`;
                  })
                  .join("\n") || "";

              formattedMessage = [
                `- *order id:* ${orderMessage?.user1}`,
                orderDetails.tracking_number
                  ? `- *Tracking Id:* ${orderDetails.tracking_number}`
                  : null,
                orderDetails.payment_mode
                  ? `- *Payment Method:* ${orderDetails.payment_mode}`
                  : null,
                orderDetails.status
                  ? `- *Status:* ${orderDetails.status}`
                  : null,
                orderDetails.edd
                  ? `- *Delivery Date:* ${orderDetails.edd}`
                  : null,
                productLines ? `\- *Products:*\n${productLines}` : null,
                textAfterProduct,
              ]
                .filter(Boolean)
                .join("\n");
            } else {
              formattedMessage = textAfterProduct;
            }
          } else {
            const parsedData = parseMessageWithSuggestionsAndPrompts(message);
            const { textBeforeSuggestions, suggestions, intent } = parsedData;

            const isOrderDetailsMessage =
              textBeforeSuggestions?.startsWith("Order details:\n");
            let orderDetails;
            if (isOrderDetailsMessage) {
              try {
                const jsonPart = textBeforeSuggestions.slice(
                  "Order details:\n".length
                );
                orderDetails = JSON.parse(jsonPart);
                const productLines =
                  orderDetails?.products
                    ?.map((p) => {
                      return `${p.name}${p.variant_title ? ` (Variant: ${p.variant_title})` : ""} - ₹${p.price}`;
                    })
                    .join("\n") || "";

                formattedMessage = [
                  `\n`,
                  orderDetails.tracking_number
                    ? `- *Tracking Id:* ${orderDetails.tracking_number}`
                    : null,
                  orderDetails.payment_mode
                    ? `- *Payment Method:* ${orderDetails.payment_mode}`
                    : null,
                  orderDetails.status
                    ? `- *Status:* ${orderDetails.status}`
                    : null,
                  orderDetails.edd
                    ? `- *Delivery Date:* ${orderDetails.edd}`
                    : null,
                  productLines ? `\- *Products:*\n${productLines}` : null,
                ]
                  .filter(Boolean)
                  .join("\n");
              } catch (e) {
                console.error("Invalid order JSON format", e);
              }
            } else if (intent) {
              formattedMessage = `${intent?.response}`;
            } else formattedMessage = `${textBeforeSuggestions || ""}`.trim();

            if (suggestions?.products.length > 0) {
              suggestions.products.forEach((p) => {
                formattedMessage += `\n- ${p.title}`;
              });
            }
          }

          const indentedMessage = formattedMessage.replace(
            /^(\s*)\d+\.\s/gm,
            "$1-> "
          );

          const cleanedMessage = indentedMessage
            .replace(/\*\*(.*?)\*\*/g, "*$1*")
            .replace(/https?:\/\/[^\s]+/g, "")
            .replace(/\[[^\]]+\.\w{2,}\]/g, "");

          return `${index + 1}. ${sender} - ${cleanedMessage}`;
        })
        .join("\n\n");

      let chatText = "";

      const summary = intent
        ? `*${intent}* - ${data.summary}`
        : `*${data.tags.join(", ")}* - ${data.summary}`;

      const customer = settings.customer;

      const userDetails =
        customer && Object.values(customer).some((val) => val)
          ? Object.entries(customer)
              .filter(([key, value]) => key !== "shop" && value) // exclude `shop`
              .map(([key, value]) => `${key}: ${value}`)
              .join(",\n ")
          : "anonymous";

      chatText = `${summary} \n\nSession id: ${settings.serialNo}\n\nUser details:\n${userDetails}\n\nChats: \n\n${formattedMessages}`;

      setOpenBottomSheet(false);
      const whatsAppUrl = `https://api.whatsapp.com/send/?phone=${settings.whatsappNo}&text=${encodeURIComponent(chatText)}&type=phone_number&app_absent=0`;
      window.open(whatsAppUrl, "_blank");
    } catch (error) {
      console.error("Failed to fetch summary/tags or format message:", error);
    }
    setLoading(false);
  };

  const emailClick = async () => {
    setLoading(true);
    const lastMessages = chatHistory.slice(-6);

    let id = null;

    // 1. Create API request body
    const bodyForSummary = lastMessages.map((item) => ({
      role: item.role === "user" ? "user" : "assistant",
      message: (item.textResponse || item.content || "").trim(),
      created_at: item.created_at || new Date().toISOString(),
    }));
    try {
      // 2. Hit summary API
      const res = await fetch(
        `https://shoppie-backend.aroundme.global/api/store_prompts/share-summary?host=${settings.host}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyForSummary),
        }
      );

      const data = await res.json();

      // 3. Format the messages
      const formattedMessages = lastMessages
        .map((item, index) => {
          const sender = item.role === "user" ? "User" : "Shoppie";
          const message = (item.textResponse || item.content || "").trim();
          id = item.id;
          let formattedMessage = "";

          if (item.role === "user") {
            const parsedData = parseMessageWithProductByUser(message);
            const { product, orderMessage, textAfterProduct } = parsedData;

            if (orderMessage) {
              const orderDetails = orderMessage?.bot1;
              const productLines =
                orderDetails?.products
                  ?.map((p) => {
                    return `${p.name}${p.variant_title ? ` (Variant: ${p.variant_title})` : ""} - ₹${p.price}`;
                  })
                  .join("\n") || "";

              formattedMessage = [
                `- order id: ${orderMessage?.user1}`,
                orderDetails.tracking_number
                  ? `- Tracking Id: ${orderDetails.tracking_number}`
                  : null,
                orderDetails.payment_mode
                  ? `- Payment Method: ${orderDetails.payment_mode}`
                  : null,
                orderDetails.status ? `- Status: ${orderDetails.status}` : null,
                orderDetails.edd
                  ? `- Delivery Date: ${orderDetails.edd}`
                  : null,
                productLines ? `\- Products:\n${productLines}` : null,
                textAfterProduct,
              ]
                .filter(Boolean)
                .join("\n");
            } else {
              formattedMessage = textAfterProduct;
            }
          } else {
            const parsedData = parseMessageWithSuggestionsAndPrompts(message);
            const { textBeforeSuggestions, suggestions, intent } = parsedData;

            const isOrderDetailsMessage =
              textBeforeSuggestions?.startsWith("Order details:\n");
            let orderDetails;
            if (isOrderDetailsMessage) {
              try {
                const jsonPart = textBeforeSuggestions.slice(
                  "Order details:\n".length
                );
                orderDetails = JSON.parse(jsonPart);
                const productLines =
                  orderDetails?.products
                    ?.map((p) => {
                      return `${p.name}${p.variant_title ? ` (Variant: ${p.variant_title})` : ""} - ₹${p.price}`;
                    })
                    .join("\n") || "";

                formattedMessage = [
                  `\n`,
                  orderDetails.tracking_number
                    ? `- Tracking Id: ${orderDetails.tracking_number}`
                    : null,
                  orderDetails.payment_mode
                    ? `- Payment Method: ${orderDetails.payment_mode}`
                    : null,
                  orderDetails.status
                    ? `- Status:*${orderDetails.status}`
                    : null,
                  orderDetails.edd
                    ? `- Delivery Date: ${orderDetails.edd}`
                    : null,
                  productLines ? `\- Products:\n${productLines}` : null,
                ]
                  .filter(Boolean)
                  .join("\n");
              } catch (e) {
                console.error("Invalid order JSON format", e);
              }
            } else if (intent) {
              formattedMessage = `${intent?.response}`;
            } else formattedMessage = `${textBeforeSuggestions || ""}`.trim();

            if (suggestions?.products.length > 0) {
              suggestions.products.forEach((p) => {
                formattedMessage += `\n- ${p.title}`;
              });
            }
          }

          const indentedMessage = formattedMessage.replace(
            /^(\s*)\d+\.\s/gm,
            "$1-> "
          );

          const cleanedMessage = indentedMessage
            .replace(/\*\*(.*?)\*\*/g, "*$1*")
            .replace(/https?:\/\/[^\s]+/g, "")
            .replace(/\[[^\]]+\.\w{2,}\]/g, "");

          return `${index + 1}. ${sender} - ${cleanedMessage}`;
        })
        .join("\n\n");

      let chatText = "";

      const summary = intent
        ? `${intent} - ${data.summary}`
        : `${data.tags.join(", ")} - ${data.summary}`;

      const customer = settings.customer;

      const userDetails =
        customer && Object.values(customer).some((val) => val)
          ? Object.entries(customer)
              .filter(([key, value]) => key !== "shop" && value) // exclude `shop`
              .map(([key, value]) => `${key}: ${value}`)
              .join(",\n ")
          : "anonymous";

      chatText = `Session id: ${settings.serialNo}\n\n User details:\n ${userDetails} \n\nChats: \n\n${formattedMessages}`;

      const mailtoLink = `mailto:${settings.eamilTo}?subject=${encodeURIComponent(summary)}&body=${encodeURIComponent(chatText)}`;
      window.open(mailtoLink, "_blank");
      setOpenBottomSheet(false);
    } catch (error) {
      console.error("Failed to fetch summary/tags or format message:", error);
    }
    setLoading(false);
  };

  return (
    <div className="allm-h-full allm-w-full allm-flex allm-flex-col">
      <div
        style={{
          boxSizing: "content-box",
        }}
        className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain"
        // allm-overflow-y-auto allm-overscroll-contain
      >
        <ChatHistory
          settings={settings}
          history={chatHistory}
          handlePrompt={handlePrompt}
          setReplyProduct={setReplyProduct}
          setOpenBottomSheet={setOpenBottomSheet}
          setIntent={setIntent}
          setAwaitingOrderId={setAwaitingOrderId}
          handleAwaitingOrderId={handleAwaitingOrderId}
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
      <AnimatePresence>
        {!settings.customer?.id &&
          settings.loginRequired &&
          !allowAnonymous && (
            <div className="allm-h-[91%] allm-bottom-0 allm-w-full allm-absolute allm-z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                className="allm-h-full  allm-w-full allm-inset-0 allm-bg-[rgba(0,0,0,0.5)]  allm-flex allm-flex-col allm-justify-end"
              >
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{
                    y: !allowAnonymous ? "0%" : "100%",
                    opacity: 1,
                  }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{
                    type: "tween",
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  className=" allm-rounded-t-[24px] allm-px-8 allm-py-4 "
                  style={{
                    backgroundColor: settings.bgColor,
                    color: settings.botTextColor,
                    height: "35%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="allm-flex allm-flex-col allm-gap-3 allm-mb-6 allm-pt-[8px]">
                      <div className="allm-flex">
                        <div
                          style={{ backgroundColor: settings.headerColor }}
                          className="allm-rounded-xl allm-w-[55%] allm-h-3 allm-animate-pulse"
                        />
                      </div>
                      <div className="allm-flex allm-justify-end">
                        <div
                          style={{ backgroundColor: settings.headerColor }}
                          className=" allm-rounded-xl allm-w-[55%] allm-h-3 allm-animate-pulse"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="allm-text-center allm-text-[16px] ">
                        Login to your account to start chatting.
                      </p>
                      <p className="allm-mt-[-6px] allm-text-center allm-text-gray-300 allm-text-[14px]">
                        ( Please select your mode to proceed. )
                      </p>
                    </div>
                  </div>

                  <div className="allm-flex allm-mt-10  allm-pb-4 allm-gap-4 allm-justify-center">
                    <button
                      className="allm-flex-1 allm-max-w-[121px] allm-rounded-[12px] allm-py-3 allm-text-center allm-appearance-none allm-border-none allm-outline-none allm-bg-transparent allm-flex allm-items-center allm-justify-center"
                      style={{
                        backgroundColor: settings.userBgColor,
                        color: settings.userTextColor,
                      }}
                      onClick={() => {
                        window.location.href = settings.loginLink;
                      }}
                    >
                      Login
                    </button>
                    {settings.anonymous && (
                      <button
                        className="allm-flex-1 allm-rounded-[12px] allm-max-w-[121px] allm-py-3 allm-text-center allm-appearance-none allm-border-none allm-outline-none allm-bg-transparent allm-flex allm-items-center allm-justify-center"
                        style={{
                          backgroundColor: settings.userBgColor,
                          color: settings.userTextColor,
                        }}
                        onClick={() => {
                          window.localStorage.setItem(ANONYMOUS_MODE, "true");
                          setAllowAnonymus(true);
                        }}
                      >
                        Anonymous
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {openBottomSheet &&
          (settings.whatsappToggle || settings.emailToggle) && (
            <div className="allm-h-[91%] allm-bottom-0 allm-w-full allm-absolute allm-z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                className="allm-h-full  allm-w-full allm-inset-0 allm-bg-[rgba(0,0,0,0.5)]  allm-flex allm-flex-col allm-justify-end"
              >
                {/* 👇 Loader */}
                {loading && (
                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                    }}
                    className="allm-absolute allm-top-[45%] allm-left-1/2 allm-transform allm--translate-x-1/2 allm--translate-y-1/2 allm-z-50 allm-flex allm-items-center allm-justify-center"
                  >
                    <div
                      className="allm-rounded-full allm-animate-spin"
                      style={{
                        width: "45px",
                        height: "45px",
                        borderWidth: "5px",
                        borderStyle: "solid",
                        borderColor: "lightgray",
                        borderTopColor: settings.userBgColor,
                      }}
                    />
                  </div>
                )}

                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: openBottomSheet ? "0%" : "100%", opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{
                    type: "tween",
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  className=" allm-rounded-t-[24px] allm-px-8 allm-py-4 "
                  style={{
                    backgroundColor: settings.bgColor,
                    color: settings.botTextColor,
                  }}
                >
                  <button
                    type="button"
                    className={`allm-flex allm-justify-center allm-items-center allm-cursor-pointer allm-p-1 allm-rounded-full allm-mr-1 allm-outline-none allm-border-0 allm-absolute allm-mt-[-20px] allm-right-[2px] allm-bg-[#5A5A5A]`}
                    aria-label="Cross message"
                    onClick={() => {
                      setOpenBottomSheet(false);
                    }}
                  >
                    <RxCross2 size={17} color="#fff" />
                  </button>
                  <p className="allm-text-center allm-text-[16px]">
                    Connect with a live agent on WhatsApp?
                  </p>
                  <p className="allm-text-center allm-opacity-70 allm-text-[14px] allm-mt-[-2px]">
                    Would you like to transfer this chat along with your recent
                    messages?
                  </p>
                  <div className="allm-flex allm-mt-10  allm-pb-4 allm-gap-4 allm-justify-center">
                    {settings.whatsappToggle && (
                      <button
                        className="allm-flex-1 allm-max-w-[121px] allm-rounded-[12px] allm-py-3 allm-text-center allm-appearance-none allm-border-none allm-outline-none allm-bg-transparent allm-flex allm-items-center allm-justify-center"
                        style={{
                          backgroundColor: settings.userBgColor,
                          color: settings.userTextColor,
                        }}
                        onClick={whatsAppClick}
                      >
                        Whatsapp
                      </button>
                    )}
                    {settings.emailToggle && (
                      <button
                        className="allm-flex-1 allm-rounded-[12px] allm-max-w-[121px] allm-py-3 allm-text-center allm-appearance-none allm-border-none allm-outline-none allm-bg-transparent allm-flex allm-items-center allm-justify-center"
                        style={{
                          backgroundColor: settings.userBgColor,
                          color: settings.userTextColor,
                        }}
                        onClick={emailClick}
                      >
                        Email
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </div>
  );
}

const parseMessageWithProductByUser = (message) => {
  if (!message || typeof message !== "string")
    return { product: null, textAfterProduct: message };

  const questionMatch = message.match(
    /->QUESTION START->([\s\S]*?)->QUESTION END->/
  );
  const orderBlockMatch = message.match(
    /->ORDER DETAILS START->([\s\S]*?)->ORDER DETAILS END->/
  );

  if (questionMatch || orderBlockMatch) {
    const content = orderBlockMatch[1].trim();
    const lineRegex = /(user|bot):([\s\S]*?)(?=,\s*(user|bot):|,\s*$)/g;
    const result = {};
    let userCount = 1;
    let botCount = 1;

    let matchLine;
    while ((matchLine = lineRegex.exec(content)) !== null) {
      const [, type, value] = matchLine;
      if (type === "user") {
        result[`user${userCount}`] = value.trim();
        userCount++;
      } else if (type === "bot") {
        const botValue = value.trim();
        try {
          result[`bot${botCount}`] = JSON.parse(botValue);
        } catch {
          result[`bot${botCount}`] = botValue;
        }
        botCount++;
      }
    }

    return {
      orderMessage: result,
      textAfterProduct: questionMatch[1]?.trim() || "",
    };
  }

  const productRegex = /->REPLY START->\s*([\s\S]*?)\s*->REPLY END->/;
  const productMatch = message.match(productRegex);

  if (!productMatch) return { product: null, textAfterProduct: message };

  let product = null;
  try {
    product = JSON.parse(productMatch[1]);
  } catch (e) {
    console.error("Failed to parse product JSON:", e);
    product = null;
  }

  return {
    product,
    textAfterProduct: message
      .substring(productMatch.index + productMatch[0].length)
      .trim(),
  };
};

const parseMessageWithSuggestionsAndPrompts = (message) => {
  if (!message || typeof message !== "string") {
    return {
      textBeforeSuggestions: message,
      suggestions: null,
      textAfterSuggestionsBeforePrompts: "",
      prompts: null,
      textAfterPrompts: "",
      intent: null,
    };
  }

  let textBeforeSuggestions = "";
  let textAfterSuggestions = "";
  let suggestions = null;
  let prompts = null;
  let intent = null;

  // Check for suggestions
  const suggestionsRegex =
    /@@SUGGESTIONS START@@\s*([\s\S]*?)\s*@@SUGGESTIONS END@@/;
  const suggestionsMatch = message.match(suggestionsRegex);

  if (suggestionsMatch) {
    textBeforeSuggestions = message.substring(0, suggestionsMatch.index);
    textAfterSuggestions = message.substring(
      suggestionsMatch.index + suggestionsMatch[0].length
    );

    try {
      suggestions = JSON.parse(suggestionsMatch[1]);
    } catch (e) {
      console.error("Failed to parse suggestions JSON:", e);
      suggestions = { products: [] };
    }
  } else {
    textBeforeSuggestions = message;
    textAfterSuggestions = message; // Assign the whole message if no suggestions
  }

  // Check for prompts
  const promptsRegex = /@@PROMPTS START@@\s*([\s\S]*?)\s*@@PROMPTS END@@/;
  let promptsMatch;

  if (suggestionsMatch) {
    promptsMatch = textAfterSuggestions.match(promptsRegex);
  } else {
    promptsMatch = textBeforeSuggestions.match(promptsRegex);
  }

  if (promptsMatch) {
    if (suggestionsMatch) {
      const textAfterSuggestionsBeforePrompts = textAfterSuggestions.substring(
        0,
        promptsMatch.index
      );
      const textAfterPrompts = textAfterSuggestions.substring(
        promptsMatch.index + promptsMatch[0].length
      );

      try {
        prompts = JSON.parse(promptsMatch[1]);
      } catch (e) {
        console.error("Failed to parse prompts JSON:", e);
        prompts = null;
      }

      return {
        textBeforeSuggestions,
        suggestions,
        textAfterSuggestionsBeforePrompts,
        prompts,
        textAfterPrompts,
        intent,
      };
    } else {
      const textBeforePrompts = textBeforeSuggestions.substring(
        0,
        promptsMatch.index
      );
      const textAfterPrompts = textBeforeSuggestions.substring(
        promptsMatch.index + promptsMatch[0].length
      );

      try {
        prompts = JSON.parse(promptsMatch[1]);
      } catch (e) {
        console.error("Failed to parse prompts JSON:", e);
        prompts = null;
      }

      return {
        textBeforeSuggestions: textBeforePrompts,
        suggestions: null,
        textAfterSuggestionsBeforePrompts: "",
        prompts,
        textAfterPrompts,
        intent,
      };
    }
  }

  // Check for intent
  const intentRegex = /@@INTENT START@@\s*([\s\S]*?)\s*@@INTENT END@@/;
  const intentMatch = message.match(intentRegex);

  if (intentMatch) {
    try {
      intent = JSON.parse(intentMatch[1]);
    } catch (e) {
      console.error("Failed to parse intent JSON:", e);
      intent = null;
    }

    // Remove intent from the message
    const textAfterIntent =
      message.substring(0, intentMatch.index) +
      message.substring(intentMatch.index + intentMatch[0].length);

    return {
      textBeforeSuggestions,
      suggestions,
      textAfterSuggestionsBeforePrompts: textAfterSuggestions,
      prompts: null,
      textAfterPrompts: textAfterIntent,
      intent,
    };
  }

  // Final return for message without intent, suggestions, or prompts
  return {
    textBeforeSuggestions,
    suggestions: null,
    textAfterSuggestionsBeforePrompts: "",
    prompts: null,
    textAfterPrompts: message,
    intent: null,
  };
};
