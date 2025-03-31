import { IoMdArrowUp } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import React, { useState, useRef, useEffect } from "react";

export default function PromptInput({
  message,
  submit,
  onChange,
  inputDisabled,
  buttonDisabled,
  replyProduct,
  setReplyProduct,
  settings
}) {
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const [_, setFocused] = useState(false);

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
      style={{ backgroundColor: settings.bgColor }}
    >
      <form
        onSubmit={handleSubmit}
        className="allm-flex allm-flex-col allm-gap-y-1 allm-rounded-t-lg allm-w-full allm-items-center allm-justify-center "
      >
        <div className="allm-flex allm-items-center allm-w-full ">
          <div className="allm-flex allm-flex-col allm-px-[13px] allm-py-[13px] allm-overflow-hidden allm-w-full">
            {replyProduct && (
              <div style={{
                backgroundColor:settings.cardBgColor
              }} className="allm-flex allm-flex-1 allm-mr-[-2px] allm-gap-3 allm-p-2  allm-rounded-t-lg ">
                <div className="allm-flex allm-items-center allm-justify-center  allm-min-w-[80px] allm-rounded-[10px] overflow-hidden">
                  <img
                    src={
                      replyProduct?.image_url || replyProduct?.product_images[0]
                    }
                    alt={replyProduct?.title || replyProduct?.product_name}
                    className="allm-min-w-[70px] allm-h-[70px] allm-rounded-[10px] allm-object-cover"
                  />
                </div>
                <div className="allm-flex allm-flex-col allm-gap-1 ">
                  <span style={{color:settings.cardTextColor}} className="allm-font-semibold allm-text-[18px] allm-line-clamp-1">
                    {replyProduct?.title || replyProduct?.product_name}
                  </span>
                  {/* <span style={{color:settings.cardTextSubColour}} className="allm-text-[12px] allm-line-clamp-2">
                    {replyProduct?.product_description}
                  </span> */}
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
                backgroundColor: settings.inputbarColor,
              }}
              className={`allm-flex  allm-w-full allm-items-center allm-rounded-[10px]  allm-py-[10px] ${replyProduct?.id && "allm-rounded-tr-none allm-rounded-tl-none"}`}
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
                className="allm-border-none allm-cursor-text allm-text-[16px] allm-min-h-[24px] allm-mx-2 allm-w-full  allm-bg-transparent  allm-resize-none active:allm-outline-0  focus:allm-outline-0  allm-flex-grow"
                style={{
                  color : settings.inputMes
                }}
                placeholder={"Ask me anything..."}
                id="message-input"
              />
              <button
                ref={formRef}
                type="submit"
                className={`allm-flex allm-justify-center allm-items-center allm-cursor-pointer allm-p-[5px] allm-rounded-full allm-mr-[12px] allm-outline-none allm-border-0`}
                style={{
                  backgroundColor: message
                    ? settings.userBgColor
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


const getContrastColor = (hex) => {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Calculate luminance (Y) using the relative luminance formula
  let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF"; // Black for light BG, White for dark BG
};
