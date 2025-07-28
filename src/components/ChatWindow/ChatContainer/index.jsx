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
import useFetchFollowUpQuestion from "@/hooks/useFetchFollowUpQuestion";
import { io } from "socket.io-client";

// const socket = io("http://localhost:3000");

export default function ChatContainer({
  isChatOpen,
  sessionId,
  settings,
  knownHistory = [],
  openBottomSheet,
  setOpenBottomSheet,
  nudgeClick,
  setNudgeClick,
  nudgeText,
  upsellingProdct,
  humanConnect,
  setHumanConnect,
}) {
  const PRODUCT_CONTEXT_INDENTIFIER = `allm_${settings.embedId}_product_id`;
  const PAGE_CONTEXT_IDENTIFIER = `allm_${settings.embedId}_page_context`;
  const [replyProduct, setReplyProduct] = useState();
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [orderTrackingInProgress, setOrderTrackingInProgress] = useState(false);
  const [intent, setIntent] = useState("");
  const [allowAnonymous, setAllowAnonymus] = useState(false);
  const [loading, setLoading] = useState(false);
  const ANONYMOUS_MODE = `allm_${settings.embedId}_anonymous_mode`;
  const HUMAN_CONNECT = `allm_${settings.embedId}_human_connect`;
  const { fetchFollowUpQuestion } = useFetchFollowUpQuestion(
    settings,
    nudgeText,
    sessionId
  );

  const addUser = async () => {
    try {
      const response = await fetch(
        "https://shoppie-backend.goshoppie.com/api/store_prompts/add-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host: settings.host,
            session_id: settings.sessionId,
            user_details: settings.customer,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ API call failed:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (chatHistory.length === 3) {
      const thirdMessage = chatHistory[2];

      if (
        thirdMessage.role === "assistant" &&
        thirdMessage.animate === false &&
        !thirdMessage.pending
      ) {
        addUser();
      }
    }
  }, [chatHistory]);

  useEffect(() => {
    const stored = window.localStorage.getItem(ANONYMOUS_MODE);
    setAllowAnonymus(stored === "true"); // Ensure it's a boolean
  }, []);

  useEffect(() => {
    if (knownHistory.length !== chatHistory.length)
      setChatHistory([...knownHistory]);
  }, [knownHistory]);

  const initializeTrackOrder = async () => {
    const textResponse =
      "@@INTENT START@@{  'response': 'Please provide us the appropriate data. \n\n We’ll fetch your tracking info in a moment. \n\n',  'intent': 'order_tracking'}@@INTENT END@@";

    const botReply = {
      content: textResponse,
      role: "assistant",
      pending: false,
      animate: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, botReply]);
    await StoreMessageDB.postMessageInDB(settings, "", textResponse);
  };

  const initializeUpdateDetails = async () => {
    const response_template =
      "@@INTENT START@@{  'response': 'Please provide the necessary details, for updating your order details : ',  'intent': 'update_details'}@@INTENT END@@";

    const botReply = {
      content: response_template,
      role: "assistant",
      pending: false,
      animate: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, botReply]);
    await StoreMessageDB.postMessageInDB(settings, "", response_template);
  };

  const initializeProductIssue = async () => {
    const response_template =
      "@@INTENT START@@{  'response': 'Please provide the order number and the mobile number associated with the product issue :  \n\n',  'intent': 'product_issue'}@@INTENT END@@";

    const botReply = {
      content: response_template,
      role: "assistant",
      pending: false,
      animate: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, botReply]);
    await StoreMessageDB.postMessageInDB(settings, "", response_template);
  };

  const handleProductIssueData = async (orderNo, phoneNO) => {
    if (!orderNo || !phoneNO) return null;

    const orderIdPattern = /^(#?[rR][mM])?\d+$/;
    const cleanedPhone = phoneNO.replace(/\s+/g, "");
    const cleanedOrderId = orderNo.replace(/^#/, "");

    if (orderIdPattern.test(orderNo)) {
      const userEntry = {
        content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderNo}`,
        role: "user",
        sentAt: Math.floor(Date.now() / 1000),
      };
      const loadingEntry = {
        content: "Fetching user details, please give us a moment!",
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

      fetch(
        `https://shoppie-backend.goshoppie.com/api/stores/order-detail?order_name=${cleanedOrderId}&host=${settings?.host}&phone=${cleanedPhone}`,
        {
          method: "GET",
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data?.message === "Please enter the right phone number.") {
            const botReply = `Please enter right pair of phone number and associated order id. \n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["Product related issue !" \n,"I am looking for something else!"]\n@@PROMPTS END@@`;

            const message = {
              content: botReply,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            };

            const userMessage = `Phone no: ${cleanedPhone} \n\n Order Id:  ${cleanedOrderId}`;

            setChatHistory((prev) => {
              const withoutLast = prev.slice(0, -1);
              return [...withoutLast, message];
            });

            StoreMessageDB.postMessageInDB(
              settings,
              userMessage,
              botReply
            ).catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          } else {
            const intentPayload = {
              products: data?.products || {},
              intent: "product_issue_details",
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

            const userMessage = `Phone no: ${cleanedPhone} \n\n Order Id:  ${orderNo}`;

            StoreMessageDB.postMessageInDB(
              settings,
              userMessage,
              botReply
            ).catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          }
        })
        .catch((err) => {
          const userMessage = orderNo;
          const botReply = `Could not fetch the details. Please try again later. \n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["I am looking for something else!"]\n@@PROMPTS END@@`;

          const errorChat = [
            ...chatHistory,
            {
              content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderNo}`,
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

          setChatHistory(errorChat);
          StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
            (err) => {
              console.error("❌ Failed to store message:", err);
            }
          );
          BrandAnalytics.sendTokenAnalytics(settings, sessionId);
        });
    } else {
      const prevChatHistory = [
        ...chatHistory,
        {
          content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderNo}`,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "Invalid Order ID. Only enter order id nothing else.",
          role: "assistant",
          pending: false,
          animate: false,
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
    }

    // const message = `Product issue details : \n\n Order Id : ${productIssueOrderId} \n\n Issue type is : ${selectedProductIssue} \n\n Drive URL : ${productIssueUrl}`;

    // const userReply = {
    //   content: message,
    //   role: "user",
    //   pending: false,
    //   animate: false,
    //   sentAt: Math.floor(Date.now() / 1000),
    // };
    // const response_template =
    //   '@@INTENT START@@{"response": "I can\'t help with this, I will connect you to our support team ✨\\n\\n", "intent": "connect_to_human"}@@INTENT END@@';

    // const botReply = {
    //   content: response_template,
    //   role: "assistant",
    //   pending: false,
    //   animate: false,
    //   sentAt: Math.floor(Date.now() / 1000),
    // };

    // setChatHistory((prev) => [...prev, userReply, botReply]);
    // await StoreMessageDB.postMessageInDB(settings, message, response_template);
  };

  const handleMediaUploadProductIssue = async (
    imageFile,
    videoFile,
    selectedProductIssue,
    selectedProducts,
    products
  ) => {
    if (
      !imageFile ||
      !videoFile ||
      !selectedProductIssue ||
      !selectedProducts ||
      !products
    )
      return;

    const uploadFile = async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(
          "https://shoppie-backend.goshoppie.com/api/upload/upload-file",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    };

    const imageUploadResult = await uploadFile(imageFile);
    const videoUploadResult = await uploadFile(videoFile);

    if (!imageUploadResult || !videoUploadResult) {
      const botMessage =
        "Not able to upload your media right nowm please try later !";

      const botResponse = {
        content: botMessage,
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, botResponse]);
      StoreMessageDB.postMessageInDB(settings, "", botMessage).catch((err) => {
        console.error("❌ Failed to store message:", err);
      });
      BrandAnalytics.sendTokenAnalytics(settings, sessionId);
    } else {
      const selectedProductDetails = selectedProducts
        .map((idx) => products[idx]) // Map each selected index to the product
        .map(
          (product, i) =>
            `${i + 1}. Name: ${product.name}${product.variant_title ? ` | Variant: ${product.variant_title}` : ""}${product.quantity ? ` | Qty: ${product.quantity}` : ""}${product.price ? ` | Price: ₹${product.price}` : ""}`
        )
        .join("\n");

      const userMessage =
        `Product issue : ${selectedProductIssue}\n\n` +
        `Issues with these products:\n${selectedProductDetails}\n\n\n` +
        `Media Uploaded\n` +
        `Uploaded image: \n${imageUploadResult.url}\n\n` +
        `Uploaded video: \n${videoUploadResult.url}`;

      const userEntry = {
        content: userMessage,
        role: "user",
        sentAt: Math.floor(Date.now() / 1000),
      };
      const intentPayload = {
        intent: "Product Issue ",
        response:
          "Please connect to our support team they will resolve it in 24 to 48 hours.",
      };
      const botMessage = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;
      const botReply = {
        content: botMessage,
        role: "assistant",
        sentAt: Math.floor(Date.now() / 1000),
      };
      setChatHistory((prev) => [...prev, userEntry, botReply]);
      StoreMessageDB.postMessageInDB(settings, userMessage, botMessage).catch(
        (err) => {
          console.error("❌ Failed to store message:", err);
        }
      );
      BrandAnalytics.sendTokenAnalytics(settings, sessionId);
    }
  };

  const menu = [
    { name: "Track my order", onSubmit: initializeTrackOrder },
    { name: "Update order details", onSubmit: initializeUpdateDetails },
    { name: "My order has been delayed ", onSubmit: initializeTrackOrder },
    {
      name: "Product issue (wrong, missing, damaged)",
      onSubmit: initializeProductIssue,
    },
  ];

  useEffect(() => {
    const storedProductId = window.sessionStorage.getItem(
      PRODUCT_CONTEXT_INDENTIFIER
    );
    const storedPage = window.sessionStorage.getItem(PAGE_CONTEXT_IDENTIFIER);

    const page = `${settings?.shopifyContext?.page_context?.template}_${settings?.shopifyContext?.page_context?.handle}`;

    const productId = settings?.shopifyContext?.product?.id || null;

    const productAndNudge = async () => {
      if (!settings.shopifyContext.product.title) return null;
      try {
        // first store title directly
        const textResponse = `@@TITLE@@${settings.shopifyContext.product.title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

        const productMessage = {
          content: textResponse,
          role: "assistant",
          pending: false,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev, productMessage]);

        await StoreMessageDB.postMessageInDB(settings, "", textResponse);

        // store follow up question
        if (upsellingProdct) {
          let nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@{  
          "products": [    
            {      
              "title": "Adinos - Skin Brightening Duo",      
              "variant_title": "Default Title",      
              "images": "https://cdn.shopify.com/s/files/1/0637/6194/0660/files/Frame_2147226802_1.png?v=1751398080",      
              "compare_at_price": "",      
              "price": "₹999.00",      
              "description": "Skin revival for busy men",      
              "handle": "adonis"    
            }
          ]
        }@@SUGGESTIONS END@@ \n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

          const nudgeUpsellingBotReply = {
            content: nudgeUpsellingText,
            role: "assistant",
            pending: false,
            animate: true,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev, nudgeUpsellingBotReply]);

          fetch(
            `https://shoppie-backend.goshoppie.com/api/products/product-by-title?host=${settings.host}&title=${encodeURIComponent(upsellingProdct?.title)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(async (data) => {
              const followUp = await fetchFollowUpQuestion(nudgeText);
              if (followUp.length) {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [
                      {
                        title: upsellingProdct?.title,
                        variant_title: data.variant_title,
                        images: upsellingProdct?.image,
                        compare_at_price: data.compare_at_price,
                        price: data.price,
                        description: data.description,
                        handle: data.handle,
                      },
                    ],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              } else {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [
                      {
                        title: upsellingProdct?.title,
                        variant_title: data.variant_title,
                        images: upsellingProdct?.image,
                        compare_at_price: data.compare_at_price,
                        price: data.price,
                        description: data.description,
                        handle: data.handle,
                      },
                    ],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              }
            })
            .catch(async () => {
              // not able to load product
              const followUp = await fetchFollowUpQuestion(nudgeText);
              if (followUp.length) {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              } else {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              }
            });
        } else {
          // store nudgeText
          const nudgeResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

          const nudgeBotReply = {
            content: nudgeResponse,
            role: "assistant",
            pending: false,
            animate: true,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev, nudgeBotReply]);

          // generate follow up question

          const followUp = await fetchFollowUpQuestion();
          if (!followUp || !followUp.length) {
            // No follow-up questions, keep nudge message
            return;
          }
          const nudgeFollowUpResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n\n]\n@@PROMPTS END@@`;

          const nudgeFollowUp = {
            content: nudgeFollowUpResponse,
            role: "assistant",
            pending: false,
            animate: false,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev.slice(0, -1), nudgeFollowUp]);

          await StoreMessageDB.postMessageInDB(
            settings,
            "",
            nudgeFollowUpResponse
          );
        }
        setNudgeClick(false);

        window.sessionStorage.setItem(PRODUCT_CONTEXT_INDENTIFIER, productId);
      } catch (error) {
        throw new Error(error);
      }
    };

    const pageAndNudge = async () => {
      if (!settings?.shopifyContext?.page_context?.page_title) return null;
      try {
        // first store title directly
        const textResponse = `@@TITLE@@${settings.shopifyContext.page_context.page_title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

        const productMessage = {
          content: textResponse,
          role: "assistant",
          pending: false,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev, productMessage]);
        const isOrderTrackPage =
          settings.shopifyContext.page_context.page_title === "order-track";

        if (isOrderTrackPage) {
          await StoreMessageDB.postMessageInDB(
            settings,
            "",
            textResponse,
            false
          );
        } else {
          await StoreMessageDB.postMessageInDB(settings, "", textResponse);
        }
        // store nudgeText

        if (upsellingProdct) {
          let nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@{  
          "products": [    
            {      
              "title": "Adinos - Skin Brightening Duo",      
              "variant_title": "Default Title",      
              "images": "https://cdn.shopify.com/s/files/1/0637/6194/0660/files/Frame_2147226802_1.png?v=1751398080",      
              "compare_at_price": "",      
              "price": "₹999.00",      
              "description": "Skin revival for busy men",      
              "handle": "adonis"    
            }
          ]
        }@@SUGGESTIONS END@@ \n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

          const nudgeUpsellingBotReply = {
            content: nudgeUpsellingText,
            role: "assistant",
            pending: false,
            animate: true,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev, nudgeUpsellingBotReply]);

          fetch(
            `https://shoppie-backend.goshoppie.com/api/products/product-by-title?host=${settings.host}&title=${encodeURIComponent(upsellingProdct?.title)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(async (data) => {
              const followUp = await fetchFollowUpQuestion(nudgeText);
              if (followUp.length) {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [
                      {
                        title: upsellingProdct?.title,
                        variant_title: data.variant_title,
                        images: upsellingProdct?.image,
                        compare_at_price: data.compare_at_price,
                        price: data.price,
                        description: data.description,
                        handle: data.handle,
                      },
                    ],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              } else {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [
                      {
                        title: upsellingProdct?.title,
                        variant_title: data.variant_title,
                        images: upsellingProdct?.image,
                        compare_at_price: data.compare_at_price,
                        price: data.price,
                        description: data.description,
                        handle: data.handle,
                      },
                    ],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              }
            })
            .catch(async () => {
              // not able to load product
              const followUp = await fetchFollowUpQuestion(nudgeText);
              if (followUp.length) {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              } else {
                const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                  {
                    products: [],
                  },
                  null,
                  2
                )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

                const nudgeUpsellingBotReply = {
                  content: nudgeUpsellingText,
                  role: "assistant",
                  pending: false,
                  animate: false,
                  sentAt: Math.floor(Date.now() / 1000),
                };

                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  nudgeUpsellingBotReply,
                ]);
                await StoreMessageDB.postMessageInDB(
                  settings,
                  "",
                  nudgeUpsellingText
                );
              }
            });
        } else {
          const nudgeResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

          const nudgeBotReply = {
            content: nudgeResponse,
            role: "assistant",
            pending: false,
            animate: true,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev, nudgeBotReply]);

          // generate follow up question

          const followUp = await fetchFollowUpQuestion();
          if (!followUp || !followUp.length) {
            // No follow-up questions, keep nudge message
            return;
          }

          // store follow up question

          const nudgeFollowUpResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n\n]\n@@PROMPTS END@@`;

          const nudgeFollowUp = {
            content: nudgeFollowUpResponse,
            role: "assistant",
            pending: false,
            animate: false,
            sentAt: Math.floor(Date.now() / 1000),
          };

          setChatHistory((prev) => [...prev.slice(0, -1), nudgeFollowUp]);

          if (isOrderTrackPage) {
            await StoreMessageDB.postMessageInDB(
              settings,
              "",
              nudgeFollowUpResponse,
              false
            );
          } else {
            await StoreMessageDB.postMessageInDB(
              settings,
              "",
              nudgeFollowUpResponse
            );
          }
        }
        setNudgeClick(false);
        window.sessionStorage.setItem(PAGE_CONTEXT_IDENTIFIER, page);
      } catch (error) {
        throw new Error(error);
      }
    };

    const nudgeOnly = async () => {
      if (upsellingProdct) {
        let nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@{  
          "products": [    
            {      
              "title": "Adinos - Skin Brightening Duo",      
              "variant_title": "Default Title",      
              "images": "https://cdn.shopify.com/s/files/1/0637/6194/0660/files/Frame_2147226802_1.png?v=1751398080",      
              "compare_at_price": "",      
              "price": "₹999.00",      
              "description": "Skin revival for busy men",      
              "handle": "adonis"    
            }
          ]
        }@@SUGGESTIONS END@@ \n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

        const nudgeUpsellingBotReply = {
          content: nudgeUpsellingText,
          role: "assistant",
          pending: false,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev, nudgeUpsellingBotReply]);
        fetch(
          `https://shoppie-backend.goshoppie.com/api/products/product-by-title?host=${settings.host}&title=${encodeURIComponent(upsellingProdct?.title)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(async (data) => {
            const followUp = await fetchFollowUpQuestion(nudgeText);
            if (followUp.length) {
              const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                {
                  products: [
                    {
                      title: upsellingProdct?.title,
                      variant_title: data.variant_title,
                      images: upsellingProdct?.image,
                      compare_at_price: data.compare_at_price,
                      price: data.price,
                      description: data.description,
                      handle: data.handle,
                    },
                  ],
                },
                null,
                2
              )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

              const nudgeUpsellingBotReply = {
                content: nudgeUpsellingText,
                role: "assistant",
                pending: false,
                animate: false,
                sentAt: Math.floor(Date.now() / 1000),
              };

              setChatHistory((prev) => [
                ...prev.slice(0, -1),
                nudgeUpsellingBotReply,
              ]);
              await StoreMessageDB.postMessageInDB(
                settings,
                "",
                nudgeUpsellingText
              );
            } else {
              const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                {
                  products: [
                    {
                      title: upsellingProdct?.title,
                      variant_title: data.variant_title,
                      images: upsellingProdct?.image,
                      compare_at_price: data.compare_at_price,
                      price: data.price,
                      description: data.description,
                      handle: data.handle,
                    },
                  ],
                },
                null,
                2
              )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

              const nudgeUpsellingBotReply = {
                content: nudgeUpsellingText,
                role: "assistant",
                pending: false,
                animate: false,
                sentAt: Math.floor(Date.now() / 1000),
              };

              setChatHistory((prev) => [
                ...prev.slice(0, -1),
                nudgeUpsellingBotReply,
              ]);
              await StoreMessageDB.postMessageInDB(
                settings,
                "",
                nudgeUpsellingText
              );
            }
          })
          .catch(async () => {
            // not able to load product
            const followUp = await fetchFollowUpQuestion(nudgeText);
            if (followUp.length) {
              const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                {
                  products: [],
                },
                null,
                2
              )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n]\n@@PROMPTS END@@`;

              const nudgeUpsellingBotReply = {
                content: nudgeUpsellingText,
                role: "assistant",
                pending: false,
                animate: false,
                sentAt: Math.floor(Date.now() / 1000),
              };

              setChatHistory((prev) => [
                ...prev.slice(0, -1),
                nudgeUpsellingBotReply,
              ]);
              await StoreMessageDB.postMessageInDB(
                settings,
                "",
                nudgeUpsellingText
              );
            } else {
              const nudgeUpsellingText = `${nudgeText}✨\n\n@@SUGGESTIONS START@@${JSON.stringify(
                {
                  products: [],
                },
                null,
                2
              )}@@SUGGESTIONS END@@\n\n@n@@PROMPTS START@@\n[]\n@@PROMPTS END@@`;

              const nudgeUpsellingBotReply = {
                content: nudgeUpsellingText,
                role: "assistant",
                pending: false,
                animate: false,
                sentAt: Math.floor(Date.now() / 1000),
              };

              setChatHistory((prev) => [
                ...prev.slice(0, -1),
                nudgeUpsellingBotReply,
              ]);
              await StoreMessageDB.postMessageInDB(
                settings,
                "",
                nudgeUpsellingText
              );
            }
          });
      } else {
        const nudgeResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

        const nudgeBotReply = {
          content: nudgeResponse,
          role: "assistant",
          pending: false,
          animate: true,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev, nudgeBotReply]);

        const followUp = await fetchFollowUpQuestion();
        if (!followUp || !followUp.length) {
          // No follow-up questions, keep nudge message
          return;
        }

        // store follow up question

        const nudgeFollowUpResponse = `${nudgeText}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "${followUp[0]}",\n  " ${followUp[1]}"\n,\n  " ${followUp[2]}"\n\n]\n@@PROMPTS END@@`;

        const nudgeFollowUp = {
          content: nudgeFollowUpResponse,
          role: "assistant",
          pending: false,
          animate: false,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev.slice(0, -1), nudgeFollowUp]);

        const isOrderTrackPage =
          settings.shopifyContext.page_context.page_title === "order-track";

        if (isOrderTrackPage) {
          await StoreMessageDB.postMessageInDB(
            settings,
            "",
            nudgeFollowUpResponse,
            false
          );
        } else {
          await StoreMessageDB.postMessageInDB(
            settings,
            "",
            nudgeFollowUpResponse
          );
        }
      }

      setNudgeClick(false);
    };

    const productOnly = async () => {
      if (!settings.shopifyContext.product.title) return null;
      const textResponse = `@@TITLE@@${settings.shopifyContext.product.title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

      const productMessage = {
        content: textResponse,
        role: "assistant",
        pending: false,
        animate: true,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, productMessage]);

      const followUpQuestion = await fetchFollowUpQuestion(
        settings.shopifyContext.product.title
      );
      const followUpText = `@@TITLE@@${settings.shopifyContext.product.title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "${followUpQuestion[0]}",\n  " ${followUpQuestion[1]}"\n,\n  " ${followUpQuestion[2]}"\n\n]\n@@PROMPTS END@@`;

      const followUpMessage = {
        content: followUpText,
        role: "assistant",
        pending: false,
        animate: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev.slice(0, -1), followUpMessage]);

      await StoreMessageDB.postMessageInDB(settings, "", followUpText);

      window.sessionStorage.setItem(PRODUCT_CONTEXT_INDENTIFIER, productId);
    };

    const pageOnly = async () => {
      if (!settings.shopifyContext.page_context.page_title) return null;
      console.log("page only clicked ");

      const textResponse = `@@TITLE@@${settings.shopifyContext.page_context.page_title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "$  "hello"\n\n]\n@@PROMPTS END@@`;

      const productMessage = {
        content: textResponse,
        role: "assistant",
        pending: false,
        animate: true,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, productMessage]);

      const followUpQuestion = await fetchFollowUpQuestion(
        settings.shopifyContext.page_context.page_title
      );
      const followUpText = `@@TITLE@@${settings.shopifyContext.page_context.page_title}@@TITLT END@@✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "${followUpQuestion[0]}",\n  " ${followUpQuestion[1]}"\n,\n  " ${followUpQuestion[2]}"\n\n]\n@@PROMPTS END@@`;

      const followUpMessage = {
        content: followUpText,
        role: "assistant",
        pending: false,
        animate: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev.slice(0, -1), followUpMessage]);

      const isOrderTrackPage =
        settings.shopifyContext.page_context.page_title === "order-track";

      // Send `include: false` only on the order-track page
      if (isOrderTrackPage) {
        await StoreMessageDB.postMessageInDB(settings, "", followUpText, false);
      } else {
        await StoreMessageDB.postMessageInDB(settings, "", followUpText);
      }

      window.sessionStorage.setItem(PAGE_CONTEXT_IDENTIFIER, page);
    };

    // products page
    if (productId) {
      if (storedProductId !== productId && nudgeClick) {
        productAndNudge();
        BrandAnalytics.sendAnalytics(settings, sessionId, "tap_widget");
      } else if (nudgeClick) {
        nudgeOnly();
        BrandAnalytics.sendAnalytics(settings, sessionId, "tap_widget");
      } else if (storedProductId !== productId) {
        productOnly();
      }
    }
    // index page
    else if (settings?.shopifyContext?.page_context?.template === "index") {
      if (nudgeClick) {
        nudgeOnly();
        BrandAnalytics.sendAnalytics(settings, sessionId, "tap_widget");
      }
    }
    // normal page
    else if (page) {
      if (storedPage !== page && nudgeClick) {
        pageAndNudge();
        BrandAnalytics.sendAnalytics(settings, sessionId, "tap_widget");
      } else if (nudgeClick) {
        nudgeOnly();
        BrandAnalytics.sendAnalytics(settings, sessionId, "tap_widget");
      } else if (storedPage !== page && !nudgeClick) {
        pageOnly();
      }
    }
  }, [settings?.shopifyContext, nudgeClick, nudgeText]);

  const handleUserUpdate = (orderId, phoneNo) => {
    const orderIdPattern = /^(#?[rR][mM])?\d+$/;
    const cleanedPhone = phoneNo.replace(/\s+/g, "");
    const cleanedOrderId = orderId.replace(/^#/, "");

    if (orderIdPattern.test(orderId)) {
      const userEntry = {
        content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderId}`,
        role: "user",
        sentAt: Math.floor(Date.now() / 1000),
      };
      const loadingEntry = {
        content: "Fetching user details, please give us a moment!",
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

      fetch(
        `https://shoppie-backend.goshoppie.com/api/stores/order-fulfillment-detail?host=${settings?.host}&order_name=${cleanedOrderId}&phone=${cleanedPhone}`,
        {
          method: "GET",
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data?.message === "Please enter the right phone number.") {
            const botReply = `Please enter right pair of phone number and associated order id. \n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["Update delivery details again!",\n "I am looking for something else!"]\n@@PROMPTS END@@`;

            const message = {
              content: botReply,
              role: "assistant",
              pending: false,
              sentAt: Math.floor(Date.now() / 1000),
            };

            const userMessage = `Phone no: ${cleanedPhone} \n\n Order Id:  ${orderId}`;

            setChatHistory((prev) => {
              const withoutLast = prev.slice(0, -1);
              return [...withoutLast, message];
            });

            StoreMessageDB.postMessageInDB(
              settings,
              userMessage,
              botReply
            ).catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          } else if (data?.fulfillment_status === null) {
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

            const userMessage = `Phone no: ${cleanedPhone} \n\n Order Id:  ${orderId}`;

            setChatHistory((prev) => {
              const withoutLast = prev.slice(0, -1);
              return [...withoutLast, message];
            });

            StoreMessageDB.postMessageInDB(
              settings,
              userMessage,
              botReply
            ).catch((err) => {
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

            const userMessage = `Phone no: ${cleanedPhone} \n\n Order Id:  ${orderId}`;

            StoreMessageDB.postMessageInDB(
              settings,
              userMessage,
              botReply
            ).catch((err) => {
              console.error("❌ Failed to store message:", err);
            });
            BrandAnalytics.sendTokenAnalytics(settings, sessionId);
          }
        })
        .catch((err) => {
          // Update delivery details again!
          // I am looking for something else!
          const userMessage = orderId;
          const botReply = `Could not update user details. Please try again later. \n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["Update delivery details again!",\n "I am looking for something else!"]\n@@PROMPTS END@@`;

          const errorChat = [
            ...chatHistory,
            {
              content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderId}`,
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

          setChatHistory(errorChat);
          StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
            (err) => {
              console.error("❌ Failed to store message:", err);
            }
          );
          BrandAnalytics.sendTokenAnalytics(settings, sessionId);
        });
    } else {
      const prevChatHistory = [
        ...chatHistory,
        {
          content: `Phone no: ${cleanedPhone} \n\n Order Id: ${orderId}`,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
        {
          content: "Invalid Order ID. Only enter order id nothing else.",
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
      content: "Fetching user details, please give us a moment!",
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

    fetch(
      `https://shoppie-backend.goshoppie.com/api/stores/order-update-info`,
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

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
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

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
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

    StoreMessageDB.postMessageInDB(settings, userMessage, botMessage).catch(
      (err) => {
        console.error("❌ Failed to store message:", err);
      }
    );
  };

  const handleOrderTracking = async (type, value) => {
    const cleanedValue =
      type === "phone" ? value.replace(/\s+/g, "") : value.trim();
    const userEntry = {
      content: value,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };
    const loadingEntry = {
      content: "Fetching user details, please give us a moment!",
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, loadingEntry]);

    const queryParam =
      type !== "phone" ? `email=${value}` : `phone=${cleanedValue}`;

    fetch(
      `https://shoppie-backend.goshoppie.com/api/stores/order-names?host=${settings.host}&${queryParam}`,
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

        if (data?.order_names.length > 0) {
          const intentPayload = {
            order_names: data?.order_names,
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

          StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
            (err) => {
              console.error("❌ Failed to store message:", err);
            }
          );
          BrandAnalytics.sendTokenAnalytics(settings, sessionId);
        } else {
          const botReply = `**${data?.name}** due to some technical issue i am not able to fetch your order using ${value}, please try order tracking again using Order ID ✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["Track your order again ?",\n "I have product related issue ?"\n,\n  "What are trendy products ?"]\n@@PROMPTS END@@`;

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
          setOrderTrackingInProgress(false);
          StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
            (err) => {
              console.error("❌ Failed to store message:", err);
            }
          );
          BrandAnalytics.sendTokenAnalytics(settings, sessionId);
        }
      })
      .catch((err) => {
        const botReply = `Could not fetch order details. Please try again later.\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@["Track your order again ?",\n "I have product related issue ?"\n,\n  "What are trendy products ?"]\n@@PROMPTS END@@`;
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
        StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
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
        content: "Fetching user details, please give us a moment!",
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };
      setChatHistory([...chatHistory, userEntry, loadingEntry]);

      // Fetch order detail
      fetch(
        `https://shoppie-backend.goshoppie.com/api/stores/order-detail?order_name=${orderId}&host=${settings?.host}`
      )
        .then((res) => res.json())
        .then(async (data) => {
          if (data?.detail?.includes("Order recently created")) {
            const date = new Date(data?.created_at);

            const readableDate = new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium", // or "full", "long", "short"
              timeStyle: "short", // or "full", "long", "medium"
              timeZone: "Asia/Kolkata",
            }).format(date);

            const reply = `Your order "${orderId}" was placed recently on ${readableDate}, therefore it hasn’t been dispatched yet. Please try again after 24 hours for an update.✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n  "I was looking for something else !"\n, "Show me some more products !"\n\n]\n@@PROMPTS END@@`;

            const notFoundChat = [
              ...chatHistory,
              {
                content: orderId,
                role: "user",
                sentAt: Math.floor(Date.now() / 1000),
              },
              {
                content: reply,
                role: "assistant",
                pending: false,
                sentAt: Math.floor(Date.now() / 1000),
              },
            ];
            setChatHistory(notFoundChat);
            setOrderTrackingInProgress(false);
            try {
              await StoreMessageDB.postMessageInDB(settings, orderId, reply);
            } catch (err) {
              console.error("❌ Failed to store message:", err);
            }
            return; // ⛔ Stop further execution
          } else if (data?.detail?.includes("Order not found")) {
            const botReply = `❌ Order for ID "${orderId}" not found. Please enter the correct Order ID.\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n  "I was looking for something else !"\n, "Show me some more products !"\n\n]\n@@PROMPTS END@@`;
            const notFoundChat = [
              ...chatHistory,
              {
                content: orderId,
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
            setChatHistory(notFoundChat);
            setOrderTrackingInProgress(false);
            try {
              // Store first message
              await StoreMessageDB.postMessageInDB(settings, orderId, botReply);
              // Store second message only after first is successful
              await StoreMessageDB.postMessageInDB(settings, "", rtoReply);
            } catch (err) {
              console.error("❌ Failed to store message:", err);
            }
            return; // ⛔ Stop further execution
          } else {
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
              shipping_address: data.shipping_address,
              user: data?.user_details,
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

            if (
              orderId === "RM173493" ||
              orderId === "RM5562" ||
              shipment.status.includes("RTO")
            ) {
              const intentPayload = {
                intent: "validation_for_cloning",
                message: `Please enter your realted mobile no with this order id ${orderId}, for reordering ✨`,
                order_name: orderId,
                data: extracted,
              };

              const rtoReply = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;

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
                {
                  content: rtoReply,
                  role: "assistant",
                  pending: false,
                  sentAt: Math.floor(Date.now() / 1000),
                },
              ];
              setChatHistory(updatedChat);

              try {
                // Store first message
                await StoreMessageDB.postMessageInDB(
                  settings,
                  userMessage,
                  botReply
                );
                // Store second message only after first is successful
                await StoreMessageDB.postMessageInDB(settings, "", rtoReply);
              } catch (err) {
                console.error("❌ Failed to store message:", err);
              }
            } else {
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
              StoreMessageDB.postMessageInDB(
                settings,
                userMessage,
                botReply
              ).catch((err) => {
                console.error("❌ Failed to store message:", err);
              });
            }
          }
        })
        .catch((err) => {
          const botReply = `Could not fetch order details. Please try again later.`;
          const errorChat = [
            ...chatHistory,
            {
              content: orderId,
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
          const userMessage = orderId;

          StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
            (err) => {
              console.error("❌ Failed to store message:", err);
            }
          );
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

  const matchPhoneNoForReorder = async (orderId, data, mobileNo) => {
    // Function to clean phone number by removing non-digits and country code
    const cleanPhoneNumber = (phone) => {
      if (!phone) return ""; // Handle null or undefined
      // Convert to string, trim whitespace, remove non-digits
      let cleaned = String(phone).trim().replace(/\D/g, "");
      // Remove leading '91' country code if present
      if (cleaned.startsWith("91")) {
        cleaned = cleaned.slice(2);
      }
      return cleaned;
    };

    // Clean the input mobile number
    const cleanedMobileNo = cleanPhoneNumber(mobileNo);
    // Clean phone_1 and phone_2
    const cleanedPhone1 = cleanPhoneNumber(data.user.phone_1);
    const cleanedPhone2 = cleanPhoneNumber(data.user.phone_2);

    const userMessage = `Validate with this no : ${cleanedMobileNo}`;

    const userEntry = {
      content: userMessage,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry]);

    // Check if cleanedMobileNo matches either cleanedPhone1 or cleanedPhone2
    const isMatch =
      cleanedMobileNo === cleanedPhone1 || cleanedMobileNo === cleanedPhone2;

    if (isMatch) {
      applyForReplacement(orderId, userMessage, data);
    } else {
      const botReply = `Your entered mobile ${cleanedMobileNo} no didn't match your previous checkout/ shipping no please try again later✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n  "What are your refund policy !"\n\n]\n@@PROMPTS END@@`;

      const botMessage = {
        content: botReply,
        role: "assistant",
        pending: false,
        sentAt: Math.floor(Date.now() / 1000),
      };

      setChatHistory((prev) => [...prev, botMessage]);
      StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
        (err) => {
          console.error("❌ Failed to store message:", err);
        }
      );
    }
  };

  const applyForReplacement = async (orderId, userMessage, data) => {
    const intentPayload = {
      intent: "check_cloning_details",
      message: `Check corresponding details for your orderID : ${orderId}`,
      order_name: orderId,
      data: data,
    };

    const reply = `@@INTENT START@@${JSON.stringify(intentPayload)}@@INTENT END@@`;

    const botReply = {
      content: reply,
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, botReply]);
    ``;
    StoreMessageDB.postMessageInDB(settings, userMessage, reply).catch(
      (err) => {
        console.error("❌ Failed to store message:", err);
      }
    );
  };

  const submitReplacement = async (data) => {
    const body = {
      host: settings.host,
      session_id: settings.sessionId,
      order_name: data.order_id,
      user_details: {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
      },
      address: {
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        zip: data.zip,
        province: data.province,
        country: data.country,
      },
    };

    const userMessage = `
    Submit details for reordering!

- **Customer Email:** ${body.user_details.email}
- **Phone Number:** ${body.user_details.phone}
- **Address:**
  - Name: "${body.user_details.first_name} ${body.user_details.last_name}"
  - Address: ${body.address.address1}
  ${body.address.address2 ? `  - Address 2: ${body.address.address2}` : ""}
  - City: ${body.address.city}
  - State: ${body.address.province}
  - Pincode: ${body.address.zip}
`.trim();

    const userEntry = {
      content: userMessage,
      role: "user",
      sentAt: Math.floor(Date.now() / 1000),
    };
    const loadingEntry = {
      content: "Creating your order, give me a second ☺️",
      role: "assistant",
      pending: false,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setChatHistory((prev) => [...prev, userEntry, loadingEntry]);
    fetch(`https://shoppie-backend.goshoppie.com/api/stores/rto-order`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(async (data) => {
        const botReply = `Your order is successfully recreated, order id is ${data.order_name}✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "Show me some trendy products !",\n  "Help me with something !"\n\n]\n@@PROMPTS END@@`;

        const botMessage = {
          content: botReply,
          role: "assistant",
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev.slice(0, -1), botMessage]);

        StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
      })
      .catch((err) => {
        const botReply = `Could not reorder right now . Please try again later.✨\n\n@@SUGGESTIONS START@@\n{\n    "products": []\n}\n@@SUGGESTIONS END@@\n\n@@PROMPTS START@@\n[\n "Show me some trendy products !",\n  "Help me with something !"\n\n]\n@@PROMPTS END@@`;

        const botMessage = {
          content: botReply,
          role: "assistant",
          pending: false,
          sentAt: Math.floor(Date.now() / 1000),
        };

        setChatHistory((prev) => [...prev.slice(0, -1), botMessage]);
        StoreMessageDB.postMessageInDB(settings, userMessage, botReply).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
      });
  };

  // useEffect(() => {
  //   const socketPresent = window.localStorage.getItem(HUMAN_CONNECT);
  //   if (socketPresent === "true") {
  //     console.log("connected to socket ");

  //     socket.emit("joinRoom", {
  //       room: settings.sessionId,
  //       userName: "user",
  //     });
  //   }
  // }, []);

  const connectToSocket = async () => {
    setHumanConnect(true);

    socket.emit("joinRoom", {
      room: settings.sessionId,
      userName: "user",
    });

    // Step 2: Try to create a ticket
    try {
      const res = await fetch("http://localhost:3000/api/ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Ticket creation failed:", data.error);
      } else {
        console.log("Ticket created:", data.ticket);
        const textResponse = `@@TITLE@@Ticket created ${data.ticket.id}@@TITLT END@@`;
        setChatHistory((prev) => [
          ...prev,
          {
            content: textResponse,
            role: "assistant",
            pending: false,
            userMessage: " ",
            animate: false,
            sentAt: Math.floor(Date.now() / 1000),
          },
        ]);

        StoreMessageDB.postMessageInDB(settings, "", textResponse).catch(
          (err) => {
            console.error("❌ Failed to store message:", err);
          }
        );
      }
    } catch (err) {
      console.error("Error calling ticket API:", err);
    }
  };

  // useEffect(() => {
  //   const handleMessage = async (data) => {
  //     setChatHistory((prev) => [
  //       ...prev,
  //       {
  //         content: data.message,
  //         role: "assistant",
  //         pending: false,
  //         userMessage: " ",
  //         animate: false,
  //         sentAt: Math.floor(Date.now() / 1000),
  //       },
  //     ]);

  //     await StoreMessageDB.postMessageInDB(settings, "", data.message).catch(
  //       (err) => {
  //         console.error("❌ Failed to store message:", err);
  //       }
  //     );
  //   };

  //   const handleTicketClosed = async (data) => {
  //     const textResponse = `@@TITLE@@${data.userName} closed ticket ${data.ticketId}@@TITLT END@@`;
  //     setChatHistory((prev) => [
  //       ...prev,
  //       {
  //         content: textResponse,
  //         role: "assistant",
  //         pending: false,
  //         userMessage: " ",
  //         animate: false,
  //         sentAt: Math.floor(Date.now() / 1000),
  //       },
  //     ]);

  //     await StoreMessageDB.postMessageInDB(settings, "", textResponse).catch(
  //       (err) => {
  //         console.error("❌ Failed to store message:", err);
  //       }
  //     );
  //     console.log("handleTicketClosed calling setHumanConnect(false)");
  //     setHumanConnect(false);
  //   };

  //   socket.on("message", handleMessage);
  //   socket.on("ticket_closed", handleTicketClosed);

  //   return () => {
  //     socket.off("message", handleMessage);
  //     socket.off("ticket_closed", handleTicketClosed);
  //   };
  // }, []);

  const handleSubmit = async (event, message, setMessage) => {
    event.preventDefault();

    if (!message || message === "") return false;

    const mess = message;

    setMessage("");
    if (humanConnect) {
      const data = { room: sessionId, message: mess, sender: "user" };
      socket.emit("message", data);
      const prevChatHistory = [
        ...chatHistory,
        {
          content: mess,
          role: "user",
          sentAt: Math.floor(Date.now() / 1000),
        },
      ];
      setChatHistory(prevChatHistory);
      StoreMessageDB.postMessageInDB(settings, mess, "").catch((err) => {
        console.error("❌ Failed to store message:", err);
      });
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

      if (!promptMessage || !promptMessage?.userMessage || humanConnect) {
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
            _chatHistory,
            settings.host,
            settings.embedId,
            settings.sessionId
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
        `https://shoppie-backend.goshoppie.com/api/store_prompts/share-summary?host=${settings.host}`,
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
        `https://shoppie-backend.goshoppie.com/api/store_prompts/share-summary?host=${settings.host}`,
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
        className="allm-flex-1 allm-min-h-0 allm-pb-8"
        // className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain "
        // allm-overflow-y-auto allm-overscroll-contain
      >
        <ChatHistory
          isChatOpen={isChatOpen}
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
          applyForReplacement={applyForReplacement}
          submitReplacement={submitReplacement}
          matchPhoneNoForReorder={matchPhoneNoForReorder}
          menu={menu}
          handleProductIssueData={handleProductIssueData}
          setHumanConnect={setHumanConnect}
          connectToSocket={connectToSocket}
          handleMediaUploadProductIssue={handleMediaUploadProductIssue}
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
