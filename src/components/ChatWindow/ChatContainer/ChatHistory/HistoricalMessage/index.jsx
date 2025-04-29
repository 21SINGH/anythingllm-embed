import React, { memo, forwardRef } from "react";
import { Warning } from "@phosphor-icons/react";
import { embedderSettings } from "@/main";
import { v4 } from "uuid";
import { ChatTeardropDots } from "@phosphor-icons/react";
import BrandAnalytics from "@/models/brandAnalytics";
import ReactMarkdown from "react-markdown";

const parseMessageWithProductByUser = (message) => {
  if (!message || typeof message !== "string")
    return { product: null, textAfterProduct: message };

  const orderBlockRegex =
    /->ORDER DETAILS START->([\s\S]*?)->ORDER DETAILS END->/;
  const match = message.match(orderBlockRegex);

  if (match) {
    const content = match[1].trim();

    // Match full `user:` or `bot:` lines using regex (including JSON)
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

    if (result) {
      return {
        orderMessage: result,
        textAfterProduct: message
          .substring(match.index + match[0].length)
          .trim(),
      };
    }
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
    };
  }

  let textBeforeSuggestions = "";
  let textAfterSuggestions = "";
  let suggestions = null;
  let prompts = null;

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
      };
    }
  } else {
    if (suggestionsMatch) {
      return {
        textBeforeSuggestions,
        suggestions,
        textAfterSuggestionsBeforePrompts: textAfterSuggestions,
        prompts: null,
        textAfterPrompts: "",
      };
    } else {
      return {
        textBeforeSuggestions,
        suggestions: null,
        textAfterSuggestionsBeforePrompts: "",
        prompts: null,
        textAfterPrompts: textBeforeSuggestions,
      };
    }
  }
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

  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setReplyProduct(product);
  };

  const handleAnchorClick = async (e) => {
    e.preventDefault(); // Prevent anchor's default behavior (navigation)

    // Send analytics
    // await BrandAnalytics.sendAnalytics(
    //   embedderSettings?.settings,
    //   embedSettings.sessionId,
    //   "tap_product",
    //   product
    // );

    // After the analytics is sent, you can now navigate if needed
    if (embedSettings.sessionId !== "d5c5134a-ab48-458d-bc90-16cb66456426")
      if (product?.buy_link || product?.purchase_link || product?.handle) {
        window.location.href =
          product?.buy_link ||
          product?.purchase_link ||
          `https://reginaldmen.com/products/${product?.handle}`;
      }
  };

  return (
    <a
      href={product?.buy_link || product?.purchase_link || product?.handle}
      rel="noopener noreferrer"
      className="allm-rounded-[10px] allm-cursor-pointer allm-overflow-hidden allm-flex allm-flex-col allm-max-w-[220px] allm-min-w-[220px] "
      style={{ textDecoration: "none" }}
      onClick={handleAnchorClick}
    >
      <div>
        {(product?.image_url ||
          // product?.product_images[0] ||
          // product?.product_images||
          product?.images) &&
        !imageError ? (
          <div className="allm-flex allm-justify-center allm-bg-[#1B1B1B] allm-overflow-hidden allm-h-[190px]">
            <img
              src={
                product?.image_url ||
                product?.product_images ||
                // product?.product_images[0]||
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
            className="allm-w-[30px] allm-z-50 allm-h-[30px] allm-rounded-lg allm-bg-white allm-flex allm-items-center allm-justify-center"
          >
            <ChatTeardropDots size={20} color="black" />
          </div>
        </div>
      </div>
    </a>
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
    },
    ref
  ) => {
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    // Parse message based on role
    let parsedData;
    if (role === "user") {
      parsedData = parseMessageWithProductByUser(message);
    } else {
      parsedData = parseMessageWithSuggestionsAndPrompts(message);
    }

    const { product, orderMessage, textAfterProduct } = parsedData;
    const {
      textBeforeSuggestions,
      suggestions,
      textAfterSuggestionsBeforePrompts,
      prompts,
      textAfterPrompts,
    } = parsedData;

    const isOrderDetailsMessage =
      textBeforeSuggestions?.startsWith("Order details:\n");
    let orderDetails;
    if (isOrderDetailsMessage) {
      try {
        const jsonPart = textBeforeSuggestions.slice("Order details:\n".length);
        orderDetails = JSON.parse(jsonPart);
      } catch (e) {
        console.error("Invalid order JSON format", e);
      }
    }

    if (orderDetails && role !== "user") {
      return (
        <OrderDetailsCard
          orderDetails={orderDetails}
          settings={settings}
          embedderSettings={embedderSettings}
        />
      );
    }

    if (
      orderMessage &&
      role === "user" &&
      !lastMessage.startsWith("Order details")
    ) {
      return (
        <div key={uuid} ref={ref}>
          {/* user order inquiry message */}
          <div
            className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-end`}
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
              className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${`${embedderSettings.USER_STYLES.base} allm-anything-llm-user-message`}`}
            >
              <div className="allm-flex allm-flex-col">
                {role === "user" && orderMessage?.user1 && (
                  <ReactMarkdown
                    children={orderMessage?.user1}
                    components={{
                      p: ({ node, ...props }) => (
                        <p
                          className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                          style={{
                            color: settings.userTextColor,
                          }}
                          {...props}
                        />
                      ),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {/* asked order id */}
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
                {role === "user" && orderMessage?.bot1 && (
                  <ReactMarkdown
                    children={orderMessage?.bot1}
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
            </div>
          </div>
          {/*  order id */}
          <div
            className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-end alm-mb-[4px]`}
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
              className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${`${embedderSettings.USER_STYLES.base} allm-anything-llm-user-message`}`}
            >
              <div className="allm-flex allm-flex-col">
                {role === "user" && orderMessage?.user2 && (
                  <ReactMarkdown
                    children={orderMessage?.user2}
                    components={{
                      p: ({ node, ...props }) => (
                        <p
                          className="allm-m-0 allm-text-[14px] allm-leading-[20px]"
                          style={{
                            color: settings.userTextColor,
                          }}
                          {...props}
                        />
                      ),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <OrderDetailsCard
            orderDetails={orderMessage?.bot2}
            settings={settings}
            embedderSettings={embedderSettings}
          />
          <div className="allm-h-[6px]  allm-w-full" />
          <div
            className={`allm-flex allm-items-start allm-w-full allm-h-fit 
             allm-justify-end `}
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
              className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col  allm-max-w-[80%] ${`${embedderSettings.USER_STYLES.base} allm-anything-llm-user-message`}`}
            >
              <div className="allm-flex allm-flex-col">
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
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="py-[5px] allm-tracking-[0px]">
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
          ref={ref}
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

        {suggestions?.products.length > 0 && (
          <div className="allm-pl-4">
            <ProductSuggestions
              suggestions={suggestions}
              setReplyProduct={setReplyProduct}
              embedSettings={settings}
            />
          </div>
        )}

        {/* Display prompts if available */}
        {isLastBotReply && prompts?.length > 0 && (
          <div className="allm-my-4 allm-flex allm-flex-col allm-gap-y-2 allm-self-end allm-items-end  ">
            {prompts.slice(0, 3).map((prompt, index) => (
              <div
                key={index}
                style={{
                  border: `1px solid ${settings.userBgColor}`,
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
    );
  }
);

export default memo(HistoricalMessage);

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
}) => {
  return (
    <div
      style={{
        wordBreak: "break-word",
        backgroundColor: settings.assistantBgColor,
        color: settings.botTextColor,
      }}
      className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col allm-gap-2 allm-max-w-[80%] ${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message allm-text-[14px] allm-mb-[8px]`}
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
      {orderDetails?.edd && (
        <span>
          <span className="allm-font-semibold">Delivery Date:</span>{" "}
          <span className="allm-font-extralight">{orderDetails.edd}</span>
        </span>
      )}
      {/* Products section */}
      {orderDetails?.products?.length > 0 && (
        <>
          <div className="allm-flex allm-overflow-x-auto allm-gap-4 allm-py-2">
            {orderDetails.products.map((product, index) => (
              <div
                key={index}
                className="allm-flex allm-min-w-[260px] allm-border allm-rounded-xl allm-shadow-md allm-p-3 allm-gap-3"
                style={{
                  backgroundColor: "rgb(250, 250, 250)",
                  color:'black'
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
                  {product.price && (
                    <span className="allm-text-sm">₹{product.price}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {orderDetails?.tracking_url && (
        <button
          style={{
            backgroundColor: "#2563eb",
            borderRadius: 12,
            padding: 10,
            borderWidth: 0,
          }}
        >
          {/* <span className="allm-text-bold">Track your shipment:</span>{" "} */}
          <a
            href={orderDetails.tracking_url}
            className="allm-text-white allm-text-sm allm-line-clamp-2"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
            }}
          >
            Track your order
          </a>
        </button>
      )}
    </div>
  );
};
