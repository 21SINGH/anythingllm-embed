import React, { useEffect, useState, useRef } from "react";
import useGetScriptAttributes from "@/hooks/useScriptAttributes";
import useSessionId from "@/hooks/useSessionId";
import useOpenChat from "@/hooks/useOpen";
import Head from "@/components/Head";
import OpenButton from "@/components/OpenButton";
import ChatWindow from "./components/ChatWindow";
import { motion, AnimatePresence } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import sound3 from "@/assets/3.mp3";

export default function App() {
  const { isChatOpen, toggleOpenChat } = useOpenChat();
  const embedSettings = useGetScriptAttributes();
  const HUMAN_CONNECT = `allm_${embedSettings.embedId}_human_connect`;
  const [humanConnect, setHumanConnect] = useState(false); // not known yet!
  const { sessionId, serialNo } = useSessionId(embedSettings);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [nudgeAppear, setNudgeAppear] = useState(false);
  const [nudgeText, setNudgeText] = useState("");
  const [upsellingProdct, setUpsellingProduct] = useState(null);
  const [cartHandle, setCartHandle] = useState(null);
  const [nudgeClick, setNudgeClick] = useState(false);
  const [nudgeKey, setNudgeKey] = useState(0);
  const hasPlayed = useRef(false);
  const previousNudgeText = useRef("");
  const [openingMessage, setOpeningMessage] = useState("");
  const DEFAULT_NUDGE_MESSAGE = "Welcome! How can I assist you?";
  const DEFAULT_NUDGE_ALLOW = `allm_${embedSettings.embedId}_default_nudge_allow`;

  // const { y } = useShakeAndBounceAnimation(nudgeText, openingMessage);

  const playSound = (variant) => {
    if (
      variant === "open" &&
      !hasPlayed.current &&
      nudgeText !== openingMessage &&
      nudgeText !== previousNudgeText.current
    ) {
      try {
        const audio = new Audio(sound3);
        audio.play().catch(() => {});
        hasPlayed.current = true;
        previousNudgeText.current = nudgeText;
      } catch (error) {}
    }
  };

  useEffect(() => {
    hasPlayed.current = false;
  }, [nudgeAppear]);

  useEffect(() => {
    const newOpeningMessage =
      embedSettings.openingMessage || DEFAULT_NUDGE_MESSAGE;
    setOpeningMessage(newOpeningMessage);
  }, [embedSettings.openingMessage]);

  useEffect(() => {
    const handleNudgeUpdate = (event) => {
      const { key, value } = event.detail || {};

      if (key !== "shoppieAINudgeMessage") {
        return;
      }
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
        if (parsedValue?.usecase)
          setNudgeText(`${parsedValue?.nudge} ${parsedValue?.usecase}`);
        else setNudgeText(`${parsedValue?.nudge} `);
        setUpsellingProduct(parsedValue?.product);
        setCartHandle(parsedValue?.handle);
      } catch (e) {
        setNudgeText(value);
        setUpsellingProduct(null);
        setCartHandle(null);
      }

      setNudgeAppear(false);

      const showTimer = setTimeout(() => {
        setNudgeAppear(true);
        setNudgeClick(true);
      }, 350);

      const defaultTimer = setTimeout(() => {
        // const defaultMessage = openingMessage || DEFAULT_NUDGE_MESSAGE;
        setNudgeAppear(false);
        setUpsellingProduct(null);
        setCartHandle(null);
        setNudgeKey((prev) => prev + 1);
        setNudgeClick(false);
        // setTimeout(() => {
        //   if (window.sessionStorage.getItem(DEFAULT_NUDGE_ALLOW) === "true") {
        //     setNudgeText(defaultMessage);
        //     setUpsellingProduct(null);
        //     setNudgeAppear(true);
        //     setNudgeKey((prev) => prev + 1);
        //     setNudgeClick(false);
        //   }
        // }, 450);
      }, 20000);

      // Cleanup timers
      return () => {
        clearTimeout(showTimer);
        clearTimeout(defaultTimer);
      };
    };

    window.addEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);
    };
  }, [openingMessage, embedSettings]);

  useEffect(() => {
    if (
      embedSettings?.openingMessage !== "" &&
      window.sessionStorage.getItem(DEFAULT_NUDGE_ALLOW) === "true"
    ) {
      setNudgeAppear(true);
      setNudgeText(embedSettings?.openingMessage);
      setUpsellingProduct(null);
      setCartHandle(null);
    }
  }, [embedSettings, sessionId]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 560);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCloseFirstMessage = async () => {
    setNudgeAppear(false);
    window.sessionStorage.setItem(DEFAULT_NUDGE_ALLOW, "false");
  };

  useEffect(() => {
    if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {
      embedSettings.inputbarDisabled = true;
    }
    embedSettings.sessionId = sessionId;
    embedSettings.serialNo = serialNo;
  }, [embedSettings?.loaded, sessionId]);

  const positionClasses = {
    "bottom-left": "allm-bottom-0 allm-left-0 allm-ml-4",
    "bottom-right": "allm-bottom-0 allm-right-0 allm-mr-4",
  };

  const position = embedSettings.position || "bottom-right";

  const positionStyle = {
    bottom: Number(embedSettings?.bottom) || 30,
    ...(position === "bottom-left"
      ? { left: Number(embedSettings?.sides) || 30 }
      : { right: Number(embedSettings?.sides) || 30 }),
  };

  const windowWidth = embedSettings.windowWidth ?? "410px";
  const windowHeight = embedSettings.windowHeight ?? "85%";

  const openBot = async () => {
    toggleOpenChat(true);
  };

  const variants = {
    open: {
      scale: embedSettings.inputbarDisabled ? 1 : 1,
      opacity: embedSettings.inputbarDisabled ? 1 : 1,
      transition: embedSettings.inputbarDisabled
        ? {}
        : { duration: 0.5, ease: [0.76, 0, 0.24, 1] },
    },
    closed: {
      scale: embedSettings.inputbarDisabled ? 1 : 0,
      opacity: embedSettings.inputbarDisabled ? 1 : 0,
      transition: embedSettings.inputbarDisabled
        ? {}
        : { duration: 0.5, ease: [0.6, 0, 0.24, 1] },
    },
  };

  const openingMessageVariants = {
    closed: { opacity: 0, scale: 0.8 },
    open: { opacity: 1, scale: 1 },
  };

  const buttonVariants = {
    closed: { opacity: 0, scale: 0.8 },
    open: { opacity: 1, scale: 1 },
  };

  const transformOrigin = isLargeScreen
    ? `${position.split("-")[1] === "right" ? "right" : "left"} ${position.split("-")[0]}`
    : "bottom";

  useEffect(() => {
    if (embedSettings && embedSettings.embedId) {
      const HUMAN_CONNECT = `allm_${embedSettings.embedId}_human_connect`;
      const saved = window.localStorage.getItem(HUMAN_CONNECT);
      setHumanConnect(saved === "true"); // boolean
    }
  }, [embedSettings?.embedId]);

  useEffect(() => {
    if (embedSettings && embedSettings.embedId) {
      const HUMAN_CONNECT = `allm_${embedSettings.embedId}_human_connect`;
      window.localStorage.setItem(HUMAN_CONNECT, String(humanConnect));
    }
  }, [humanConnect, embedSettings?.embedId]);

  if (!embedSettings.loaded || !sessionId) return null;

  return (
    <>
      <Head />
      <div id="anyhting-all-wrapper">
        <div id="anything-llm-embed-chat-container">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                id="anything-llm-chat"
                variants={variants}
                initial="closed"
                animate="open"
                exit="closed"
                style={{
                  transformOrigin,
                  width: isLargeScreen ? windowWidth : "100%",
                  height: isLargeScreen ? windowHeight : "100%",
                }}
                className={`allm-h-full allm-w-full allm-bg-transparent allm-fixed allm-bottom-0 md:allm-bottom-[10px] allm-z-[9999] allm-right-0 
                ${isLargeScreen ? positionClasses[position] : ""} allm-rounded-2xl`}
              >
                <ChatWindow
                  isChatOpen={isChatOpen}
                  closeChat={() => toggleOpenChat(false)}
                  settings={embedSettings}
                  sessionId={sessionId}
                  isLargeScreen={isLargeScreen}
                  nudgeClick={nudgeClick}
                  setNudgeClick={setNudgeClick}
                  nudgeText={nudgeText}
                  upsellingProdct={upsellingProdct}
                  humanConnect={humanConnect}
                  setHumanConnect={setHumanConnect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!isChatOpen && (
          <div>
            <AnimatePresence>
              {nudgeAppear && (
                <motion.div
                  key={`welcome-message-${nudgeKey}`}
                  variants={openingMessageVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className={`allm-fixed allm-bottom-[100px] allm-max-w-[250px] md:allm-max-w-[300px] allm-bg-transparent`}
                  style={{
                    ...positionStyle,
                    transformOrigin,
                    bottom: Number(embedSettings.bottom) + 90,
                    // y,
                  }}
                  onAnimationStart={playSound}
                >
                  {nudgeText && (
                    <div className="allm-relative allm-flex allm-flex-col allm-items-end allm-py-[16px] allm-mr-[5px] allm-gap-2">
                      <div
                        onClick={handleCloseFirstMessage}
                        style={{
                          backgroundColor: embedSettings.nudgeBgColor,
                        }}
                        className="allm-right-[5px] hover:allm-cursor-pointer allm-rounded-full allm-p-1 allm-flex allm-items-center allm-justify-center"
                      >
                        <RxCross2
                          size={18}
                          color={embedSettings.nudgeTextColor}
                        />
                      </div>
                      <div
                        id="allm-starting-message-div"
                        style={{
                          backgroundColor: embedSettings.nudgeBgColor,
                          color: embedSettings.nudgeTextColor,
                        }}
                        className="allm-flex allm-flex-row allm-rounded-2xl allm-p-[14px] hover:allm-shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:allm-cursor-pointer"
                        //  hover:allm-border-white hover:allm-border-solid allm-border-[1px]
                        onClick={() => {
                          if (cartHandle) {
                            if (embedSettings.brandDomain === "reginaldmen.com")
                              window.openGokwikSideCart();
                            else window.location.href = cartHandle;
                          } else {
                            openBot();
                          }
                        }}
                      >
                        {upsellingProdct && (
                          <img
                            src={upsellingProdct?.image}
                            alt="Product Image"
                            style={{ width: "80px", height: "80px" }}
                            className="allm-rounded-lg allm-mr-[10px]"
                          />
                        )}
                        <span
                          id="allm-starting-message"
                          style={{
                            wordBreak: "break-word",
                            WebkitLineClamp: upsellingProdct?.image ? 4 : 3,
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            maxHeight: upsellingProdct?.image ? "80px" : "60px", // Adjust based on line-height (e.g., 20px * 3)
                          }}
                          className="allm-text-[14px] allm-leading-[20px]"
                        >
                          {nudgeText}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              <motion.div
                key="chat-button"
                variants={buttonVariants}
                initial="closed"
                animate="open"
                exit="closed"
                id="anything-llm-embed-chat-button-container"
                className="allm-fixed allm-z-50 allm-p-4 allm-rounded-full "
                style={{
                  ...positionStyle,
                  transformOrigin,
                  // y,
                }}
              >
                <OpenButton
                  settings={embedSettings}
                  isOpen={isChatOpen}
                  toggleOpen={openBot}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
