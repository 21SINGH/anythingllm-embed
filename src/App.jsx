import useGetScriptAttributes from "@/hooks/useScriptAttributes";
import useSessionId from "@/hooks/useSessionId";
import useOpenChat from "@/hooks/useOpen";
import Head from "@/components/Head";
import OpenButton from "@/components/OpenButton";
import ChatWindow from "./components/ChatWindow";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import BrandAnalytics from "@/models/brandAnalytics";

export default function App() {
  const { isChatOpen, toggleOpenChat } = useOpenChat();
  const embedSettings = useGetScriptAttributes();
  const { sessionId, serialNo } = useSessionId(embedSettings);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [interaction, setInteraction] = useState(false);
  const [showFirstMessage, setShowFirstMessage] = useState(true);
  const [nudgeAppear, setNudgeAppear] = useState(false);
  const [nudgeText, setNudgeText] = useState("");

  useEffect(() => {
    if (isChatOpen)
      BrandAnalytics.sendAnalytics(embedSettings, sessionId, "tap_widget");
  }, [isChatOpen]);

  // useEffect(() => {
  //   const handleNudgeUpdate = (event) => {
  //     const { key, value } = event.detail || {};

  //     if (key === "shoppieAINudgeMessage") {
  //       setNudgeAppear(false);
  //       setNudgeText(value);

  //       setTimeout(() => {
  //         setNudgeAppear(true);
  //       }, 400);

  //       console.log("New nudge message:", value);
  //     }
  //   };

  //   window.addEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);

  //   return () => {
  //     window.removeEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);
  //   };
  // }, []);

  useEffect(() => {
    if (embedSettings?.openingMessage !== "") {
      setNudgeAppear(true);
      setNudgeText(embedSettings?.openingMessage);
    }
  }, [embedSettings]);

  useEffect(() => {
    console.log("nudge text", nudgeText);
    console.log("nudge appear", nudgeAppear);
  }, [nudgeAppear, nudgeText]);

  useEffect(() => {
    // const firstMessageShown = sessionStorage.getItem("firstMessageShown");
    // if (!firstMessageShown) {
    //   setShowFirstMessage(true);
    // }

    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 560);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCloseFirstMessage = () => {
    // sessionStorage.setItem("firstMessageShown", "true");
    setShowFirstMessage(false);
    setNudgeAppear(false);
  };

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!interaction) {
        setInteraction(true);
      }
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, [interaction]);

  useEffect(() => {
    if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {
      embedSettings.inputbarDisabled = true;
    }
    embedSettings.sessionId = sessionId;
    embedSettings.serialNo = serialNo;
  }, [embedSettings?.loaded, sessionId]);

  // useEffect(() => {
  //   const sendBrandView = async () => {
  //     await BrandAnalytics.sendAnalytics(
  //       embedSettings,
  //       sessionId,
  //       "brand_view"
  //     );
  //   };
  //   const sendWidgetClick = async () => {
  //     toggleOpenChat(true);
  //     await BrandAnalytics.sendAnalytics(
  //       embedSettings,
  //       sessionId,
  //       "tap_widget"
  //     );
  //   };

  //   if (embedSettings.openOnLoad === "on") {
  //     sendWidgetClick();
  //   }
  //   if (isChatOpen) sendWidgetClick();

  //   if (embedSettings.loaded) {
  //     sendBrandView();
  //   }
  // }, [embedSettings.loaded, sessionId]);

  console.log("embed settings", embedSettings);

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

  const buttonVariants = {
    open: {
      scale: embedSettings.inputbarDisabled ? 1 : 1,
      opacity: embedSettings.inputbarDisabled ? 1 : 1,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.4, ease: [0.76, 0, 0.24, 1] },
    },
    closed: {
      scale: embedSettings.inputbarDisabled ? 1 : 0,
      opacity: embedSettings.inputbarDisabled ? 1 : 0,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.1, ease: [0.6, 0, 0.24, 1] },
    },
  };

  const openingMessageVariants = {
    open: {
      scale: embedSettings.inputbarDisabled ? 1 : 1,
      opacity: embedSettings.inputbarDisabled ? 1 : 1,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.3, ease: [0.76, 0, 0.24, 1] },
    },
    closed: {
      scale: embedSettings.inputbarDisabled ? 1 : 0,
      opacity: embedSettings.inputbarDisabled ? 1 : 0,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.2, ease: [0.6, 0, 0.24, 1] },
    },
  };

  const transformOrigin = isLargeScreen
    ? `${position.split("-")[1] === "right" ? "right" : "left"} ${position.split("-")[0]}`
    : "bottom";

  if (!embedSettings.loaded || !sessionId) return null;

  return (
    <>
      <Head />
      <div id="anyhting-all-wrapper">
        <div id="anything-llm-embed-chat-container">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
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
                  closeChat={() => toggleOpenChat(false)}
                  settings={embedSettings}
                  sessionId={sessionId}
                  isLargeScreen={isLargeScreen}
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
                  key="welcome-message"
                  variants={openingMessageVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className={`allm-fixed allm-bottom-[100px] allm-max-w-[250px] md:allm-max-w-[300px] allm-bg-transparent`}
                  style={{
                    ...positionStyle,
                    transformOrigin,
                    bottom: Number(embedSettings.bottom) + 70,
                  }}
                  // onAnimationStart={playSound}
                >
                  {nudgeText && (
                    <div className="allm-relative allm-flex allm-flex-col allm-items-end allm-py-[16px] allm-mr-[5px] allm-gap-2">
                      <div
                        onClick={handleCloseFirstMessage}
                        style={{
                          backgroundColor: embedSettings.nudgeBgColor,
                        }}
                        className="allm-right-[5px]  hover:allm-cursor-pointer allm-rounded-full allm-p-1  allm-flex allm-items-center allm-justify-center"
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
                        className="allm-rounded-2xl allm-p-[12px]"
                      >
                        <span
                          id="allm-starting-message"
                          style={{
                            wordBreak: "break-word",
                          }}
                          className="allm-text-[14px]  allm-line-clamp-3 allm-leading-[20px]"
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
                className={`allm-fixed allm-z-50`}
                style={{ ...positionStyle, transformOrigin }}
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

const playSound = () => {
  if (!sessionStorage.getItem("stop-sound")) {
    const audio = new Audio(
      "https://pub-8c1bb6e7c1dc4de9a9c50ab4d399094d.r2.dev/discord-message.mp3"
    );
    audio.play();
    sessionStorage.setItem("stop-sound", "true");
  }
};
