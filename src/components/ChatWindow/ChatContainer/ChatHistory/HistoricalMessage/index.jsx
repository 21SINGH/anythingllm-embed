import React, { memo, forwardRef, useEffect } from "react";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";
import { v4 } from "uuid";
import createDOMPurify from "dompurify";
import { ChatTeardropDots } from "@phosphor-icons/react";

const DOMPurify = createDOMPurify(window);

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

const ProductSuggestions = ({ suggestions, setReplyProduct }) => {
  if (!suggestions) return null;

  if (!suggestions.products) {
    return (
      <div className="allm-mt-4 allm-border-t allm-pt-3 allm-border-gray-200">
        <div className="allm-text-sm allm-font-medium allm-mb-3">
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
    <div className="allm-mt-3">
      <div className="allm-flex allm-space-x-3 allm-overflow-x-auto allm-no-scroll">
        {suggestions.products.map((product) => (
          <ProductCard
            key={product.id || Math.random().toString()}
            product={product}
            setReplyProduct={setReplyProduct}
          />
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, setReplyProduct }) => {
  const [imageError, setImageError] = React.useState(false);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setReplyProduct(product);
  };

  return (
    <a
      href={product.buy_link}
      rel="noopener noreferrer"
      className="allm-border allm-rounded-lg allm-cursor-pointer allm-overflow-hidden allm-flex allm-flex-col allm-max-w-[190px] allm-min-w-[190px] "
      style={{ textDecoration: "none" }}
    >
      <div>
        {product.image_url && !imageError ? (
          <div className="allm-flex allm-justify-center allm-bg-[#1B1B1B] allm-overflow-hidden allm-h-[160px]">
            <img
              src={product.image_url}
              alt={product.title}
              className="allm-h-full allm-w-full allm-object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="allm-flex allm-justify-center allm-items-center allm-bg-[#1B1B1B] allm-h-40">
            <span className="allm-text-gray-400 allm-text-xs">
              Product image
            </span>
          </div>
        )}
      </div>
      <div className="allm-p-[10px] allm-flex allm-flex-col allm-gap-2 allm-bg-[#1d1d1d]">
        <div className="allm-font-semibold allm-text-white allm-w-full allm-text-[13px] allm-line-clamp-1">
          {product.title}
        </div>
        <div className="allm-flex allm-w-full allm-justify-between allm-items-center">
          <div>
            <div className="allm-text-white allm-font-bold allm-mr-2 allm-text-[18px] allm-mb-1">
              {product.discounted_price}
            </div>
            <div className="allm-line-through allm-font-medium allm-text-[#A4A4A4] allm-mr-2 allm-text-[12px]">
              {product.original_price}
            </div>
          </div>
          <div
            onClick={handleButtonClick} // Handle button click separately
            className="allm-w-[30px] allm-z-50 allm-h-[30px] allm-rounded-lg allm-bg-white allm-flex allm-items-center allm-justify-center"
          >
            <ChatTeardropDots size={20} />
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
      role,
      sources = [],
      error = false,
      errorMsg = null,
      sentAt,
      isLastBotReply,
      handlePrompt,
      setReplyProduct,
    },
    ref
  ) => {
    const textSize = !!embedderSettings.settings.textSize
      ? `allm-text-[${embedderSettings.settings.textSize}px]`
      : "allm-text-sm";
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    console.log(message);
    

    // Parse message based on role
    let parsedData;
    if (role === "user") {
      parsedData = parseMessageWithProductByUser(message);
    } else {
      parsedData = parseMessageWithSuggestionsAndPrompts(message);
    }

    const { product, textAfterProduct } = parsedData;
    const {
      textBeforeSuggestions,
      suggestions,
      textAfterSuggestionsBeforePrompts,
      prompts,
      textAfterPrompts,
    } = parsedData;

    return (
      <div className="py-[5px]">
        {/* Render Product Card if exists */}
        {role === "user" && product && (
          <div className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-end allm-my-2">
            <ProductCard product={product} setReplyProduct={setReplyProduct} />
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
                  ? embedderSettings.USER_STYLES.msgBg
                  : embedderSettings.ASSISTANT_STYLES.msgBg,
              marginRight: role === "user" && "5px",
            }}
            className={`allm-py-[11px] allm-px-4 allm-flex allm-flex-col  allm-max-w-[70%] ${
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
                    <span
                      className={`allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 ${textSize} allm-leading-[20px]`}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          renderMarkdown(textAfterProduct)
                        ),
                      }}
                    />
                  )}

                  {/* Assistant rendering logic */}
                  {role !== "user" && (
                    <span
                      className={`allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 ${textSize} allm-leading-[20px]`}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          renderMarkdown(textBeforeSuggestions)
                        ),
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Display suggestions if available */}
        <div className="allm-pl-4">
          {suggestions && (
            <ProductSuggestions
              suggestions={suggestions}
              setReplyProduct={setReplyProduct}
            />
          )}
        </div>

        {/* Display prompts if available */}
        {isLastBotReply && prompts?.length > 0 && (
          <div className="allm-my-4 allm-flex allm-flex-col allm-gap-y-2 allm-self-end allm-items-end  ">
            {prompts.slice(0, 3).map((prompt, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid rgba(30, 96, 251, 0.5)",
                  maxWidth: "80%",
                }}
                onClick={() => {
                  handlePrompt(prompt);
                }}
                className="allm-bg-[#1E60FB]/40 allm-rounded-3xl allm-px-4 allm-py-2 allm-text-sm allm-text-white allm-cursor-pointer"
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