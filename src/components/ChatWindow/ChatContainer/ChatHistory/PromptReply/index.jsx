import { forwardRef, memo } from "react";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";
import useGetScriptAttributes from "@/hooks/useScriptAttributes";

const PromptReply = forwardRef(
  ({ uuid, reply, pending, error, sources = [], sentAt }, ref) => {
    let displayContent = reply;
    let isIncomplete = false;
    const embedSettings = useGetScriptAttributes();

    if (reply.includes("@@SUGGESTIONS START@@")) {
      // Extract content up to the marker.
      const markerIndex = reply.indexOf("@@SUGGESTIONS START@@");
      displayContent = reply.slice(0, markerIndex);
      isIncomplete = true;
    }

    if (!reply && sources.length === 0 && !pending && !error) return null;
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    if (pending) {
      return (
        <div className="allm-flex allm-items-start allm-w-full allm-h-fit allm-justify-start">
          <div
            style={{
              wordBreak: "break-word",
              backgroundColor: embedSettings.assistantBgColor,
              // embedderSettings.ASSISTANT_STYLES.msgBg,
            }}
            className={`allm-py-[11px] allm-px-4 allm-flex allm-flex-col ${embedderSettings.ASSISTANT_STYLES.base} allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
          >
            <div className="allm-flex allm-gap-x-5">
              <div className="allm-mx-4 allm-my-1 allm-dot-falling"></div>
            </div>
          </div>
        </div>
      );
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
              backgroundColor: embedSettings.assistantBgColor,
              color: embedSettings.botTextColor,
              // embedderSettings.ASSISTANT_STYLES.msgBg,
            }}
            className={`allm-py-[11px] allm-px-4 allm-flex allm-flex-col ${
              error ? "allm-bg-red-200" : embedderSettings.ASSISTANT_STYLES.base
            } allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
          >
            <div className="allm-flex allm-gap-x-5 allm-flex-col">
              {/* Render the content before the marker */}
              <span
                className=" allm-reply allm-whitespace-pre-line allm-font-normal allm-text-sm allm-md:text-sm"
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
    <div className="allm-w-[200px] allm-mx-4 allm-h-[280px] allm-mt-2 allm-bg-[#1d1d1d] allm-rounded-2xl allm-flex allm-flex-col allm-gap-3  allm-animate-pulse">
      <div className="allm-w-full allm-h-[180px] allm-bg-[#5a5a5a] allm-rounded-2xl allm-rounded-b-none allm-shimmer"></div>

      <div className="allm-flex allm-flex-col allm-gap-2 allm-px-3">
        <div className="allm-h-4 allm-bg-[#5a5a5a] allm-rounded allm-w-full"></div>
        <div className="allm-h-4 allm-bg-[#5a5a5a] allm-rounded allm-w-1/2 "></div>
        <div className="allm-h-3 allm-bg-[#5a5a5a] allm-rounded allm-w-1/3 allm-mt-2"></div>
      </div>
    </div>
  );
};

export default memo(PromptReply);
