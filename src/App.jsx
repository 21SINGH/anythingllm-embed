import React, { useEffect, useState, useRef } from "react";
import useGetScriptAttributes from "@/hooks/useScriptAttributes";
import useSessionId from "@/hooks/useSessionId";
import useOpenChat from "@/hooks/useOpen";
import Head from "@/components/Head";
import OpenButton from "@/components/OpenButton";
import ChatWindow from "./components/ChatWindow";
import {
  useMotionValue,
  useTransform,
  motion,
  AnimatePresence,
  useAnimationFrame,
} from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import BrandAnalytics from "@/models/brandAnalytics";
import BrandService from "@/models/brandService";
import popMusic from "@/assets/pop.mp3";
import notificationMusic from "@/assets/notification.mp3";
import sound3 from "@/assets/3.mp3";
import useShakeAndBounceAnimation from "./hooks/useShakeAndBounceAnimation";

export default function App() {
  const { isChatOpen, toggleOpenChat } = useOpenChat();
  const embedSettings = useGetScriptAttributes();
  const { sessionId, serialNo } = useSessionId(embedSettings);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [interaction, setInteraction] = useState(false);
  const [nudgeAppear, setNudgeAppear] = useState(false);
  const [nudgeText, setNudgeText] = useState("");
  const [nudgeClick, setNudgeClick] = useState(false);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [followUpQuestion, setFollowUpQuestions] = useState([]);
  const [loadingFollowUpQuestion, setLoadingFollowUpQuestions] =
    useState(false);
  const hasPlayed = useRef(false);
  const previousNudgeText = useRef("");
  const [openingMessage, setOpeningMessage] = useState("");
  const DEFAULT_NUDGE_MESSAGE = "Welcome! How can I assist you?";

const { x, y } = useShakeAndBounceAnimation(nudgeText,openingMessage);

  // 1. Create a shared motion value for Y
  const sharedY = useMotionValue(0);
  const startTime = useRef(performance.now());

  // 2. Animate the sharedY value in a loop (sinusoidal motion)
  useAnimationFrame((t) => {
    const elapsed = (t - startTime.current) / 1000; // seconds
    const amplitude = 10; // px up/down
    const period = 2; // seconds for a full cycle
    const y = Math.sin((elapsed / period) * 2 * Math.PI) * amplitude;
    sharedY.set(y);
  });

  const playSound = (variant) => {
    if (
      variant === "open" &&
      !hasPlayed.current &&
      nudgeText !== openingMessage &&
      nudgeText !== previousNudgeText.current
    ) {
      const audio = new Audio(sound3);
      audio.play();
      hasPlayed.current = true;
      previousNudgeText.current = nudgeText;
    }
  };

  useEffect(() => {
    hasPlayed.current = false;
  }, [nudgeAppear]);

  useEffect(() => {
    if (isChatOpen && embedSettings.host && sessionId)
      BrandAnalytics.sendAnalytics(embedSettings, sessionId, "tap_widget");
  }, [isChatOpen, embedSettings.host, sessionId]);

  useEffect(() => {
    const newOpeningMessage =
      embedSettings.openingMessage || DEFAULT_NUDGE_MESSAGE;
    setOpeningMessage(newOpeningMessage);
  }, [embedSettings.openingMessage]);

  useEffect(() => {
    const handleNudgeUpdate = (event) => {
      const { key, value } = event.detail || {};

      if (key === "shoppieAINudgeMessage") {
        setNudgeAppear(false);
        setNudgeText(value);

        const showTimer = setTimeout(() => {
          setNudgeAppear(true);
          setNudgeClick(true);
        }, 350);

        const defaultTimer = setTimeout(() => {
          const defaultMessage = openingMessage || DEFAULT_NUDGE_MESSAGE;
          setNudgeAppear(false);
          setTimeout(() => {
            setNudgeText(defaultMessage);
            setNudgeAppear(true);
            setNudgeKey((prev) => prev + 1);
            setNudgeClick(false);
          }, 450);
        }, 20000);

        return () => {
          clearTimeout(showTimer);
          clearTimeout(defaultTimer);
        };
      }
    };

    window.addEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);

    return () => {
      window.removeEventListener("shoppieAINudgeUpdated", handleNudgeUpdate);
    };
  }, [openingMessage]);

  useEffect(() => {
    if (embedSettings?.openingMessage !== "") {
      setNudgeAppear(true);
      setNudgeText(embedSettings?.openingMessage);
    }
  }, [embedSettings]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 560);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCloseFirstMessage = () => {
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
    if (nudgeClick) fetchFollowUpQuestion();
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

  // const buttonVariants = {
  //   open: {
  //     scale: embedSettings.inputbarDisabled ? 1 : 1,
  //     opacity: embedSettings.inputbarDisabled ? 1 : 1,
  //     transition: embedSettings.inputbarDisabled
  //       ? {} // No transition if disabled
  //       : { duration: 0.4, ease: [0.76, 0, 0.24, 1] },
  //   },
  //   closed: {
  //     scale: embedSettings.inputbarDisabled ? 1 : 0,
  //     opacity: embedSettings.inputbarDisabled ? 1 : 0,
  //     transition: embedSettings.inputbarDisabled
  //       ? {} // No transition if disabled
  //       : { duration: 0.1, ease: [0.6, 0, 0.24, 1] },
  //   },
  // };

  // Simplified variants to avoid transform conflicts
  const openingMessageVariants = {
    closed: { opacity: 0, scale: 0.8 },
    open: { opacity: 1, scale: 1 },
  };

  const buttonVariants = {
    closed: { opacity: 0, scale: 0.8 },
    open: { opacity: 1, scale: 1 },
  };

  // const openingMessageVariants = {
  //   open: {
  //     scale: embedSettings.inputbarDisabled ? 1 : 1,
  //     opacity: embedSettings.inputbarDisabled ? 1 : 1,
  //     transition: embedSettings.inputbarDisabled
  //       ? {} // No transition if disabled
  //       : { duration: 0.3, ease: [0.76, 0, 0.24, 1] },
  //   },
  //   closed: {
  //     scale: embedSettings.inputbarDisabled ? 1 : 0,
  //     opacity: embedSettings.inputbarDisabled ? 1 : 0,
  //     transition: embedSettings.inputbarDisabled
  //       ? {} // No transition if disabled
  //       : { duration: 0.2, ease: [0.6, 0, 0.24, 1] },
  //   },
  // };

  // const buttonVariants = {
  //   closed: {
  //     scale: 0,
  //     opacity: 0,
  //   },
  //   open: {
  //     scale: 1,
  //     opacity: 1,
  //     transition: {
  //       type: "spring",
  //       stiffness: 260,
  //       damping: 20,
  //       mass: 0.5,
  //     },
  //   },
  // };

  const transformOrigin = isLargeScreen
    ? `${position.split("-")[1] === "right" ? "right" : "left"} ${position.split("-")[0]}`
    : "bottom";

  const fetchFollowUpQuestion = async () => {
    try {
      setLoadingFollowUpQuestions(true);
      const followUpQuestion = await BrandService.generateFollowUpQuestion(
        embedSettings.host,
        nudgeText,
        sessionId
      );
      setFollowUpQuestions(followUpQuestion);
      setLoadingFollowUpQuestions(false);
    } catch (error) {
      setLoadingFollowUpQuestions(false);
      console.error("Failed to fetch follow-up question:", error);
      return null;
    }
  };

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
                  followUpQuestion={followUpQuestion}
                  setFollowUpQuestions={setFollowUpQuestions}
                  loadingFollowUpQuestion={loadingFollowUpQuestion}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* {!isChatOpen && (
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
                    bottom: Number(embedSettings.bottom) + 70,
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
                        className="allm-rounded-2xl allm-p-[14px] hover:allm-shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:allm-cursor-pointer hover:allm-border-white hover:allm-border-solid allm-border-[1px] "
                        onClick={() => {
                          openBot();
                        }}
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
                className="allm-fixed allm-z-50 allm-p-4 allm-rounded-full allm-mt-[5px]"
                style={{ ...positionStyle, transformOrigin }}
                whileInView={{
                  y: [-10, 10, -10], // Continuous up-and-down movement
                  transition: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 2,
                    ease: "easeInOut",
                  },
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
        )} */}
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
                    x,
                    y,
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
                        className="allm-rounded-2xl allm-p-[14px] hover:allm-shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:allm-cursor-pointer hover:allm-border-white hover:allm-border-solid allm-border-[1px]"
                        onClick={() => {
                          openBot();
                        }}
                      >
                        <span
                          id="allm-starting-message"
                          style={{
                            wordBreak: "break-word",
                          }}
                          className="allm-text-[14px] allm-line-clamp-3 allm-leading-[20px]"
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
                  x,
                  y,
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

// y: sharedY,
