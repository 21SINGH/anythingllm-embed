import React, { useState, useEffect } from "react";
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import handleChat from "@/utils/chat";
import ChatService from "@/models/chatService";
export const SEND_TEXT_EVENT = "anythingllm-embed-send-prompt";
import BrandAnalytics from "@/models/brandAnalytics";
import { motion, AnimatePresence } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import StoreMessageDB from "@/models/storeMessageInDB";

export default function ChatContainer({
  sessionId,
  settings,
  knownHistory = [],
  openBottomSheet,
  setOpenBottomSheet,
}) {
  const [replyProduct, setReplyProduct] = useState();
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [orderTrackingInProgress, setOrderTrackingInProgress] = useState(false);
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

  const handleUserUpdate = (orderId) => {
    const orderIdPattern = /^(#?[rR][mM])?\d+$/;
    if (orderIdPattern.test(orderId)) {
      const userEntry = {
        content: orderId,
        role: "user",
        sentAt: Math.floor(Date.now() / 1000),
      };
      const loadingEntry = {
        content: "Fetching user details...",
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

      fetch(
        `https://shoppie-backend.aroundme.global/api/stores/order-fulfillment-detail?host=${settings?.host}&order_name=${orderId}`,
        {
          method: "GET",
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data?.fulfillment_status === null) {
            const intentPayload = {
              allow: true,
              update_detials: data || {},
              intent: "order_tracking",
              order_name: orderId,
            };
            const botReply = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;

            const message = {
              content: botReply,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            };

            const userMessage = orderId;

            setChatHistory((prev) => {
              const withoutLast = prev.slice(0, -1);
              return [...withoutLast, message];
            });

            StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
              .then(() => {
                console.log("✅ Message stored successfully");
              })
              .catch((err) => {
                console.error("❌ Failed to store message:", err);
              });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          } else {
            const intentPayload = {
              allow: false,
              update_detials: data || {},
              intent: "order_tracking",
            };

            const botReply = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;

            const message = {
              content: botReply,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            };

            setChatHistory((prev) => {
              const withoutLast = prev.slice(0, -1);
              return [...withoutLast, message];
            });

            const userMessage = orderId;

            StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
              .then(() => {
                console.log("✅ Message stored successfully");
              })
              .catch((err) => {
                console.error("❌ Failed to store message:", err);
              });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          }
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
              content: `Could not update user details. Please try again later.`,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            },
          ];
          setChatHistory(errorChat);
        });
    } else {
      const prevChatHistory = [
        ...chatHistory,
        {
          content: orderId,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "Invalid Order ID. Only enter order id nothign else.",
          role: "assistant",
          pending: false,
          animate: false,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
    }
  };

  const directlyUpdateUserDetails = (
    order_name,
    oldDetails,
    updatedDetails
  ) => {
    const fieldLines = Object.entries(updatedDetails)
      .filter(
        ([key, value]) =>
          oldDetails[key] !== updatedDetails[key] &&
          value !== "" &&
          value != null
      )
      .map(
        ([key, value]) =>
          `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
      )
      .join("\n");

    const userMessage = "Update these details :\n " + fieldLines;
    const userEntry = {
      content: "Update these details :\n " + fieldLines,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };
    const loadingEntry = {
      content: "Updating user details...",
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

    fetch(
      `https://shoppie-backend.aroundme.global/api/stores/order-update-info`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: settings?.host,
          order_name: order_name,
          address: updatedDetails?.address,
          city: updatedDetails?.city,
          zip: updatedDetails?.zip,
          phone: updatedDetails?.mobile,
        }),
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const botReply = `Details updated successfully. \n\n ${fieldLines} @@PROMPTS START@@ ['Would you like a quick skincare routine recommendation?,  'Curious about which product is best for your skin type?',  'Want to see what others are buying this season?'] @@PROMPTS END@@`;
        const message = {
          content: botReply,
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => {
          const withoutLast = prev.slice(0, -1);
          return [...withoutLast, message];
        });

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
          .then(() => {
            console.log("✅ Message stored successfully");
          })
          .catch((err) => {
            console.error("❌ Failed to store message:", err);
          });
        BrandAnalytics.sendTokenAnalytics(settings, sessionId);
      })
      .catch((err) => {
        const botReply =
          "Unable to update user details. Please try again later.";
        const errorChat = {
          content: "Unable to update user details. Please try again later.",
          role: "assistant",
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };
        setChatHistory((prev) => {
          const withoutLast = prev.slice(0, -1);
          return [...withoutLast, errorChat];
        });

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
          .then(() => {
            console.log("✅ Message stored successfully");
          })
          .catch((err) => {
            console.error("❌ Failed to store message:", err);
          });
      });
  };

  const cantUpdateUserSoConnectToLiveAgent = (oldDetails, updatedDetails) => {
    const fieldLines = Object.entries(updatedDetails)
      .filter(([key]) => oldDetails[key] !== updatedDetails[key])
      .map(
        ([key, value]) =>
          `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
      )
      .join("\n");

    const userMessage = "Update these details :";
    const botMessage = ` @@INTENT START@@{  'response': 'Since I am not able to update the details myself I will connect you to live agent to update these details:\n\n ${fieldLines}',  'intent': 'update_user_details'}@@INTENT END@@`;

    const userEntry = {
      content: userMessage,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };
    const botEntry = {
      content: botMessage,
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, botEntry]);

    StoreMessageDB.postMessageInDB(settings, userMessage, botMessage)
      .then(() => {
        console.log("✅ Message stored successfully");
      })
      .catch((err) => {
        console.error("❌ Failed to store message:", err);
      });
  };

  const handleOrderTracking = async (type, value) => {
    const userEntry = {
      content: value,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };
    const loadingEntry = {
      content: "Fetching order details...",
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

    const queryParam = type !== "phone" ? `email=${value}` : `phone=${value}`;

    fetch(
      `https://shoppie-backend.aroundme.global/api/stores/order-names?host=${settings.host}&${queryParam}`,
      {
        method: "GET",
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const userMessage = `${value}`;

        const intentPayload = {
          order_names: data?.order_names || [],
          message: `**${data?.name}** please select from following order ids:`,
          intent: "order_tracking",
        };
        const botReply = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;

        const message2 = {
          content: botReply,
          role: "assistant",
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => {
          const withoutLast = prev.slice(0, -1);
          return [...withoutLast, message2];
        });

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
          .then(() => {
            console.log("✅ Message stored successfully");
          })
          .catch((err) => {
            console.error("❌ Failed to store message:", err);
          });
        BrandAnalytics.sendTokenAnalytics(settings, sessionId);
      })
      .catch((err) => {
        const errorChat = [
          ...chatHistory,
          {
            content: value,
            role: "user",
            sentAt: Math.floor(Date.now() / 1000),
          },
          {
            content: `Could not fetch order details. Please try again later.`,
            role: "assistant",
            pending: false,
            sentAt: Math.floor(Date.now() / 1000),
          },
        ];
        const userMessage = value;
        const botReply = `Could not fetch order details. Please try again later.`;
        StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
          .then(() => {
            console.log("✅ Message stored successfully");
          })
          .catch((err) => {
            console.error("❌ Failed to store message:", err);
          });
        BrandAnalytics.sendTokenAnalytics(settings, sessionId);
        setOrderTrackingInProgress(false);
        setChatHistory(errorChat);
      });
  };

  const handledirectOrderTrackingViaId = async (mess) => {
    const orderIdPattern = /^(?=.*[0-9])[a-zA-Z0-9.]+$/;

    const orderId = mess.trim().replace(/^#/, "");
    if (orderIdPattern.test(orderId)) {
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
          if (data?.detail?.includes("Order not found")) {
            const notFoundChat = [
              ...chatHistory,
              {
                content: orderId,
                role: "user",
                sentAt: Math.floor(Date.now() / 1000),
              },
              {
                content: `❌ Order for ID "${orderId}" not found. Please enter the correct Order ID.`,
                role: "assistant",
                pending: false,
                sentAt: Math.floor(Date.now() / 1000),
              },
            ];
            setChatHistory(notFoundChat);
            return; // ⛔ Stop further execution
          }

          const shipment = data?.shipments?.track;
          const shipmentStatus = shipment?.status;
          const desc = shipment?.desc || "";
          const eddMs = data.shipments?.edd;

          let delay = false;

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

          const userMessage = orderId;
          const botReply = `Order details:\n${JSON.stringify(extracted, null, 2)}`;

          const updatedChat = [
            ...chatHistory,
            {
              content: userMessage,
              role: "user",
              sentAt: Math.floor(Date.now() / 1000),
            },
            {
              content: botReply,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            },
          ];
          setChatHistory(updatedChat);

          /// here hit tje functions

          StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
            .then(() => {
              console.log("✅ Message stored successfully");
            })
            .catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
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
              content: `Could not fetch order details. Please try after soem time.`,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            },
          ];
          const userMessage = orderId;
          const botReply = `Could not fetch order details. Please try again later.`;
          StoreMessageDB.postMessageInDB(settings, userMessage, botReply)
            .then(() => {
              console.log("✅ Message stored successfully");
            })
            .catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
          setOrderTrackingInProgress(false);
          setChatHistory(errorChat);
        });
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
  };

  const handleSubmit = async (event, message, setMessage) => {
    event.preventDefault();

    if (!message || message === "") return false;

    const mess = message;

    setMessage("");

    if (replyProduct) {
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
      BrandAnalytics.sendTokenAnalytics(settings, sessionId);
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
      BrandAnalytics.sendTokenAnalytics(settings, sessionId);
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
    setReplyProduct(null);
    setLoadingResponse(true);
    BrandAnalytics.sendTokenAnalytics(settings, sessionId);
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
              if (intent?.update_detials) {
                formattedMessage =
                  "Please change the details you want to update : \n\n" +
                  Object.keys(intent.update_detials)
                    .filter(
                      (key) =>
                        key !== "fulfillment_status" &&
                        intent.update_detials[key] !== "" &&
                        intent.update_detials[key] != null
                    )
                    .map((key) => `${key}: ${intent.update_detials[key]}`)
                    .join(",\n\n ");
              } else if (intent?.intent === "update_details") {
                formattedMessage =
                  " Please provide the order id for which you want to update your details :";
              } else formattedMessage = `${intent?.response}`;
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

      BrandAnalytics.connectToLiveAgent(settings, sessionId);
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
        className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain "
        // allm-overflow-y-auto allm-overscroll-contain
      >
        <ChatHistory
          settings={settings}
          history={chatHistory}
          handlePrompt={handlePrompt}
          setReplyProduct={setReplyProduct}
          setOpenBottomSheet={setOpenBottomSheet}
          setIntent={setIntent}
          handledirectOrderTrackingViaId={handledirectOrderTrackingViaId}
          handleOrderTracking={handleOrderTracking}
          orderTrackingInProgress={orderTrackingInProgress}
          setOrderTrackingInProgress={setOrderTrackingInProgress}
          handleUserUpdate={handleUserUpdate}
          cantUpdateUserSoConnectToLiveAgent={
            cantUpdateUserSoConnectToLiveAgent
          }
          directlyUpdateUserDetails={directlyUpdateUserDetails}
        />
      </div>
      <PromptInput
        submit={handleSubmit}
        inputDisabled={settings.inputbarDisabled || loadingResponse}
        buttonDisabled={loadingResponse}
        replyProduct={replyProduct}
        setReplyProduct={setReplyProduct}
        settings={settings}
        orderTrackingInProgress={orderTrackingInProgress}
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
                    Connect with a live agent ?
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

function fixMalformedJson(str) {
  try {
    // First, normalize quotes if it's single-quoted
    if (str.includes("'") && !str.includes('"')) {
      // Replace outer quotes and inner keys/values
      str = str.replace(/'/g, '"');
    }

    // Escape unescaped control characters like newlines
    str = str.replace(/[\u0000-\u001F]+/g, ""); // removes control characters

    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to parse fixed JSON:", e);
    return null;
  }
}

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
        const cleanedPrompts = promptsMatch[1].replace(/'/g, '"');
        prompts = JSON.parse(cleanedPrompts);
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
    let rawIntent = intentMatch[1];
    const intent = fixMalformedJson(rawIntent);
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
