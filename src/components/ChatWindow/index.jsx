import ChatWindowHeader from "./Header";
import useChatHistory from "@/hooks/chat/useChatHistory";
import ChatContainer from "./ChatContainer";
import { ChatHistoryLoading } from "./ChatContainer/ChatHistory";
import { useState } from "react";

export default function ChatWindow({ closeChat, settings, sessionId }) {
  const { chatHistory, setChatHistory, loading } = useChatHistory(
    settings,
    sessionId
  );
  const [openBottomSheet, setOpenBottomSheet] = useState(false);

  if (loading) {
    return (
      <div className="allm-flex allm-flex-col allm-h-full md:allm-rounded-[24px] allm-overflow-hidden ">
        <ChatWindowHeader
          chatHistory={chatHistory}
          sessionId={sessionId}
          settings={settings}
          iconUrl={settings.brandImageUrl}
          closeChat={closeChat}
          setChatHistory={setChatHistory}
          setOpenBottomSheet={setOpenBottomSheet}
        />
        <div
          className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain"
          style={{ backgroundColor: settings.bgColor }}
        >
          <ChatHistoryLoading />
        </div>
      </div>
    );
  }

  setEventDelegatorForCodeSnippets();
  if (!settings.customer?.id)
    return (
      <div className="allm-flex allm-flex-col allm-h-full md:allm-rounded-[24px] allm-overflow-hidden ">
        <ChatWindowHeader
          chatHistory={chatHistory}
          sessionId={sessionId}
          settings={settings}
          iconUrl={settings.brandImageUrl}
          closeChat={closeChat}
          setChatHistory={setChatHistory}
          setOpenBottomSheet={setOpenBottomSheet}
        />
        <div
          className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain allm-pt-10 allm-px-10"
          style={{
            backgroundColor: settings.bgColor,
            color: getContrastColor(settings.bgColor),
          }}
        >
          <p className="allm-text-center allm-text-[18px] allm-leading-7">
            Since you are not logged in, go login to use the chatbot.
          </p>

          <div className="allm-flex allm-justify-center allm-gap-4 allm-mt-[25px]">
            <button
              style={{
                all: "unset", // remove all default styles
                borderRadius: "12px",
                padding: "14px 22px",
                cursor: "pointer",
                border: "1px solid",
                color: settings.botTextColor,
                backgroundColor: settings.assistantBgColor,
                flex: 1,
                textAlign: "center",
              }}
              onClick={closeChat}
            >
              Close
            </button>
            <button
              style={{
                all: "unset",
                borderRadius: "12px",
                padding: "14px 22px",
                cursor: "pointer",
                border: "1px solid",
                color: settings.userTextColor,
                backgroundColor: settings.userBgColor,
                flex: 1,
                textAlign: "center",
              }}
              onClick={() => {
                window.location.href =
                  "https://shopify.com/authentication/63118180419/login?client_id=dfe45144-d8b7-434a-8096-81d63f64425e&locale=en&redirect_uri=https%3A%2F%2Fshopify.com%2Fauthentication%2F63118180419%2Foauth%2Fauthorize%3Fclient_id%3Ddfe45144-d8b7-434a-8096-81d63f64425e%26locale%3Den%26nonce%3Ddeed13db-9783-49de-b701-18311ee8c106%26redirect_uri%3Dhttps%253A%252F%252Fshopify.com%252F63118180419%252Faccount%252Fcallback%253Fsource%253Dcore%26response_type%3Dcode%26scope%3Dopenid%2Bemail%2Bcustomer-account-api%253Afull%26state%3D01JTSYD0NPJY2CD29BM5TV5TPF";
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="allm-flex allm-flex-col allm-h-full md:allm-rounded-[24px] allm-overflow-hidden ">
      <ChatWindowHeader
        chatHistory={chatHistory}
        sessionId={sessionId}
        settings={settings}
        iconUrl={settings.brandImageUrl}
        closeChat={closeChat}
        setChatHistory={setChatHistory}
        setOpenBottomSheet={setOpenBottomSheet}
      />
      <div
        className="allm-flex-grow allm-overflow-y-auto allm-overscroll-contain"
        style={{ backgroundColor: settings.bgColor }}
      >
        <ChatContainer
          sessionId={sessionId}
          settings={settings}
          knownHistory={chatHistory}
          openBottomSheet={openBottomSheet}
          setOpenBottomSheet={setOpenBottomSheet}
        />
      </div>
    </div>
  );
}

// Enables us to safely markdown and sanitize all responses without risk of injection
// but still be able to attach a handler to copy code snippets on all elements
// that are code snippets.
function copyCodeSnippet(uuid) {
  const target = document.querySelector(`[data-code="${uuid}"]`);
  if (!target) return false;

  const markdown =
    target.parentElement?.parentElement?.querySelector(
      "pre:first-of-type"
    )?.innerText;
  if (!markdown) return false;

  window.navigator.clipboard.writeText(markdown);

  target.classList.add("allm-text-green-500");
  const originalText = target.innerHTML;
  target.innerText = "Copied!";
  target.setAttribute("disabled", true);

  setTimeout(() => {
    target.classList.remove("allm-text-green-500");
    target.innerHTML = originalText;
    target.removeAttribute("disabled");
  }, 2500);
}

// Listens and hunts for all data-code-snippet clicks.
function setEventDelegatorForCodeSnippets() {
  document?.addEventListener("click", function (e) {
    const target = e.target.closest("[data-code-snippet]");
    const uuidCode = target?.dataset?.code;
    if (!uuidCode) return false;
    copyCodeSnippet(uuidCode);
  });
}

function getContrastColor(hex) {
  // Remove hash if present
  hex = hex.replace(/^#/, "");

  // Parse r, g, b values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for bright colors, white for dark colors
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
