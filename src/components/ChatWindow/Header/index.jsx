// import AnythingLLMIcon from "@/assets/anything-llm-icon.svg";
import ShoopieIcon from "@/assets/shoppie logo.png";
import whatsappIcon from "@/assets/WhatsApp.png";
import BrandService from "@/models/brandService";
import { RxCross2 } from "react-icons/rx";
import { useEffect, useRef, useState } from "react";

export default function ChatWindowHeader({
  chatHistory,
  sessionId,
  settings = {},
  iconUrl = null,
  closeChat,
  setChatHistory,
  setOpenBottomSheet,
}) {
  const [showingOptions, setShowOptions] = useState(false);
  const [brandDetails, setBrandDetails] = useState(null);
  const menuRef = useRef();
  const buttonRef = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const getBrandDetails = async () => {
    try {
      const data = await BrandService.getBrandDetails(settings);
      setBrandDetails(data);
    } catch (error) {
      console.error("Error streaming chat:", error);
    }
  };

  const whatsAppClick = async () => {
    setOpenBottomSheet((prev) => !prev);
  };

  return (
    <div
      style={{ backgroundColor: settings.headerColor }}
      className={`allm-flex allm-items-center`}
      id="anything-llm-header"
    >
      <div className="allm-flex allm-pl-3 allm-items-center allm-w-full allm-h-[76px]">
        <img
          style={{
            maxWidth: 48,
            maxHeight: 48,
            borderRadius: 25,
            backgroundColor: settings.logoBackgroundColor,
          }}
          src={settings?.brandImageUrl ?? brandDetails?.logo ?? ShoopieIcon}
          alt={brandDetails?.logo ? "Brand" : "AnythingLLM Logo"}
        />
        <div
          className="allm-text-[21px] allm-font-semibold allm-ml-3 "
          style={{ color: settings.textHeaderColor }}
        >
          {settings?.brandName ?? brandDetails?.name}
        </div>
      </div>
      <div className="allm-absolute allm-right-0 allm-flex allm-justify-center allm-items-center allm-px-[22px] allm-gap-[16px]">
        {settings.toggleWhatsapp && (
          <img
            style={{
              maxWidth: 38,
              maxHeight: 38,
              borderRadius: 25,
              backgroundColor: settings.logoBackgroundColor,
            }}
            src={whatsappIcon}
            alt={brandDetails?.logo ? "Brand" : "AnythingLLM Logo"}
            onClick={whatsAppClick}
          />
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={closeChat}
          className="hover:allm-cursor-pointer allm-border-none allm-bg-[#5C5C5C]/50 allm-rounded-full allm-p-1  allm-flex allm-items-center allm-justify-center"
        >
          <RxCross2 size={20} color="#FAFAFA" />
        </button>
      </div>
    </div>
  );
}

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
