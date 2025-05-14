import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, CircleNotch } from "@phosphor-icons/react";
import { embedderSettings } from "@/main";
import debounce from "lodash.debounce";
import { SEND_TEXT_EVENT } from "..";

export default function ChatHistory({
  settings = {},
  history = [],
  handlePrompt,
  setReplyProduct,
  setOpenBottomSheet,
  setIntent
}) {
  const replyRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleScroll = () => {
    if (!chatHistoryRef.current) return;
    const diff =
      chatHistoryRef.current.scrollHeight -
      chatHistoryRef.current.scrollTop -
      chatHistoryRef.current.clientHeight;
    // Fuzzy margin for what qualifies as "bottom". Stronger than straight comparison since that may change over time.
    const isBottom = diff <= 40;
    setIsAtBottom(isBottom);
  };

  const debouncedScroll = debounce(handleScroll, 100);
  useEffect(() => {
    function watchScrollEvent() {
      if (!chatHistoryRef.current) return null;
      const chatHistoryElement = chatHistoryRef.current;
      if (!chatHistoryElement) return null;
      chatHistoryElement.addEventListener("scroll", debouncedScroll);
    }
    watchScrollEvent();
  }, []);

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: "auto",
      });
    }
  };

  if (history.length === 0) {
    return (
      <div className="allm-pb-[100px] allm-pt-[5px] allm-rounded-lg allm-px-2 allm-h-full allm-mt-2 allm-gap-y-2 allm-overflow-y-scroll allm-flex allm-flex-col allm-justify-start allm-no-scroll">
        <div className="allm-flex allm-h-full allm-flex-col allm-items-center allm-justify-center">
          <p className="allm-text-slate-400 allm-text-[14px]  allm-py-4 allm-text-center">
            {settings?.greeting ?? "Send a chat to get started."}
          </p>
          <SuggestedMessages settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="allm-pb-[30px] allm-pt-[5px] allm-rounded-[24px] allm-px-2 allm-h-full allm-gap-y-2 allm-overflow-y-scroll allm-flex allm-flex-col allm-justify-start allm-no-scroll allm-md:max-h-[500px] allm-overflow-hidden"
      id="chat-history"
      ref={chatHistoryRef}
    >
      {history.map((props, index) => {        
        const isLastMessage = index === history.length - 1;
        const isLastBotReply =
          index === history.length - 1 && props.role === "assistant";

        const previousMessage =
          index > 0
            ? history[index - 1].content || history[index - 1].textResponse
            : null;

        if (isLastBotReply && props.animate) {
          return (
            <PromptReply
              key={props.uuid}
              ref={isLastMessage ? replyRef : null}
              uuid={props.uuid}
              reply={props.content}
              pending={props.pending}
              sources={props.sources}
              error={props.error}
              closed={props.closed}
              settings={settings}
            />
          );
        }

        return (
          <HistoricalMessage
            key={index}
            ref={isLastMessage ? replyRef : null}
            settings={settings}
            message={props.textResponse || props.content}
            lastMessage={previousMessage}
            sentAt={props.sentAt || Date.now() / 1000}
            role={props.role}
            sources={props.sources}
            chatId={props.chatId}
            feedbackScore={props.feedbackScore}
            error={props.error}
            errorMsg={props.errorMsg}
            isLastBotReply={
              index === history.length - 1 && props.role === "assistant"
            }
            handlePrompt={handlePrompt}
            setReplyProduct={setReplyProduct}
            setIntent={setIntent}
            setOpenBottomSheet={setOpenBottomSheet}
          />
        );
      })}
    </div>
  );
}

export function ChatHistoryLoading() {
  return (
    <div className="allm-h-full allm-w-full allm-relative">
      <div className="allm-h-full allm-max-h-[82vh] allm-pb-[100px] allm-pt-[5px] allm-bg-gray-100 allm-rounded-lg allm-px-2 allm-h-full allm-mt-2 allm-gap-y-2 allm-overflow-y-scroll allm-flex allm-flex-col allm-justify-start allm-no-scroll">
        <div className="allm-flex allm-h-full allm-flex-col allm-items-center allm-justify-center">
          <CircleNotch
            size={14}
            className="allm-text-slate-400 allm-animate-spin"
          />
        </div>
      </div>
    </div>
  );
}

function SuggestedMessages({ settings }) {
  if (!settings?.defaultMessages?.length) return null;
  return (
    <div className="allm-flex allm-flex-col allm-gap-y-2 allm-w-[75%]">
      {settings.defaultMessages.map((content, i) => (
        <button
          key={i}
          style={{
            opacity: 0,
            wordBreak: "break-word",
            backgroundColor: settings.userBgColor,
            fontSize: settings.textSize,
          }}
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent(SEND_TEXT_EVENT, { detail: { command: content } })
            );
          }}
          className={`msg-suggestion allm-border-none hover:allm-shadow-[0_4px_14px_rgba(0,0,0,0.5)] allm-cursor-pointer allm-px-2 allm-py-2 allm-rounded-lg allm-text-white allm-w-full allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
        >
          {content}
        </button>
      ))}
    </div>
  );
}
