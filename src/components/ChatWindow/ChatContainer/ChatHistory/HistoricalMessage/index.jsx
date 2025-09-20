import React, {
  memo,
  forwardRef,
  useState,
  useEffect,
  Suspense,
  useRef,
} from "react";
import { Warning, UploadSimple, XCircle } from "@phosphor-icons/react";
import { embedderSettings } from "@/main";
import { v4 } from "uuid";
import { ChatTeardropDots } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import BrandAnalytics from "@/models/brandAnalytics";
import toast from "react-hot-toast";

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

  const titleMatch = message.match(/@@TITLE@@(.*?)@@TITLT END@@/);

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
        title: !!titleMatch,
        titleText: titleMatch ? titleMatch[1] : "",
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
        title: !!titleMatch,
        titleText: titleMatch ? titleMatch[1] : "",
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
    textBeforeSuggestions = message.substring(0, intentMatch.index);
    const textAfterIntent =
      message.substring(0, intentMatch.index) +
      message.substring(intentMatch.index + intentMatch[0].length);

    return {
      title: !!titleMatch,
      titleText: titleMatch ? titleMatch[1] : "",
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
    title: !!titleMatch,
    titleText: titleMatch ? titleMatch[1] : "",
    textBeforeSuggestions,
    suggestions: null,
    textAfterSuggestionsBeforePrompts: "",
    prompts: null,
    textAfterPrompts: message,
    intent: null,
  };
};

const ProductSuggestions = ({
  suggestions,
  setReplyProduct,
  embedSettings,
}) => {
  if (!suggestions) return null;

  if (!suggestions.products) {
    return (
      <div className="allm-mt-4 allm-border-t allm-pt-3 allm-border-gray-200">
        <div className="allm-text-[14px] allm-font-medium allm-mb-3">
          Product suggestions available
        </div>
        <div className="allm-text-xs allm-text-gray-500">
          We have product suggestions for you, but they couldn't be displayed
          properly.
        </div>
      </div>
    );
  }

  return (
    <div className="allm-mt-[12px] allm-mb-[8px]">
      <div className="allm-flex allm-space-x-3 allm-overflow-x-auto allm-no-scroll">
        {suggestions.products.map((product) => (
          <ProductCard
            key={product?.id || Math.random().toString()}
            product={product}
            setReplyProduct={setReplyProduct}
            embedSettings={embedSettings}
          />
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, setReplyProduct, embedSettings }) => {
  const [imageError, setImageError] = React.useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setReplyProduct(product);
  };

  const handleAnchorClick = async (e) => {
    e.preventDefault(); // Prevent anchor's default behavior (navigation)

    // Send analytics
    BrandAnalytics.sendAnalytics(
      embedSettings,
      embedSettings.sessionId,
      "tap_product",
      product
    );

    // After the analytics is sent, you can now navigate if needed
    if (embedSettings.sessionId !== "d5c5134a-ab48-458d-bc90-16cb66456426")
      if (product?.buy_link || product?.purchase_link || product?.handle) {
        window.location.href =
          product?.buy_link ||
          product?.purchase_link ||
          `https://${embedSettings.brandDomain}/products/${product?.handle}`;
      }
  };

  // Click outside video to close overlay
  useEffect(() => {
    function handleClick(event) {
      if (
        overlayRef.current &&
        videoRef.current &&
        !videoRef.current.contains(event.target)
      ) {
        setShowVideoOverlay(false);
      }
    }
    if (showVideoOverlay) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showVideoOverlay]);

  return (
    <div>
      <a
        href={product?.buy_link || product?.purchase_link || product?.handle}
        rel="noopener noreferrer"
        className="allm-rounded-[10px] allm-cursor-pointer allm-overflow-hidden allm-flex allm-flex-col allm-max-w-[220px] allm-min-w-[220px] "
        style={{ textDecoration: "none" }}
        onClick={handleAnchorClick}
      >
        <div>
          {(product?.image_url || product?.images) && !imageError ? (
            <div
              className={`allm-flex allm-justify-center allm-bg-[#1B1B1B] allm-overflow-hidden  ${embedSettings?.host === "c2hvcHBpZXB1YmxpYy5teXNob3BpZnkuY29t" ? "allm-h-[200px]" : "allm-h-[260px]"}`}
            >
              <img
                src={
                  product?.image_url ||
                  product?.product_images ||
                  product?.images
                }
                alt={product?.title || product?.product_name || product?.images}
                className="allm-h-full allm-w-full allm-object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="allm-flex allm-justify-center allm-items-center allm-bg-[#1B1B1B] allm-h-[190px]">
              <span className="allm-text-gray-400 allm-text-xs">
                Product image
              </span>
            </div>
          )}
        </div>
        <div
          style={{ backgroundColor: embedSettings.cardBgColor }}
          className="allm-p-[10px] allm-flex allm-flex-col allm-gap-2 allm-min-h-[70px]"
        >
          <div
            style={{
              color: embedSettings.cardTextColor,
            }}
            className="allm-font-semiboldallm-w-full allm-text-[13.5px] allm-line-clamp-2 allm-h-[35px] allm-min-h-[35px] allm-max-h-[35px] allm-leading-[16px]"
          >
            <span className="allm-line-clamp-2">
              {product?.title || product?.product_name}
            </span>
          </div>
          <div className="allm-flex allm-w-full allm-justify-between allm-items-center allm-min-h-[40px] allm-h-[40px]">
            <div>
              <div
                style={{
                  color: embedSettings.cardTextColor,
                }}
                className=" allm-font-bold allm-mr-2 allm-text-[18px] allm-mb-1"
              >
                {product?.discounted_price ||
                  product?.price ||
                  product?.product_prices?.Discounted_price}
              </div>
              <div
                style={{
                  color: embedSettings.cardTextSubColour,
                }}
                className="allm-line-through allm-font-medium allm-mr-2 allm-text-[12px]"
              >
                {product?.original_price ||
                  product?.compare_at_price ||
                  product?.product_prices?.Original_price}
              </div>
            </div>
            <div
              onClick={handleButtonClick} // Handle button click separately
              className="allm-w-[30px] allm-h-[30px] allm-rounded-lg allm-bg-white allm-flex allm-items-center allm-justify-center"
            >
              <ChatTeardropDots size={20} color="black" />
            </div>
          </div>
        </div>
      </a>
      {product?.media_url && (
        <OptimizedVideoPlayer
          embedSettings={embedSettings}
          mediaLink={product?.media_url}
        />
      )}
    </div>
  );
};

const HistoricalMessage = forwardRef(
  (
    {
      uuid = v4(),
      message,
      settings,
      role,
      sources = [],
      error = false,
      errorMsg = null,
      sentAt,
      isLastBotReply,
      handlePrompt,
      setReplyProduct,
      lastMessage,
      setOpenBottomSheet,
      setIntent,
      isLastMessage,
      handleOrderTracking,
      handledirectOrderTrackingViaId,
      setOrderTrackingInProgress,
      orderTrackingInProgress,
      handleUserUpdate,
      cantUpdateUserSoConnectToLiveAgent,
      directlyUpdateUserDetails,
      isFirstMessage,
      applyForReplacement,
      submitReplacement,
      matchPhoneNoForReorder,
      menu,
      handleProductIssueData,
      connectToSocket,
      handleMediaUploadProductIssue,
    },
    ref
  ) => {
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);
    if (message === "") return null;

    // State for parsed data
    const [parsedData, setParsedData] = useState(null);
    // Async parsing logic
    useEffect(() => {
      const parseMessage = async () => {
        try {
          let result;
          if (role === "user") {
            result = await parseMessageWithProductByUser(message);
          } else {
            result = await parseMessageWithSuggestionsAndPrompts(message);
          }
          setParsedData(result);
        } catch (err) {
          console.error("Error parsing message:", err);
          setParsedData({}); // Fallback to empty object
        }
      };

      parseMessage();
    }, [role, message]);

    // Wait for parsedData before proceeding
    if (!parsedData) {
      return null; // or a loading spinner: <div>Loading...</div>
    }

    // Component logic to render parsed data
    const RenderContent = () => {
      if (!parsedData) {
        throw new Promise((resolve) => setTimeout(resolve, 0)); // Suspend until parsedData is ready
      }

      // Destructure only if parsedData is valid
      const {
        product,
        textAfterProduct,
        textBeforeSuggestions,
        suggestions,
        prompts,
        intent,
        title,
        titleText,
      } = parsedData || {};

      // const { product, textAfterProduct } = parsedData;
      // const { textBeforeSuggestions, suggestions, prompts, intent } = parsedData;

      const [selectedOption, setSelectedOption] = useState("phone");
      const [formValue, setFormValue] = useState("");

      const [selectedProductIssue, setSelectedProductIssue] = useState("");
      const [updateDetailsOrderId, setUpdateDetailsOrderId] = useState("");
      const [updateDetailsPhoneNo, setUpdateDetailsPhoneNo] = useState("");

      const [newPhoneNumber, setNewPhoneNumber] = useState("");
      const [address, setAddress] = useState(
        intent?.update_detials?.address || ""
      );
      const [city, setCity] = useState(intent?.update_detials?.city || "");
      const [zip, setZip] = useState(intent?.update_detials?.zip || "");
      const [isFormChanged, setIsFormChanged] = useState(false);

      const initialValues = {
        currentPhoneNo: intent?.update_detials?.mobile || "",
        newPhoneNumber: "",
        address: intent?.update_detials?.address || "",
        city: intent?.update_detials?.city || "",
        zip: intent?.update_detials?.zip || "",
      };

      useEffect(() => {
        const hasChanged =
          newPhoneNumber !== initialValues.newPhoneNumber ||
          address !== initialValues.address ||
          city !== initialValues.city ||
          zip !== initialValues.zip;
        setIsFormChanged(hasChanged);
      }, [newPhoneNumber, address, city, zip]);

      const fields = [
        {
          type: "text",
          placeholder: "Enter city",
          label: "City :",
          value: city,
          onChange: (val) => setCity(val),
        },
        {
          type: "text",
          placeholder: "Enter Zip Code",
          label: "Pin Code :",
          value: zip,
          onChange: (val) => setZip(val),
        },
        {
          type: "textarea",
          placeholder: "Enter Address",
          label: "Address :",
          value: address,
          onChange: (val) => setAddress(val),
          rows: 5,
        },
        {
          type: "text",
          placeholder: "Add another phone number",
          label: "Phone Number :",
          value: newPhoneNumber,
          onChange: (val) => setNewPhoneNumber(val),
        },
      ];

      if (title) {
        return (
          <div ref={ref}>
            <div
              className="allm-flex allm-justify-between allm-items-center allm-max-h-[50px] allm-text-[14px] allm-px-[11px]"
              style={{ color: settings.textHeaderColor }}
            >
              <hr
                className="allm-flex-1 allm-h-fit allm-border-t allm-border-gray-300 allm-mr-[18px]"
                style={{ borderTop: `1px solid ${settings.textHeaderColor}` }}
              />
              <p>
                {titleText.length > 35
                  ? `${titleText.slice(0, 35)}...`
                  : titleText}
              </p>
              <hr
                className="allm-flex-1 allm-h-fit allm-border-t allm-border-gray-300 allm-ml-[18px]"
                style={{ borderTop: `1px solid ${settings.textHeaderColor}` }}
              />
            </div>
            <div>
              {prompts?.length > 0 &&
                followUpQuestions(
                  settings,
                  handlePrompt,
                  prompts,
                  isLastBotReply
                )}
            </div>
          </div>
        );
      }

      const isOrderDetailsMessage =
        textBeforeSuggestions?.startsWith("Order details:\n");
      let orderDetails;
      if (isOrderDetailsMessage) {
        try {
          const jsonPart = textBeforeSuggestions.slice(
            "Order details:\n".length
          );
          orderDetails = JSON.parse(jsonPart);
        } catch (e) {
          console.error("Invalid order JSON format", e);
        }
      }

      if (orderDetails && role !== "user") {
        setOrderTrackingInProgress(false);
        return (
          <OrderDetailsCard
            orderDetails={orderDetails}
            settings={settings}
            embedderSettings={embedderSettings}
            setIntent={setIntent}
            setOpenBottomSheet={setOpenBottomSheet}
            ref={ref}
          />
        );
      }

      if (intent) {
        if (intent?.intent === "frontend_operation") {
          const [hoveredIndex, setHoveredIndex] = useState(null);
          const faqs = [
            "I was looking for something else !",
            "Show me some trendy products !",
          ];

          return (
            <>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start`}
                ref={ref}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    color: settings.botTextColor,
                    marginRight: "5px",
                  }}
                  className={`allm-py-[16px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-gap-2`}
                >
                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[12px]">
                    {textBeforeSuggestions}
                  </p>

                  {menu.map((item, idx) => (
                    <button
                      key={idx}
                      style={{
                        backgroundColor: "#2563eb",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 0,
                        cursor: "pointer",
                        opacity:
                          hoveredIndex === null
                            ? 1
                            : hoveredIndex === idx
                              ? 1
                              : 0.3,
                        transition: "opacity 0.2s ease",
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => item.onSubmit()}
                    >
                      <span style={{ color: "#fff" }}>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </>
          );
        } else if (intent?.order_names) {
          return (
            <div
              className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start`}
              ref={ref}
            >
              <div
                style={{
                  wordBreak: "break-word",
                  backgroundColor: settings.assistantBgColor,
                  marginRight: "5px",
                }}
                className={`allm-py-[16px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-gap-2`}
              >
                <ReactMarkdown
                  children={intent?.message}
                  components={{
                    p: ({ node, ...props }) => (
                      <p
                        className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                        style={{
                          color: settings.botTextColor,
                        }}
                        {...props}
                      />
                    ),
                  }}
                />
                {intent?.order_names.map((order) => (
                  <div
                    key={order.id}
                    className="allm-flex  allm-min-w-[300px] allm-border allm-rounded-xl allm-shadow-md allm-pl-2 allm-pr-1 allm-py-[2px] allm-gap-3"
                    style={{
                      backgroundColor: "rgb(250, 250, 250)",
                      color: "black",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{order}</span>

                    <button
                      style={{
                        backgroundColor: "#2563eb",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 0,
                      }}
                      onClick={() => {
                        if (isLastMessage) {
                          handledirectOrderTrackingViaId(order);
                        }
                      }}
                    >
                      <span className="allm-text-white allm-text-[16px]">
                        Track Order
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (intent?.update_detials) {
          const faqs = [
            "I was looking for something else.",
            "I have product related issue ?",
            "I wanna track my order ?",
          ];
          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start `}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    color: settings.botTextColor,
                    marginRight: "5px",
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[70%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message `}
                >
                  {intent?.allow ? (
                    <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[12px]">
                      Please update the required feilds i will update it right
                      now :
                    </p>
                  ) : (
                    <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[12px]">
                      Order left warehouse, can't update. change fields, i'll
                      connect you to agent.
                    </p>
                  )}

                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[5px]">
                    Current phone no :{" "}
                    <span className="allm-font-bold">
                      {initialValues?.currentPhoneNo}
                    </span>
                  </p>
                  {fields.map((field, index) => (
                    <>
                      <p className="allm-m-0 allm-text-[12px] allm-leading-[20px] allm-mb-[5px]">
                        {field.label}
                      </p>

                      {field.type === "textarea" ? (
                        <textarea
                          key={index}
                          disabled={!isLastMessage}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            backgroundColor: "white",
                            outline: "none",
                            padding: "8px",
                            display: "block",
                          }}
                          className="allm-p-2 allm-mt-[8px] "
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          rows={field.rows}
                        />
                      ) : (
                        <input
                          key={index}
                          type={field.type}
                          disabled={!isLastMessage}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            backgroundColor: "white",
                            outline: "none",
                            padding: "8px",
                            display: "block",
                            fontSize: 16,
                            height: 15,
                          }}
                          className="allm-p-2 allm-mb-[8px] "
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    </>
                  ))}
                  <button
                    className="allm-flex-1 allm-mt-[2px]"
                    disabled={!isLastMessage || !isFormChanged}
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 0,
                      opacity:
                        address && city && zip && isLastMessage && isFormChanged
                          ? 1
                          : 0.5,
                      cursor:
                        isLastMessage && isFormChanged
                          ? "pointer"
                          : "not-allowed",
                    }}
                    onClick={() => {
                      const updatedDetails = {
                        mobile: newPhoneNumber,
                        address,
                        city,
                        zip,
                      };
                      if (!address || !city || !zip) {
                        toast.error("All fields must be filled!");
                        return;
                      }
                      const oldDetails = {
                        mobile: intent?.update_detials?.mobile,
                        address: intent?.update_detials?.address,
                        city: intent?.update_detials?.city,
                        zip: intent?.update_detials?.zip,
                      };
                      if (!intent?.allow) {
                        cantUpdateUserSoConnectToLiveAgent(
                          oldDetails,
                          updatedDetails
                        );
                      } else {
                        directlyUpdateUserDetails(
                          intent?.order_name,
                          oldDetails,
                          updatedDetails
                        );
                      }
                    }}
                  >
                    <span className="allm-text-white">Update</span>
                  </button>
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        } else if (intent?.intent === "product_issue") {
          const [phoneNo, setPhoneNo] = useState("");
          const [orderNo, setOrderNo] = useState("");
          const detailsFields = [
            {
              label: "Enter phone number :",
              placeholder: "Enter Phone number",
              value: phoneNo,
              onChange: (val) => setPhoneNo(val),
            },
            {
              label: "Enter order no :",
              placeholder: "Enter Order ID #RM123456",
              value: orderNo,
              onChange: (val) => setOrderNo(val),
            },
          ];
          const faqs = [
            "Is it mandatory to provide unboxing video ?",
            "What are refund policies ?",
            "What are exchange policies ?",
          ];
          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start`}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    marginRight: "5px",
                    color: settings.botTextColor,
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message}`}
                >
                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px]">
                    {intent?.response}
                  </p>

                  <div
                    style={{
                      color: settings.botTextColor,
                      marginTop: 10,
                    }}
                  >
                    <div className="allm-flex allm-flex-col allm-gap-2 ">
                      {detailsFields.map((field, idx) => (
                        <div key={idx} style={{ cursor: "pointer" }}>
                          <p className="allm-m-0 allm-text-[13px]">
                            {field.label}
                          </p>
                          <input
                            type="text"
                            disabled={!isLastMessage}
                            placeholder={field.placeholder}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            style={{
                              borderRadius: 12,
                              border: "1px solid #ccc",
                              backgroundColor: "white",
                              outline: "none",
                              padding: "8px",
                              display: "block",
                              fontSize: 16,
                              height: 15,
                            }}
                            className="allm-p-2 allm-mb-[8px] allm-w-[90%]"
                          />
                        </div>
                      ))}

                      <button
                        className="allm-flex-1 allm-mt-[10px]"
                        disabled={!orderNo || !phoneNo || !isLastMessage}
                        style={{
                          backgroundColor: "#2563eb",
                          borderRadius: 12,
                          padding: 10,
                          borderWidth: 0,
                          opacity:
                            orderNo && phoneNo && isLastMessage ? 1 : 0.5,
                          cursor:
                            orderNo && phoneNo && isLastMessage
                              ? "pointer"
                              : "not-allowed",
                        }}
                        onClick={() => {
                          handleProductIssueData(orderNo, phoneNo);
                        }}
                      >
                        <span className="allm-text-white">Submit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        } else if (intent?.intent === "product_issue_details") {
          const [selectedProducts, setSelectedProducts] = useState([]);
          const [issueDiscription, setIssueDescription] = useState("");

          const handleCheckboxChange = (index) => {
            setSelectedProducts(
              (prev) =>
                prev.includes(index)
                  ? prev.filter((i) => i !== index) // remove if already selected
                  : [...prev, index] // add if not selected
            );
          };

          const [imageFile, setImageFile] = useState(null);
          const [videoFile, setVideoFile] = useState(null);

          const MAX_SIZE_MB = 10;
          const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

          const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
              if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                e.target.value = ""; // reset input
                return;
              }
              if (file.size > MAX_SIZE_BYTES) {
                alert(
                  `Image size exceeds ${MAX_SIZE_MB} MB. Please select a smaller file.`
                );
                e.target.value = ""; // reset input
                return;
              }
              setImageFile(file);
            }
          };

          const handleVideoChange = (e) => {
            const file = e.target.files[0];
            if (file) {
              if (!file.type.startsWith("video/")) {
                alert("Please select a valid video file.");
                e.target.value = ""; // reset input
                return;
              }
              if (file.size > MAX_SIZE_BYTES) {
                alert(
                  `Video size exceeds ${MAX_SIZE_MB} MB. Please select a smaller file.`
                );
                e.target.value = ""; // reset input
                return;
              }
              setVideoFile(file);
            }
          };

          const faqs = ["I was looking for something else !"];
          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-start `}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    marginRight: "5px",
                    color: settings.botTextColor,
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-gap-[6px]`}
                >
                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px]">
                    Select prodcut issue :
                  </p>

                  <div className="allm-flex allm-justify-between allm-w-[90%] allm-items-center">
                    {[
                      { value: "missing", label: "Missing" },
                      { value: "damaged", label: "Damaged" },
                      { value: "wrong", label: "Wrong" },
                    ].map(({ value, label }) => (
                      <label
                        key={value}
                        className="allm-flex allm-items-center allm-gap-[4px] allm-text-[14px]"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="radio"
                          name="productIssue" // Group radio buttons
                          id={`productIssue-${value}`} // Unique ID
                          disabled={!isLastMessage}
                          value={selectedProductIssue}
                          checked={selectedProductIssue === value}
                          onChange={() => {
                            setSelectedProductIssue(value);
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: "#2563eb",
                            display: "block",
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="allm-m-0 allm-mt-[10px] allm-text-[14px] allm-leading-[20px]">
                    Please select which product have issue :
                  </p>

                  <div className="allm-flex allm-flex-col allm-overflow-x-auto allm-gap-[12px] allm-py-2">
                    {intent?.products?.map((product, index) => (
                      <div key={index} className="allm-flex allm-gap-[10px]">
                        <div
                          className="allm-flex allm-flex-1 allm-border allm-rounded-xl allm-shadow-md allm-p-3 allm-gap-3"
                          style={{
                            backgroundColor: selectedProducts.includes(index)
                              ? "rgb(250,250,250)"
                              : "rgba(166,166,166,0.30)",
                            color: selectedProducts.includes(index)
                              ? "black"
                              : "white",
                          }}
                          onClick={() => {
                            handleCheckboxChange(index);
                          }}
                        >
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="allm-w-[64px] allm-h-[64px] allm-object-cover allm-rounded-md"
                            />
                          )}
                          <div className="allm-flex allm-flex-col allm-gap-1 allm-flex-1">
                            <span className=" allm-text-[14px] allm-leading-[20px] allm-line-clamp-1">
                              {product.name}
                            </span>
                            {product.variant_title && (
                              <span className="allm-text-[12px] allm-leading-[16px] ">
                                Variant: {product.variant_title}
                              </span>
                            )}
                            {product.quantity && (
                              <span className="allm-text-[12px] allm-leading-[16px] ">
                                Quantity: {product.quantity}
                              </span>
                            )}
                            {product.price && (
                              <span className="allm-text-[12px] allm-leading-[16px]">
                                ₹{product.price}
                              </span>
                            )}
                          </div>
                          <div className="allm-flex">
                            {selectedProducts.includes(index) ? (
                              <div
                                aria-label="Status indicator"
                                role="img"
                                style={{
                                  backgroundColor: "rgb(37, 99, 235)",
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  display: "block",
                                }}
                              ></div>
                            ) : (
                              <></>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="allm-m-0 allm-text-[13px]">
                    Please outline the issues :
                  </p>

                  <textarea
                    type="text"
                    disabled={!isLastMessage}
                    rows={4}
                    placeholder={"Issue Description"}
                    value={issueDiscription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      backgroundColor: "white",
                      outline: "none",
                      padding: "8px",
                      display: "block",
                    }}
                    className="allm-p-2 allm-mt-[8px] allm-w-[90%]"
                  />

                  {MediaUploadComponent(
                    imageFile,
                    setImageFile,
                    videoFile,
                    setVideoFile,
                    handleImageChange,
                    handleVideoChange
                  )}

                  <button
                    className="allm-flex-1 allm-mt-[4px]"
                    disabled={
                      !imageFile ||
                      !videoFile ||
                      !selectedProductIssue ||
                      !selectedProducts.length > 0 ||
                      !isLastMessage
                    }
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 0,
                      opacity:
                        imageFile &&
                        videoFile &&
                        selectedProductIssue &&
                        selectedProducts.length > 0 &&
                        isLastMessage
                          ? 1
                          : 0.5,
                      cursor:
                        imageFile &&
                        videoFile &&
                        selectedProductIssue &&
                        selectedProducts.length > 0 &&
                        isLastMessage
                          ? "pointer"
                          : "not-allowed",
                    }}
                    onClick={() => {
                      handleMediaUploadProductIssue(
                        imageFile,
                        videoFile,
                        selectedProductIssue,
                        selectedProducts,
                        intent.products,
                        issueDiscription
                      );
                    }}
                  >
                    <span className="allm-text-white">Submit</span>
                  </button>
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        } else if (intent?.intent === "update_details") {
          return (
            <div
              className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start `}
              ref={ref}
            >
              <div
                style={{
                  wordBreak: "break-word",
                  backgroundColor: settings.assistantBgColor,
                  color: settings.botTextColor,
                  marginRight: "5px",
                }}
                className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[65%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-min-w-[65%]`}
              >
                <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[8px]">
                  {intent?.response}
                </p>
                <div className="allm-flex allm-flex-col allm-gap-2">
                  <p className="allm-m-0 allm-text-[12px] allm-leading-[20px]">
                    Phone number :
                  </p>
                  <input
                    type="text"
                    disabled={!isLastMessage}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      backgroundColor: "white",
                      outline: "none",
                      padding: "8px",
                      display: "block",
                      fontSize: 16,
                      height: 15,
                    }}
                    className="allm-p-2 allm-mb-[8px] "
                    placeholder={"Enter order phone no "}
                    value={updateDetailsPhoneNo}
                    onChange={(e) => {
                      let val = e.target.value;
                      setUpdateDetailsPhoneNo(val);
                    }}
                  />
                  <p className="allm-m-0 allm-text-[12px] allm-leading-[20px]">
                    Order ID :
                  </p>
                  <input
                    type="text"
                    disabled={!isLastMessage}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      backgroundColor: "white",
                      outline: "none",
                      padding: "8px",
                      display: "block",
                      fontSize: 16,
                      height: 15,
                    }}
                    className="allm-p-2 allm-mb-[8px] "
                    placeholder={"Enter order id ( #RM123456 )"}
                    value={updateDetailsOrderId}
                    onChange={(e) => {
                      let val = e.target.value;
                      setUpdateDetailsOrderId(val);
                    }}
                  />

                  {/* Submit button */}

                  <button
                    className="allm-flex-1"
                    disabled={
                      !updateDetailsOrderId ||
                      !updateDetailsPhoneNo ||
                      !isLastMessage
                    }
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 0,
                      opacity:
                        updateDetailsOrderId &&
                        updateDetailsPhoneNo &&
                        isLastMessage
                          ? 1
                          : 0.5,
                      cursor:
                        updateDetailsOrderId &&
                        updateDetailsPhoneNo &&
                        isLastMessage
                          ? "pointer"
                          : "not-allowed",
                    }}
                    onClick={() => {
                      handleUserUpdate(
                        updateDetailsOrderId,
                        updateDetailsPhoneNo
                      );
                    }}
                  >
                    <span className="allm-text-white">Next</span>
                  </button>
                </div>
              </div>
            </div>
          );
        } else if (intent?.intent === "validation_for_cloning") {
          const [mobileNo, setMobileNo] = useState("");
          const faqs = ["How do I get Refund !", "Connect me to human agent !"];
          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start `}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    color: settings.botTextColor,
                    marginRight: "5px",
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-min-w-[80%]`}
                >
                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[8px]">
                    {intent?.message}
                  </p>
                  <input
                    key={"mobile for cloning"}
                    disabled={!isLastMessage}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      backgroundColor: "white",
                      outline: "none",
                      padding: "8px",
                      display: "block",
                      fontSize: 16,
                      height: 15,
                    }}
                    className="allm-p-2 allm-mb-[8px] "
                    placeholder={"Enter mobile no"}
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                  />
                  <button
                    className="allm-flex-1 allm-mt-[10px]"
                    disabled={!isLastMessage}
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 0,
                      opacity: isLastMessage && mobileNo.length >= 10 ? 1 : 0.5,
                      cursor:
                        isLastMessage && mobileNo.length >= 10
                          ? "pointer"
                          : "not-allowed",
                    }}
                    onClick={() => {
                      if (mobileNo.length >= 10) {
                        matchPhoneNoForReorder(
                          intent?.order_name,
                          intent?.data,
                          mobileNo
                        );
                      }
                    }}
                  >
                    <span className="allm-text-white">Verify mobile no</span>
                  </button>
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        } else if (intent?.intent === "check_cloning_details") {
          const faqs = ["I need help with something else !"];
          const prodcutArray = { products: intent.data.products };

          const [phone, setPhone] = useState("");
          const [email, setEmail] = useState(intent.data.user.email || "");
          const [address1, setAddress1] = useState(
            intent.data.shipping_address.address1 || ""
          );
          const [address2, setAddress2] = useState(
            intent.data.shipping_address.address2 || " "
          );
          const [city, setCity] = useState(
            intent.data.shipping_address.city || ""
          );
          const [province, setProvince] = useState(
            intent.data.shipping_address.province || ""
          );
          const [zip, setZip] = useState(
            intent.data.shipping_address.zip || ""
          );

          const detailFeilds = [
            {
              type: "text",
              placeholder: "Enter Phone no",
              label: "Phone no : ",
              value: phone,
              onChange: (val) => setPhone(val),
            },
            {
              type: "text",
              placeholder: "Enter email",
              label: "Email :",
              value: email,
              onChange: (val) => setEmail(val),
            },
            {
              type: "textarea",
              placeholder: "Enter Address",
              label: "Address :",
              value: address1,
              onChange: (val) => setAddress1(val),
              rows: 5,
            },
            {
              type: "textarea",
              placeholder: "Enter Address",
              label: "Address 2:",
              value: address2,
              onChange: (val) => setAddress2(val),
              rows: 2,
            },
            {
              type: "text",
              placeholder: "Enter city",
              label: "City :",
              value: city,
              onChange: (val) => setCity(val),
            },
            {
              type: "text",
              placeholder: "Enter state",
              label: "State :",
              value: province,
              onChange: (val) => setProvince(val),
            },
            {
              type: "text",
              placeholder: "Enter zip",
              label: "Zip :",
              value: zip,
              onChange: (val) => setZip(val),
            },
          ];

          const isValid =
            phone &&
            email &&
            address1 &&
            city &&
            province &&
            zip &&
            isLastBotReply;

          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start `}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    color: settings.botTextColor,
                    marginRight: "5px",
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-min-w-[80%]`}
                >
                  <p className="allm-m-0 allm-text-[14px] allm-leading-[20px] allm-mb-[8px]">
                    {intent?.message}
                  </p>
                  {detailFeilds.map((field, index) => (
                    <>
                      <p className="allm-m-0 allm-text-[12px] allm-leading-[20px] allm-mb-[5px]">
                        {field.label}
                      </p>

                      {field.type === "textarea" ? (
                        <textarea
                          key={index}
                          disabled={!isLastMessage}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            backgroundColor: "white",
                            outline: "none",
                            padding: "8px",
                            display: "block",
                          }}
                          className="allm-p-2 allm-mt-[8px] "
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          rows={field.rows}
                        />
                      ) : (
                        <input
                          key={index}
                          type={field.type}
                          disabled={!isLastMessage}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            backgroundColor: "white",
                            outline: "none",
                            padding: "8px",
                            display: "block",
                            fontSize: 16,
                            height: 15,
                          }}
                          className="allm-p-2 allm-mb-[8px] "
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    </>
                  ))}
                  {productCardArray(prodcutArray)}
                  <button
                    className="allm-flex-1 allm-mt-[10px]"
                    disabled={!isValid}
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 0,
                      opacity: isValid ? 1 : 0.5,
                      cursor: isValid ? "pointer" : "not-allowed",
                    }}
                    onClick={() => {
                      if (isValid) {
                        const data = {
                          order_id: intent.order_name,
                          first_name: intent.data.user.first_name,
                          last_name: intent.data.user.last_name,
                          phone: phone,
                          email: email,
                          address1: address1,
                          address2: address2,
                          city: city,
                          province: province,
                          zip: zip,
                          country: intent.data.shipping_address.country,
                        };
                        submitReplacement(data);
                      }
                    }}
                  >
                    <span className="allm-text-white">
                      Submit details for reordering
                    </span>
                  </button>
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        } else {
          const normalizedIntent = normalizeIntent(intent?.intent);
          let faqs = [];
          if (intent?.intent && intent?.intent !== "order_tracking") {
            if (normalizedIntent === "delivery_delay") {
              faqs = [
                "Help me track my order ?",
                "Can I get a refund for the delayed order ?",
              ];
            } else if (normalizedIntent === "connect_to_human") {
              faqs = [
                "Help me track my order",
                "I am looking for something else ",
                "I have a product related issue",
              ];
            } else {
              faqs = [
                "I have a different question",
                "I need help with something else",
              ];
            }
          }
          return (
            <div ref={ref}>
              <div
                className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-start`}
              >
                <div
                  style={{
                    wordBreak: "break-word",
                    backgroundColor: settings.assistantBgColor,
                    marginRight: "5px",
                  }}
                  className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message}`}
                >
                  <div className="allm-flex allm-flex-col">
                    {intent?.response && (
                      <ReactMarkdown
                        children={intent?.response}
                        components={{
                          p: ({ node, ...props }) => (
                            <p
                              className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                        }}
                      />
                    )}
                  </div>
                  {intent?.intent && intent?.intent !== "order_tracking" ? (
                    <button
                      style={{
                        backgroundColor: "#2563eb",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 0,
                        marginTop: 15,
                      }}
                      onClick={async () => {
                        // setIntent(intent?.intent);
                        // setOpenBottomSheet(true);
                 
                        connectToSocket();
                      }}
                    >
                      <span className="allm-text-white">
                        Connect to support team
                      </span>
                    </button>
                  ) : (
                    <div
                      style={{
                        color: settings.botTextColor,
                        marginTop: 10,
                      }}
                    >
                      <div
                        className="allm-flex allm-flex-col allm-gap-4"
                        // allm-min-w-[200px]
                      >
                        {/* Radio options with larger buttons */}
                        <div className="allm-flex allm-justify-between allm-items-center">
                          {[
                            { value: "phone", label: "Phone No" },
                            { value: "orderId", label: "Order ID" },
                            { value: "email", label: "Email" },
                          ].map(({ value, label }) => (
                            <label
                              key={value}
                              className="allm-flex allm-items-center allm-gap-[4px] allm-text-[14px]"
                              style={{ cursor: "pointer" }}
                            >
                              <input
                                type="radio"
                                value={value}
                                checked={selectedOption === value}
                                onChange={() => {
                                  setSelectedOption(value);
                                  setFormValue(""); // Reset input when changing type
                                }}
                                style={{
                                  width: 18,
                                  height: 18,
                                  accentColor: "#2563eb",
                                  display: "block",
                                  fontSize: 16,
                                }}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>

                        {/* Dynamic input field with enforced prefix */}
                        <input
                          type="text"
                          disabled={!isLastMessage}
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            backgroundColor: "white",
                            outline: "none",
                            padding: "8px",
                            display: "block",
                            fontSize: 16,
                            height: 15,
                          }}
                          className="allm-p-2 allm-mb-[8px] "
                          placeholder={
                            selectedOption === "orderId"
                              ? "Enter Order ID #RM123456"
                              : selectedOption === "phone"
                                ? "Enter Phone Number "
                                : "Enter Email"
                          }
                          value={formValue}
                          onChange={(e) => {
                            let val = e.target.value;
                            setFormValue(val);
                          }}
                        />

                        {/* Submit button */}
                        <div className="allm-flex allm-gap-[8px] ">
                          {orderTrackingInProgress && (
                            <button
                              className="allm-flex-1"
                              style={{
                                backgroundColor: "#330000",
                                borderColor: "#ff1a1a",
                                borderRadius: 12,
                                padding: 10,
                                borderWidth: 1,
                                borderStyle: "solid",
                              }}
                              onClick={() => {
                                setOrderTrackingInProgress(false);
                              }}
                            >
                              <span className="allm-text-white">
                                Cancel Tracking
                              </span>
                            </button>
                          )}

                          <button
                            className="allm-flex-1"
                            disabled={!formValue.trim() || !isLastMessage}
                            style={{
                              backgroundColor: "#2563eb",
                              borderRadius: 12,
                              padding: 10,
                              borderWidth: 0,
                              opacity:
                                formValue.trim() && isLastMessage ? 1 : 0.5,
                              cursor:
                                formValue.trim() && isLastMessage
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                            onClick={() => {
                              if (isLastMessage) {
                                if (selectedOption === "orderId") {
                                  handledirectOrderTrackingViaId(formValue);
                                  setOrderTrackingInProgress(true);
                                } else {
                                  handleOrderTracking(
                                    selectedOption,
                                    formValue
                                  );
                                  setOrderTrackingInProgress(true);
                                }
                              }
                            }}
                          >
                            <span className="allm-text-white">Track Order</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {isLastBotReply &&
                faqs?.length > 0 &&
                followUpQuestions(settings, handlePrompt, faqs, isLastBotReply)}
            </div>
          );
        }
      }

      return (
        <div ref={ref} className="py-[5px] allm-tracking-[0px]">
          {/* Render Product Card if exists */}
          {role === "user" && product && (
            <div className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-end allm-my-2">
              <ProductCard
                product={product}
                setReplyProduct={setReplyProduct}
                embedSettings={settings}
              />
            </div>
          )}
          <div
            key={uuid}
            className={`allm-flex allm-items-start allm-w-full allm-h-fit ${
              role === "user" ? "allm-justify-end" : "allm-justify-start"
            }`}
          >
            <div
              style={{
                wordBreak: "break-word",
                backgroundColor:
                  role === "user"
                    ? settings.userBgColor
                    : settings.assistantBgColor,
                marginRight: role === "user" && "5px",
              }}
              className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${
                error
                  ? "allm-bg-red-200 allm-rounded-lg allm-mr-[37px] allm-ml-[9px]"
                  : role === "user"
                    ? `${embedderSettings.USER_STYLES.base} allm-anything-llm-user-message`
                    : `${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message`
              }`}
            >
              <div className="allm-flex allm-flex-col">
                {error ? (
                  <div className="allm-p-2 allm-rounded-lg allm-bg-red-50 allm-text-red-500">
                    <span className={`allm-inline-block `}>
                      <Warning className="allm-h-4 allm-w-4 allm-mb-1 allm-inline-block" />{" "}
                      Could not respond to message.
                    </span>
                    <p className="allm-text-xs allm-font-mono allm-mt-2 allm-border-l-2 allm-border-red-500 allm-pl-2 allm-bg-red-300 allm-p-2 allm-rounded-sm">
                      {errorMsg || "Server error"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Render the text after product for user */}
                    {role === "user" && textAfterProduct && (
                      <ReactMarkdown
                        children={textAfterProduct}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className=" allm-font-bold  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="  allm-font-semibold allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className=" allm-font-medium  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="allm-list-disc allm-pl-4  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="allm-list-decimal allm-pl-4 allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li
                              className="allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.userTextColor,
                              }}
                              {...props}
                            />
                          ),
                        }}
                      />
                      // <span
                      //   className={`allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 allm-text-[14px] allm-allm-leading-[20px]`}
                      //   style={{
                      //     color: settings.userTextColor,
                      //   }}
                      //   dangerouslySetInnerHTML={{
                      //     __html: DOMPurify.sanitize(
                      //       renderMarkdown(textAfterProduct)
                      //     ),
                      //   }}
                      // />
                    )}

                    {/* Assistant rendering logic */}
                    {role !== "user" && (
                      <ReactMarkdown
                        children={textBeforeSuggestions}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className=" allm-font-bold  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="  allm-font-semibold allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className=" allm-font-medium  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="allm-list-disc allm-pl-4  allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="allm-list-decimal allm-pl-4 allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li
                              className="allm-text-[14px] allm-leading-[20px]"
                              style={{
                                color: settings.botTextColor,
                              }}
                              {...props}
                            />
                          ),
                          img: () => null,
                          a: () => null,
                        }}
                      />

                      // <span
                      //   className={`markdown-content allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 allm-text-[14px] allm-allm-leading-[20px]`}
                      //   style={{
                      //     color: settings.botTextColor,
                      //   }}
                      //   dangerouslySetInnerHTML={{
                      //     __html: DOMPurify.sanitize(
                      //       renderMarkdown(textBeforeSuggestions)
                      //     ),
                      //   }}
                      // />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            {suggestions?.products?.length > 0 && (
              <div className="allm-pl-4">
                <ProductSuggestions
                  suggestions={suggestions}
                  setReplyProduct={setReplyProduct}
                  embedSettings={settings}
                />
              </div>
            )}
          </div>

          {/* Display prompts if available */}
          <div>
            {(isLastBotReply || isFirstMessage) && prompts?.length > 0 && (
              <div className="allm-my-4 allm-flex allm-flex-col allm-gap-y-2 allm-self-end allm-items-end  ">
                {prompts.slice(0, 5).map((prompt, index) => (
                  <div
                    key={index}
                    style={{
                      // border: `1px solid ${settings.userBgColor}`,
                      backgroundColor: lightenAndDullColor(
                        settings.userBgColor,
                        70,
                        0.9
                      ),
                      maxWidth: "80%",
                      color: settings.userTextColor,
                    }}
                    onClick={() => {
                      if (
                        settings.sessionId !==
                        "d5c5134a-ab48-458d-bc90-16cb66456426"
                      )
                        handlePrompt(prompt);
                    }}
                    className=" allm-rounded-[24px] allm-px-[16px] allm-py-2 allm-text-[14px] allm-leading-normal  allm-cursor-pointer"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <Suspense fallback={<></>}>
        <RenderContent />
      </Suspense>
    );
  }
);

export default memo(HistoricalMessage);

const followUpQuestions = (settings, handlePrompt, faqs = [], disabled) => {
  return (
    <div className="allm-my-4 allm-flex allm-flex-col allm-gap-y-2 allm-self-end allm-items-end allm-w-full ">
      {faqs.slice(0, 5).map((prompt, index) => (
        <div
          key={index}
          style={{
            // border: `1px solid ${!disabled ? settings.assistantBgColor : settings.userBgColor}`,
            backgroundColor:
              // !disabled
              //   ? lightenAndDullColor(settings.assistantBgColor, 70, 0.8)
              //   :
              lightenAndDullColor(settings.userBgColor, 70, 0.9),
            maxWidth: "80%",
            color: settings.userTextColor,
          }}
          onClick={() => {
            if (disabled) handlePrompt(prompt);
          }}
          className=" allm-rounded-[24px] allm-px-[16px] allm-py-2 allm-text-[14px] allm-leading-normal  allm-cursor-pointer"
        >
          {prompt}
        </div>
      ))}
    </div>
  );
};

const lightenAndDullColor = (
  hex,
  lightenFactor = 70,
  desaturateFactor = 0.9
) => {
  let num = parseInt(hex.replace("#", ""), 16);
  let r = num >> 16;
  let g = (num >> 8) & 0x00ff;
  let b = num & 0x0000ff;

  // Lighten the color by increasing RGB values
  r = Math.min(255, r + lightenFactor);
  g = Math.min(255, g + lightenFactor);
  b = Math.min(255, b + lightenFactor);

  // Desaturate by blending with a neutral gray (RGB 200, 200, 200)
  r = Math.round(r * desaturateFactor + 200 * (1 - desaturateFactor));
  g = Math.round(g * desaturateFactor + 200 * (1 - desaturateFactor));
  b = Math.round(b * desaturateFactor + 200 * (1 - desaturateFactor));

  return `rgb(${r}, ${g}, ${b})`;
};

const OrderDetailsCard = ({
  orderDetails,
  settings = {},
  embedderSettings = {},
  setIntent,
  setOpenBottomSheet,
  ref = null,
}) => {
  return (
    <div
      style={{
        wordBreak: "break-word",
        backgroundColor: settings.assistantBgColor,
        color: settings.botTextColor,
      }}
      className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col allm-gap-2 allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-text-[14px] allm-mb-[8px]`}
      ref={ref}
    >
      {orderDetails?.tracking_number && (
        <span
          style={{
            color: settings.botTextColor,
          }}
        >
          <span className="allm-font-semibold">Tracking Id:</span>{" "}
          <span className="allm-font-extralight">
            {orderDetails.tracking_number}
          </span>
        </span>
      )}
      {orderDetails?.payment_mode && (
        <span>
          <span className="allm-font-semibold">Payment Method:</span>{" "}
          <span className="allm-font-extralight">
            {orderDetails.payment_mode}
          </span>
        </span>
      )}
      {orderDetails?.status && (
        <span>
          <span className="allm-font-semibold">Status:</span>{" "}
          <span className="allm-font-extralight">{orderDetails.status}</span>
        </span>
      )}
      {orderDetails?.edd &&
        (() => {
          const eddDate = new Date(orderDetails.edd);
          const today = new Date();
          // Strip time for accurate comparison
          today.setHours(0, 0, 0, 0);
          eddDate.setHours(0, 0, 0, 0);

          const isFutureOrToday = eddDate >= today;
          return (
            <span>
              <span className="allm-font-semibold">
                {isFutureOrToday ? "Expected Delivery Date:" : "Delivery Date:"}
              </span>{" "}
              <span className="allm-font-extralight">{orderDetails.edd}</span>
            </span>
          );
        })()}

      {/* Products section */}
      {productCardArray(orderDetails)}

      {orderDetails?.tracking_url && (
        <button
          onClick={() =>
            window.open(
              orderDetails.tracking_url,
              "_blank",
              "noopener,noreferrer"
            )
          }
          className="allm-flex-1"
          style={{
            backgroundColor: "#2563eb",
            borderRadius: 12,
            padding: 10,
            borderWidth: 0,

            cursor: "pointer",
          }}
        >
          <span className="allm-text-white">Track Order</span>
        </button>
      )}
      {orderDetails?.delay && (
        <span
          style={{
            color: settings.botTextColor,
            marginTop: 5,
          }}
        >
          <span className="allm-font-semibold">Order is delayed</span>{" "}
        </span>
      )}
      {orderDetails?.delay && (
        <button
          style={{
            backgroundColor: "#2563eb",
            borderRadius: 12,
            padding: 10,
            borderWidth: 0,
            marginTop: 5,
          }}
          onClick={() => {
            setIntent("Delivery Delay");
            setOpenBottomSheet(true);
          }}
        >
          <span className="allm-text-white">Connect to support team</span>
        </button>
      )}
    </div>
  );
};

const normalizeIntent = (intent) => {
  return intent.replace(/\s/g, "_").toLowerCase();
};

const productCardArray = (orderDetails) => {
  return (
    <>
      {orderDetails?.products?.length > 0 && (
        <>
          <div className="allm-flex allm-overflow-x-auto allm-gap-4 allm-py-2">
            {orderDetails.products.map((product, index) => (
              <div
                key={index}
                className="allm-flex allm-min-w-[260px] allm-border allm-rounded-xl allm-shadow-md allm-p-3 allm-gap-3"
                style={{
                  backgroundColor: "rgb(250, 250, 250)",
                  color: "black",
                }}
              >
                {/* Image on the left */}
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="allm-w-[64px] allm-h-[64px] allm-object-cover allm-rounded-md"
                  />
                )}

                {/* Details on the right */}
                <div className="allm-flex allm-flex-col allm-gap-1">
                  <span className=" allm-text-sm allm-line-clamp-1">
                    {product.name}
                  </span>
                  {product.variant_title && (
                    <span className="allm-text-xs allm-text-gray-600">
                      Variant: {product.variant_title}
                    </span>
                  )}
                  {product.quantity && (
                    <span className="allm-text-xs allm-text-gray-600">
                      Quantity: {product.quantity}
                    </span>
                  )}
                  {product.price && (
                    <span className="allm-text-sm">₹{product.price}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

function MediaUploadComponent(
  imageFile,
  setImageFile,
  videoFile,
  setVideoFile,
  handleImageChange,
  handleVideoChange
) {
  const renderPreview = (file, type, onRemove) => {
    const url = URL.createObjectURL(file);

    return (
      <div className="allm-relative allm-w-full allm-h-[140px]">
        {/* Remove Icon */}
        <button
          type="button"
          onClick={onRemove}
          className="
    allm-absolute allm-top-1/2 allm-left-1/2 allm-z-50
    allm-flex allm-items-center allm-justify-center
    allm-rounded-full allm-p-[4px]
    hover:allm-border hover:allm-border-red-600 hover:allm-text-red-600
    allm-cursor-pointer
    allm-transform allm--translate-x-1/2 allm--translate-y-1/2
  "
          aria-label={`Remove ${type}`}
          style={{
            backgroundColor: "white",
            border: "0.5px solid #f87171",
          }}
        >
          <XCircle size={35} color="#f87171" />
        </button>

        {type === "image" ? (
          <img
            src={url}
            alt="Preview"
            className="allm-w-full allm-h-[140px] allm-rounded-lg allm-object-cover allm-opacity-65"
          />
        ) : (
          <video
            controls
            className="allm-w-full allm-h-[140px] allm-rounded-lg allm-object-cover allm-opacity-65"
          >
            <source src={url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    );
  };

  return (
    <div className="allm-flex allm-flex-col allm-gap-[12px]">
      <p className="allm-m-0 allm-mt-[10px] allm-text-[14px] allm-leading-[20px]">
        Provide the following media :<br />
        <span className="allm-text-red-600">
          {"( Not more than 10MB each ) "}
        </span>
      </p>
      {/* Image Upload */}

      <div className="allm-flex  allm-gap-[20px] allm-mb-[10px] allm-mt-[5px]">
        <div className="allm-flex allm-w-full allm-flex-col ">
          {!imageFile ? (
            <>
              {" "}
              <label
                htmlFor="image-upload"
                style={{ border: "0.2px solid white", borderRadius: 12 }}
                className="allm-cursor-pointer allm-px-4 allm-rounded-md allm-text-[12px]
 hover:allm-bg-[rgba(166,166,166,0.29)]
             allm-flex allm-flex-col allm-justify-center allm-items-center
             allm-min-h-[140px] allm-flex-1 allm-gap-1"
              >
                <UploadSimple size={28} />
                <span>Upload photo</span>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="allm-hidden"
              />
            </>
          ) : (
            renderPreview(imageFile, "image", () => setImageFile(null))
          )}
        </div>

        {/* Video Upload */}
        <div className="allm-flex allm-w-full allm-flex-col ">
          {!videoFile ? (
            <>
              <label
                htmlFor="video-upload"
                style={{ border: "0.2px solid white", borderRadius: 12 }}
                className="allm-cursor-pointer allm-px-4 allm-rounded-md allm-text-[12px]
             hover:allm-bg-[rgba(166,166,166,0.29)]
             allm-flex allm-flex-col allm-justify-center allm-items-center
             allm-min-h-[140px] allm-flex-1 allm-gap-1"
              >
                <UploadSimple size={28} />
                <span>Unboxing video</span>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="allm-hidden"
              />
            </>
          ) : (
            renderPreview(videoFile, "video", () => setVideoFile(null))
          )}
        </div>
      </div>
    </div>
  );
}
// const OptimizedVideoPlayer = ({ embedSettings, mediaLink }) => {
//   const videoRef = useRef(null);
//   const [isPlaying, setIsPlaying] = useState(false);

//   // Update play state on video play/pause events
//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video) return;

//     const onPlay = () => setIsPlaying(true);
//     const onPause = () => setIsPlaying(false);

//     video.addEventListener("play", onPlay);
//     video.addEventListener("pause", onPause);

//     return () => {
//       video.removeEventListener("play", onPlay);
//       video.removeEventListener("pause", onPause);
//     };
//   }, []);

//   // Play video handler
//   const handlePlayClick = () => {
//     if (videoRef.current) {
//       videoRef.current.play();
//     }
//   };

//   if (embedSettings?.host !== "c2hvcHBpZXB1YmxpYy5teXNob3BpZnkuY29t")
//     return null;

//   return (
//     <div
//       className="allm-rounded-[10px] allm-mt-[10px] allm-cursor-pointer allm-overflow-hidden allm-flex allm-flex-col allm-max-w-[220px] allm-min-w-[220px] allm-h-[280px] allm-relative"
//       style={{ position: "relative" }}
//     >
//       <video
//         ref={videoRef}
//         src={mediaLink}
//         style={{ width: "100%", height: "100%", objectFit: "cover" }}
//         controls={isPlaying}
//         muted
//       />

//       {!isPlaying && (
//         <div
//           onClick={handlePlayClick}
//           style={{
//             position: "absolute",
//             inset: 0,
//             backgroundColor: "rgba(0,0,0,0.5)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             cursor: "pointer",
//             zIndex: 10,
//             userSelect: "none",
//           }}
//           aria-label="Play video"
//           role="button"
//           tabIndex={0}
//           onKeyPress={(e) => {
//             if (e.key === "Enter" || e.key === " ") {
//               handlePlayClick();
//             }
//           }}
//         >
//           <div
//             style={{
//               width: 60,
//               height: 60,
//               backgroundColor: "rgba(0,0,0,0.7)",
//               borderRadius: "50%",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <svg
//               width="32"
//               height="32"
//               viewBox="0 0 32 32"
//               fill="white"
//               aria-hidden="true"
//               focusable="false"
//             >
//               <polygon points="10,7 26,16 10,25" />
//             </svg>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };


const OptimizedVideoPlayer = ({ embedSettings, mediaLink }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay muted on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try to autoplay muted video on first render
    video.muted = true;
    video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Autoplay might be blocked, user interaction required
      setIsPlaying(false);
    });

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // When user explicitly clicks play overlay, unmute so controls can be used properly
  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false; // Unmute on user interaction
      video.play();
    }
  };

  if (embedSettings?.host !== "c2hvcHBpZXB1YmxpYy5teXNob3BpZnkuY29t")
    return null;

  return (
    <div
      className="allm-rounded-[10px] allm-mt-[10px] allm-cursor-pointer allm-overflow-hidden allm-flex allm-flex-col allm-max-w-[220px] allm-min-w-[220px] allm-h-[280px] allm-relative"
      style={{ position: "relative" }}
    >
      <video
        ref={videoRef}
        src={mediaLink}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        controls={isPlaying}
        muted={!isPlaying} // mute when not playing, unmute on play
        playsInline
        preload="auto"
      />
      {!isPlaying && (
        <div
          onClick={handlePlayClick}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            userSelect: "none",
          }}
          aria-label="Play video"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handlePlayClick();
            }
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: "rgba(0,0,0,0.7)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="white"
              aria-hidden="true"
              focusable="false"
            >
              <polygon points="10,7 26,16 10,25" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
