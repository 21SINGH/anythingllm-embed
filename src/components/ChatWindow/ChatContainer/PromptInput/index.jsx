import { IoMdArrowUp } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import React, { useState, useRef, useEffect } from "react";
import useGetScriptAttributes from "@/hooks/useScriptAttributes";

export default function PromptInput({
  message,
  submit,
  onChange,
  inputDisabled,
  buttonDisabled,
  replyProduct,
  setReplyProduct,
}) {
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const [_, setFocused] = useState(false);
  const embedSettings = useGetScriptAttributes();

  useEffect(() => {
    if (!inputDisabled && textareaRef.current) {
      textareaRef.current.focus();
    }
    resetTextAreaHeight();
  }, [inputDisabled]);

  const handleSubmit = (e) => {
    setFocused(false);
    submit(e);
  };

  const resetTextAreaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const captureEnter = (event) => {
    if (event.keyCode == 13) {
      if (!event.shiftKey) {
        submit(event);
      }
    }
  };

  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height =
      event.target.value.length !== 0 ? element.scrollHeight + "px" : "auto";
  };

  return (
    <div
      className="allm-w-full allm-sticky allm-bottom-0 allm-z-10 allm-flex allm-justify-center allm-items-center "
      style={{ backgroundColor: embedSettings.bgColor }}
    >
      <form
        onSubmit={handleSubmit}
        className="allm-flex allm-flex-col allm-gap-y-1 allm-rounded-t-lg allm-w-full allm-items-center allm-justify-center "
      >
        <div className="allm-flex allm-items-center allm-w-full allm-border-t-8">
          <div className="allm-flex allm-flex-col allm-px-3 allm-py-3 allm-overflow-hidden allm-w-full">
            {replyProduct && (
              <div className="allm-flex allm-flex-1 allm-mr-[-2px] allm-gap-3 allm-p-2 allm-bg-[#2f2f2f] allm-rounded-t-lg ">
                <div className="allm-flex allm-items-center allm-justify-center allm-p-[10px] allm-w-[60px] allm-h-[50px] allm-bg-[#1d1d1d] allm-rounded-[10px] overflow-hidden">
                  <img
                    src={
                      replyProduct?.image_url || replyProduct?.product_images[0]
                    }
                    alt={replyProduct?.title || replyProduct?.product_name}
                    className="allm-w-[60px] allm-h-[50px] allm-rounded-[10px] allm-object-cover"
                  />
                </div>
                <div className="allm-flex allm-flex-col allm-gap-1 allm-text-white">
                  <span className="allm-font-semibold allm-text-lg allm-line-clamp-1">
                    {replyProduct?.title || replyProduct?.product_name}
                  </span>
                  <span className="allm-text-xs allm-text-[#a4a4a4] allm-line-clamp-2">
                    {replyProduct?.product_description}
                  </span>
                </div>

                <button
                  type="button"
                  className={`allm-flex allm-justify-center allm-items-center allm-cursor-pointer allm-p-1 allm-rounded-full allm-mr-1 allm-outline-none allm-border-0 allm-absolute allm-top-2 allm-right-0 allm-bg-[#5A5A5A]`}
                  aria-label="Cross message"
                  onClick={() => {
                    setReplyProduct(null);
                  }}
                >
                  <RxCross2 size={17} color="#fff" />
                </button>
              </div>
            )}

            <div
              style={{
                border: "1.5px solid #22262833",
                backgroundColor: embedSettings.inputbarColor,
              }}
              className={`allm-flex  allm-w-full allm-items-center allm-rounded-[10px]  allm-py-2 ${replyProduct?.id && "allm-rounded-tr-none allm-rounded-tl-none"}`}
            >
              <input
                ref={textareaRef}
                onKeyUp={adjustTextArea}
                onKeyDown={captureEnter}
                onChange={onChange}
                required={true}
                disabled={inputDisabled}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  setFocused(false);
                  adjustTextArea(e);
                }}
                value={message}
                className=" allm-border-none allm-cursor-text allm-text-[16px] allm-mx-2 allm-w-full  allm-bg-transparent  allm-resize-none active:allm-outline-none focus:allm-outline-none allm-flex-grow"
                style={{
                  color: message
                    ? embedSettings.textHeaderColor
                    : embedSettings.textHeaderColor / 50,
                }}
                placeholder={"Ask me anything..."}
                id="message-input"
              />
              <button
                ref={formRef}
                type="submit"
                className={`allm-flex allm-justify-center allm-items-center allm-cursor-pointer allm-p-1 allm-rounded-full allm-mr-3 allm-outline-none allm-border-0`}
                style={{
                  backgroundColor: message
                    ? embedSettings.userBgColor
                    : "#5a5a5a",
                }}
                id="send-message-button"
                aria-label="Send message"
              >
                <IoMdArrowUp size={17} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
