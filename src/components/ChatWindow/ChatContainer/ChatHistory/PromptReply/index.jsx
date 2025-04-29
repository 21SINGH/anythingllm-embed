import { forwardRef, memo } from "react";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import { embedderSettings } from "@/main";
import ReactMarkdown from "react-markdown";

const PromptReply = forwardRef(
  ({ uuid, reply, pending, error, sources = [], sentAt, settings }, ref) => {
    let displayContent = reply;
    let isSuggestions = false;
    let isProducts = false;

    if (reply.includes("@@SUGGESTIONS START@@")) {
      // Stop display content at the marker
      displayContent = reply.split("@@SUGGESTIONS START@@")[0];
      isSuggestions = false;
      if (reply.includes('@@SUGGESTIONS START@@\n{\n    "products": [')) {
        if (reply.includes('@@SUGGESTIONS START@@\n{\n    "products": []')) {
          isSuggestions = false;
        } else {
          isSuggestions = true;
        }
      }
    }

    // Check if there are prompts
    if (reply.includes("@@PROMPTS START@@\n") && !isSuggestions) {
      isProducts = true;
    }

    if (!reply && sources.length === 0 && !pending && !error) return null;
    if (error) console.error(`ANYTHING_LLM_CHAT_WIDGET_ERROR: ${error}`);

    if (pending) {
      return (
        <div className=" allm-w-[400px] allm-min-h-[50px]">
          <TypingIndicator />
        </div>
      );
    }

    if (error) {
      return (
        <div className="allm-flex allm-items-end allm-w-full allm-h-fit allm-justify-start">
          <div
            style={{ wordBreak: "break-word" }}
            className={`allm-py-[11px] allm-px-[16px] allm-rounded-lg allm-flex allm-flex-col allm-bg-red-200 allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)] allm-mr-[37px] allm-ml-[9px]`}
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
            className={`allm-py-[11px] allm-px-[16px] allm-flex allm-flex-col ${
              error ? "allm-bg-red-200" : embedderSettings.ASSISTANT_STYLES.base
            } allm-shadow-[0_4px_14px_rgba(0,0,0,0.25)]`}
          >
            <div className="allm-flex allm-gap-x-5 allm-flex-col">
              <ReactMarkdown
                children={displayContent}
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
                }}
              />
              {/* <span
                className=" allm-reply allm-whitespace-pre-line allm-font-normal allm-text-[14px]"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(displayContent),
                }}
              /> */}
            </div>
          </div>
          {isSuggestions && <ProductCardShimmer />}
          {isProducts && (
            <div className="allm-flex allm-items-end allm-justify-end allm-w-[420px]">
              <PromptShimmer />
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default memo(PromptReply);

const ProductCardShimmer = () => {
  return (
    <div className="allm-w-[200px] allm-mx-[16px] allm-h-[280px] allm-mt-[8px] allm-bg-[#1d1d1d] allm-rounded-2xl allm-gap-[12px]  allm-animate-pulse">
      <div className="allm-w-[100%] allm-h-[180px] allm-bg-[#5a5a5a] allm-rounded-2xl allm-rounded-b-none allm-shimmer"></div>

      <div className="allm-flex allm-flex-col allm-gap-[8px] allm-px-[12px]">
        <div className="allm-h-[16px] allm-bg-[#5a5a5a] allm-rounded allm-w-[100%]"></div>
        <div className="allm-h-[16px] allm-bg-[#5a5a5a] allm-rounded allm-w-[50%] "></div>
        <div className="allm-h-[12px] allm-bg-[#5a5a5a] allm-rounded allm-w-[33.33%] allm-mt-[8px]"></div>
      </div>
    </div>
  );
};

const PromptShimmer = () => {
  return (
    <div className="allm-w-[300px] allm-mx-[16px] allm-h-[40px] allm-mt-[8px] allm-bg-[#5a5a5a] allm-rounded-2xl allm-flex allm-flex-col allm-gap-[12px]  allm-animate-pulse "></div>
  );
};

const TypingIndicator = () => {
  return (
    <div className="allm-flex allm-flex-1 allm-items-center allm-w-[100px] allm-h-[50px] allm-space-x-1 allm-mx-[16px] allm-mt-[8px]">
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down "
        style={{ animationDelay: "0s", display: "block" }}
      />
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down "
        style={{ animationDelay: "0.3s", display: "block" }}
      />
      <div
        className="allm-w-[10px] allm-h-[10px] allm-rounded-full allm-bg-[#9d9d9d] allm-animate-blink-up-down "
        style={{ animationDelay: "0.6s", display: "block" }}
      />
    </div>
  );
};
