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
  // if (!settings.customer?.id && settings.loginRequired)
  //   return (
  //     <div className="allm-flex allm-flex-col allm-h-full md:allm-rounded-[24px] allm-overflow-hidden ">
  //       <ChatWindowHeader
  //         chatHistory={chatHistory}
  //         sessionId={sessionId}
  //         settings={settings}
  //         iconUrl={settings.brandImageUrl}
  //         closeChat={closeChat}
  //         setChatHistory={setChatHistory}
  //         setOpenBottomSheet={setOpenBottomSheet}
  //       />
  //       <div
  //         className="allm-flex-grow allm-pt-10 allm-px-10 allm-flex allm-justify-center allm-items-center"
  //         style={{
  //           backgroundColor: settings.bgColor,
  //           color: getContrastColor(settings.bgColor),
  //         }}
  //       >
  //         <div
  //           style={{
  //             marginTop: "-80px",
  //             display: "flex",
  //             flexDirection: "column",
  //             height: "90%",
  //             justifyContent: "space-between",
  //             paddingTop: "20px",
  //           }}
  //         >
  //           <div className="allm-flex allm-flex-col allm-gap-3 allm-mb-6">
  //             {/* Left shimmer (simulating user message) */}
  //             <div className="allm-flex">
  //               <div
  //                 style={{ backgroundColor: settings.headerColor }}
  //                 className="allm-rounded-xl allm-w-[55%] allm-h-3 allm-animate-pulse"
  //               />
  //             </div>

  //             {/* Right shimmer (simulating assistant message) */}
  //             <div className="allm-flex allm-justify-end">
  //               <div
  //                 style={{ backgroundColor: settings.headerColor }}
  //                 className=" allm-rounded-xl allm-w-[55%] allm-h-3 allm-animate-pulse"
  //               />
  //             </div>

  //             <p className="allm-text-center allm-text-[18px] allm-leading-7">
  //               Login to your account to start chatting.
  //             </p>
  //           </div>

  //           {/* 
  //           <p className="allm-text-center allm-text-[18px] allm-leading-7">
  //             Login to your account to start chatting.
  //           </p> */}

  //           <div className="allm-flex allm-flex-col allm-justify-center allm-gap-3 allm-mt-[25px] allm-mb-[-10px]">
  //             <button
  //               style={{
  //                 all: "unset", // remove all default styles
  //                 borderRadius: "12px",
  //                 padding: "8px 22px",
  //                 cursor: "pointer",
  //                 color: settings.botTextColor,
  //                 backgroundColor: settings.assistantBgColor,
  //                 flex: 1,
  //                 textAlign: "center",
  //               }}
  //               onClick={closeChat}
  //             >
  //               Close chatbot
  //             </button>
  //             <button
  //               style={{
  //                 all: "unset",
  //                 borderRadius: "12px",
  //                 padding: "8px 22px",
  //                 cursor: "pointer",

  //                 color: settings.userTextColor,
  //                 backgroundColor: settings.userBgColor,
  //                 flex: 1,
  //                 textAlign: "center",
  //               }}
  //               onClick={() => {
  //                 window.location.href = settings.loginLink;
  //               }}
  //             >
  //               Login with your account
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );

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
