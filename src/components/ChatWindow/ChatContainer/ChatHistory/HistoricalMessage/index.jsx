import React, { memo, forwardRef } from "react";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";
import { v4 } from "uuid";
import createDOMPurify from "dompurify";
import AnythingLLMIcon from "@/assets/anything-llm-icon.svg";
import { formatDate } from "@/utils/date";

const DOMPurify = createDOMPurify(window);

const parseMessageWithSuggestions = (message) => {
  if (!message || typeof message !== 'string' || !message.includes('@@SUGGESTIONS')) {
    return { textContent: message, suggestions: null };
  }

  const regex = /@@SUGGESTIONS START@@\s*([\s\S]*?)\s*@@SUGGESTIONS END@@/;
  const match = message.match(regex);
  
  if (!match) {
    return { textContent: message, suggestions: null };
  }
  
  const beforeSuggestions = message.substring(0, match.index);
  const afterSuggestions = message.substring(match.index + match[0].length);
  
  const textContent = beforeSuggestions + afterSuggestions;
  
  try {
    const suggestionsJson = JSON.parse(match[1]);
    return { textContent, suggestions: suggestionsJson };
  } catch (e) {
    console.error("Failed to parse suggestions JSON:", e);
    return { 
      textContent,
      suggestions: { 
        products: []
      } 
    };
  }
};

const ProductSuggestions = ({ suggestions }) => {
  if (!suggestions) return null;
  
  if (!suggestions.products || suggestions.products.length === 0) {
    return (
      <div className="allm-mt-4 allm-border-t allm-pt-3 allm-border-gray-200">
        <div className="allm-text-sm allm-font-medium allm-mb-3">Product suggestions available</div>
        <div className="allm-text-xs allm-text-gray-500">
          We have product suggestions for you, but they couldn't be displayed properly.
        </div>
      </div>
    );
  }
  
  return (
    <div className="allm-mt-4 allm-border-t allm-pt-3 allm-border-gray-200">
      <div className="allm-text-sm allm-font-medium allm-mb-3">Suggesting products for you:</div>
      <div className="allm-grid allm-grid-cols-2 allm-gap-3">
        {suggestions.products.map(product => (
          <ProductCard key={product.id || Math.random().toString()} product={product} />
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="allm-border allm-rounded-lg allm-overflow-hidden allm-shadow-md allm-mb-3">
      {product.image_url && !imageError ? (
        <div className="allm-flex allm-justify-center allm-bg-white allm-p-2 allm-h-32">
          <img 
            src={product.image_url} 
            alt={product.title}
            className="allm-max-h-28 allm-max-w-full allm-object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="allm-flex allm-justify-center allm-items-center allm-bg-gray-100 allm-h-32">
          <span className="allm-text-gray-400 allm-text-xs">Product image</span>
        </div>
      )}
      <div className="allm-p-3">
        <h4 className="allm-font-medium allm-text-sm allm-mb-2">{product.title}</h4>
        <div className="allm-flex allm-items-center allm-mb-2">
          <span className="allm-text-green-600 allm-font-medium">{product.discounted_price}</span>
          {product.original_price && (
            <span className="allm-ml-2 allm-text-gray-400 allm-line-through allm-text-xs">
              {product.original_price}
            </span>
          )}
        </div>
        {product.buy_link && (
          <a 
            href={product.buy_link}
            target="_blank"
            rel="noopener noreferrer"
            className="allm-block allm-w-full allm-bg-blue-600 allm-text-white allm-py-1 allm-rounded allm-text-center allm-text-sm hover:allm-bg-blue-700"
          >
            Buy Now
          </a>
        )}
      </div>
    </div>
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
    },
    ref
  ) => {
    const textSize = !!embedderSettings.settings.textSize
      ? `allm-text-[${embedderSettings.settings.textSize}px]`
      : "allm-text-sm";
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    const { textContent, suggestions } = parseMessageWithSuggestions(message);

    return (
      <div className="py-[5px]">
        {role === "assistant" && (
          <div
            className={`allm-text-[10px] allm-text-gray-400 allm-ml-[54px] allm-mr-6 allm-mb-2 allm-text-left allm-font-sans`}
          >
            {embedderSettings.settings.assistantName ||
              "Anything LLM Chat Assistant"}
          </div>
        )}
        <div
          key={uuid}
          ref={ref}
          className={`allm-flex allm-items-start allm-w-full allm-h-fit ${
            role === "user" ? "allm-justify-end" : "allm-justify-start"
          }`}
        >
          {role === "assistant" && (
            <img
              src={embedderSettings.settings.assistantIcon || AnythingLLMIcon}
              alt="Anything LLM Icon"
              className="allm-w-9 allm-h-9 allm-flex-shrink-0 allm-ml-2 allm-mt-2"
              id="anything-llm-icon"
            />
          )}
          <div
            style={{
              wordBreak: "break-word",
              backgroundColor:
                role === "user"
                  ? embedderSettings.USER_STYLES.msgBg
                  : embedderSettings.ASSISTANT_STYLES.msgBg,
            }}
            className={`allm-py-[11px] allm-px-4 allm-flex allm-flex-col allm-font-sans ${
              error
                ? "allm-bg-red-200 allm-rounded-lg allm-mr-[37px] allm-ml-[9px]"
                : role === "user"
                  ? `${embedderSettings.USER_STYLES.base} allm-anything-llm-user-message`
                  : `${embedderSettings.ASSISTANT_STYLES.base} allm-anything-llm-assistant-message`
            } allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
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
                  <span
                    className={`allm-whitespace-pre-line allm-flex allm-flex-col allm-gap-y-1 ${textSize} allm-leading-[20px]`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(renderMarkdown(textContent)),
                    }}
                  />
                  {suggestions && <ProductSuggestions suggestions={suggestions} />}
                </>
              )}
            </div>
          </div>
        </div>

        {sentAt && (
          <div
            className={`allm-font-sans allm-text-[10px] allm-text-gray-400 allm-ml-[54px] allm-mr-6 allm-mt-2 ${role === "user" ? "allm-text-right" : "allm-text-left"}`}
          >
            {formatDate(sentAt)}
          </div>
        )}
      </div>
    );
  }
);

export default memo(HistoricalMessage);