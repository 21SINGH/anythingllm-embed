import ChatWindowHeader from "./Header";
import useChatHistory from "@/hooks/chat/useChatHistory";
import ChatContainer from "./ChatContainer";
import { ChatHistoryLoading } from "./ChatContainer/ChatHistory";
import { useState } from "react";

export default function ChatWindow({
  isChatOpen,
  closeChat,
  settings,
  sessionId,
  isLargeScreen,
  nudgeClick,
  setNudgeClick,
  nudgeText,
  followUpQuestion,
  setFollowUpQuestions,
  loadingFollowUpQuestion,
}) {
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
          isLargeScreen={isLargeScreen}
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
        isLargeScreen={isLargeScreen}
      />
      <div
        className="allm-flex-grow allm-overflow-y-auto "
        // allm-overscroll-contain
        style={{ backgroundColor: settings.bgColor }}
      >
        <ChatContainer
        isChatOpen={isChatOpen}
          sessionId={sessionId}
          settings={settings}
          knownHistory={chatHistory}
          openBottomSheet={openBottomSheet}
          setOpenBottomSheet={setOpenBottomSheet}
          nudgeClick={nudgeClick}
          setNudgeClick={setNudgeClick}
          nudgeText={nudgeText}
          followUpQuestion={followUpQuestion}
          setFollowUpQuestions={setFollowUpQuestions}
          loadingFollowUpQuestion={loadingFollowUpQuestion}
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
