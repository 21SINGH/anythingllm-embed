import { forwardRef, memo } from "react";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";

const PromptReply = forwardRef(
  ({ uuid, reply, pending, error, sources = [], sentAt, settings }, ref) => {
    let displayContent = reply;
    let isIncomplete = false;

    if (reply.includes("@@SUGGESTIONS START@@")) {
      // Extract content up to the marker.
      const markerIndex = reply.indexOf("@@SUGGESTIONS START@@");
      displayContent = reply.slice(0, markerIndex);
      isIncomplete = true;
    }

    if (!reply && sources.length === 0 && !pending && !error) return null;
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    if (pending) {
      return <TypingIndicator />;
    }

    if (error) {
      return (
        <div className="allm-flex allm-items-end allm-w-full allm-h-fit allm-justify-start">
          <div
            style={{ wordBreak: "break-word" }}
            className={`allm-py-[11px] allm-px-4 allm-rounded-lg allm-flex allm-flex-col allm-bg-red-200 allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)] allm-mr-[37px] allm-ml-[9px]`}
          >
            <div className="allm-flex allm-gap-x-5">
              <span className="allm-inline-block allm-p-2 allm-rounded-lg allm-bg-red-50 allm-text-red-500">
                <Warning className="allm-h-4 allm-w-4 allm-mb-1 allm-inline-block" />{" "}
                Could not respond to message.
                <span className="allm-text-xs">Server error</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="allm-py-[5px]">
        <div
          key={uuid}
          ref={ref}
          className="allm-flex allm-flex-col allm-items-start allm-w-full allm-h-fit allm-justify-start"
        >
          <div
            style={{
              wordBreak: "break-word",
              backgroundColor: settings.assistantBgColor,
              color: settings.botTextColor,
            }}
            className={`allm-py-[11px] allm-px-4 allm-flex allm-flex-col ${
              error ? "allm-bg-red-200" : embedderSettings.ASSISTANT_STYLES.base
            } allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
          >
            <div className="allm-flex allm-gap-x-5 allm-flex-col">
              <span
                className=" allm-reply allm-whitespace-pre-line allm-font-normal allm-text-[14px]"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(displayContent),
                }}
              />
            </div>
          </div>
          {isIncomplete && <ProductCardShimmer />}
        </div>
      </div>
    );
  }
);

const ProductCardShimmer = () => {
  return (
    <div className="allm-w-[200px] allm-mx-[16px] allm-h-[280px] allm-mt-[8px] allm-bg-[#1d1d1d] allm-rounded-2xl allm-flex allm-flex-col allm-gap-[12px]  allm-animate-pulse">
      <div className="allm-w-full allm-h-[180px] allm-bg-[#5a5a5a] allm-rounded-2xl allm-rounded-b-none allm-shimmer"></div>

      <div className="allm-flex allm-flex-col allm-gap-[8px] allm-px-[12px]">
        <div className="allm-h-[16px] allm-bg-[#5a5a5a] allm-rounded allm-w-[100%]"></div>
        <div className="allm-h-[16px] allm-bg-[#5a5a5a] allm-rounded allm-w-[50%] "></div>
        <div className="allm-h-[12px] allm-bg-[#5a5a5a] allm-rounded allm-w-[33.33%] allm-mt-[8px]"></div>
      </div>
    </div>
  );
};

export default memo(PromptReply);

const TypingIndicator = () => {
  return (
    <div className="allm-flex allm-items-center allm-space-x-1 allm-mx-[16px] allm-mt-[8px]">
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down"
        style={{ animationDelay: "0.3s" }}
      />
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down"
        style={{ animationDelay: "0.6s" }}
      />
    </div>
  );
};
