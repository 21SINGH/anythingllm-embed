// import useGetScriptAttributes from "@/hooks/useScriptAttributes";
// import useSessionId from "@/hooks/useSessionId";
// import useOpenChat from "@/hooks/useOpen";
// import Head from "@/components/Head";
// import OpenButton from "@/components/OpenButton";
// import ChatWindow from "./components/ChatWindow";
// import { useEffect, useState } from "react";
// import BrandAnalytics from "@/models/brandAnalytics";
// import { motion, AnimatePresence } from "framer-motion";

// export default function App() {
//   const { isChatOpen, toggleOpenChat } = useOpenChat();
//   const embedSettings = useGetScriptAttributes();
//   const sessionId = useSessionId();
//   const [isLargeScreen, setIsLargeScreen] = useState(true);

//   useEffect(() => {
//     const handleResize = () => {
//       setIsLargeScreen(window.innerWidth > 560); // Adjust 768 to your desired breakpoint
//     };

//     window.addEventListener("resize", handleResize);
//     handleResize(); // Check the screen size on initial render

//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {
//       embedSettings.inputbarDisabled = true;
//     }
//     embedSettings.sessionId = sessionId;
//   }, [embedSettings.loaded, sessionId]);

//   useEffect(() => {
//     const sendBrandView = async () => {
//       await BrandAnalytics.sendAnalytics(
//         embedSettings,
//         sessionId,
//         "brand_view"
//       );
//     };
//     const sendWidgetClick = async () => {
//       toggleOpenChat(true);
//       await BrandAnalytics.sendAnalytics(
//         embedSettings,
//         sessionId,
//         "tap_widget"
//       );
//     };

//     if (embedSettings.openOnLoad === "on") {
//       sendWidgetClick();
//     }
//     if (isChatOpen) sendWidgetClick();

//     if (embedSettings.loaded) {
//       sendBrandView();
//     }
//   }, [embedSettings.loaded, sessionId]);

//   if (!embedSettings.loaded) return null;

//   const positionClasses = {
//     "bottom-left": "allm-bottom-0 allm-left-0 allm-ml-4",
//     "bottom-right": "allm-bottom-0 allm-right-0 allm-mr-4",
//     "top-left": "allm-top-0 allm-left-0 allm-ml-4 allm-mt-4",
//     "top-right": "allm-top-0 allm-right-0 allm-mr-4 allm-mt-4",
//   };

//   const position = embedSettings.position || "bottom-right";
//   const windowWidth = embedSettings.windowWidth ?? "450px";
//   const windowHeight = embedSettings.windowHeight ?? "85%";

//   const openBot = async () => {
//     toggleOpenChat(true);
//     await BrandAnalytics.sendAnalytics(embedSettings, sessionId, "tap_widget");
//   };

//   const variants = {
//     open: {
//       scale: embedSettings.inputbarDisabled ? 1 : 1,
//       opacity: embedSettings.inputbarDisabled ? 1 : 1,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { duration: 0.5, ease: [0.76, 0, 0.24, 1] }, // Normal transitio
//     },
//     closed: {
//       scale: embedSettings.inputbarDisabled ? 1 : 0,
//       opacity: embedSettings.inputbarDisabled ? 1 : 0,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { duration: 0.5, ease: [0.6, 0, 0.24, 1] }, // Normal transition
//     },
//   };

//   const buttonVariants = {
//     open: {
//       scale: embedSettings.inputbarDisabled ? 1 : 1,
//       opacity: embedSettings.inputbarDisabled ? 1 : 1,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { duration: 0.4, ease: [0.76, 0, 0.24, 1] },
//     },
//     closed: {
//       scale: embedSettings.inputbarDisabled ? 1 : 0,
//       opacity: embedSettings.inputbarDisabled ? 1 : 0,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { duration: 0.1, ease: [0.6, 0, 0.24, 1] },
//     },
//   };

//   const openingMessageVariants = {
//     open: {
//       scale: embedSettings.inputbarDisabled ? 1 : 1,
//       opacity: embedSettings.inputbarDisabled ? 1 : 1,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { delay: 2, duration: 0.3, ease: [0.76, 0, 0.24, 1] },
//     },
//     closed: {
//       scale: embedSettings.inputbarDisabled ? 1 : 0,
//       opacity: embedSettings.inputbarDisabled ? 1 : 0,
//       transition: embedSettings.inputbarDisabled
//         ? {} // No transition if disabled
//         : { duration: 0.2, ease: [0.6, 0, 0.24, 1] },
//     },
//   };

//   const transformOrigin = isLargeScreen
//     ? `${position.split("-")[1] === "right" ? "right" : "left"} ${position.split("-")[0]}`
//     : "center";

//   return (
//     <>
//       <Head />
//       <div id="anyhting-all-wrapper">
//         <div id="anything-llm-embed-chat-container">
//           <AnimatePresence>
//             {isChatOpen && (
//               <motion.div
//                 variants={variants}
//                 initial="closed"
//                 animate="open"
//                 exit="closed"
//                 style={{
//                   transformOrigin,
//                   width: isLargeScreen ? windowWidth : "100%",
//                   height: isLargeScreen ? windowHeight : "100%",
//                 }}
//                 className={`allm-h-full allm-w-full allm-bg-transparent allm-fixed allm-bottom-[10px] allm-z-[9999] allm-right-0
//                 ${isLargeScreen ? positionClasses[position] : ""} allm-rounded-2xl`}
//                 id="anything-llm-chat"
//               >
//                 <ChatWindow
//                   closeChat={() => toggleOpenChat(false)}
//                   settings={embedSettings}
//                   sessionId={sessionId}
//                 />
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>

//         {!isChatOpen && (
//           <div>
//             <AnimatePresence>
//               <motion.div
//                 key="welcome-message"
//                 variants={openingMessageVariants}
//                 initial="closed"
//                 animate="open"
//                 exit="closed"
//                 className={`allm-fixed allm-bottom-[110px] ${positionClasses[position]} allm-bg-transparent`}
//                 style={{ transformOrigin }}
//               >
//                 {embedSettings.openingMessage !== "" && (
//                   <div className="allm-relative allm-w-[350px] allm-flex allm-flex-col allm-items-end allm-p-[16px] ">
//                     <div
//                       id="allm-starting-message-div"
//                       style={{
//                         backgroundColor: embedSettings.startingMessageTheme,
//                         color: getContrastColor(
//                           embedSettings.startingMessageTheme
//                         ),
//                         // boxShadow: `0px 5px 5px ${getContrastColor(embedSettings.startingMessageTheme)}`,
//                       }}
//                       className="allm-rounded-lg allm-px-[10px] allm-py-[5px] allm-relative"
//                     >
//                       <p
//                         id="allm-starting-message"
//                         className="allm-text-[14px] allm-font-medium allm-leading-[20px]"
//                       >
//                         {embedSettings.openingMessage}
//                       </p>
//                     </div>

//                     {/* Triangle pointer */}
//                     <div
//                       style={{
//                         position: "absolute",
//                         bottom: "0px",
//                         right: "50px",
//                         width: "0px",
//                         height: "0px",
//                         borderLeft: "30px solid transparent",
//                         borderRight: "0px solid transparent",
//                         borderTop: `20px solid ${embedSettings.startingMessageTheme}`,
//                         display: "block",
//                       }}
//                     ></div>
//                   </div>
//                 )}
//               </motion.div>
//             </AnimatePresence>
//             <AnimatePresence>
//               <motion.div
//                 key="chat-button"
//                 variants={buttonVariants}
//                 initial="closed"
//                 animate="open"
//                 exit="closed"
//                 id="anything-llm-embed-chat-button-container"
//                 className={`allm-fixed allm-bottom-[30px] allm-right-[15px] ${positionClasses[position]} allm-z-50`}
//                 style={{ transformOrigin }}
//               >
//                 <OpenButton
//                   settings={embedSettings}
//                   isOpen={isChatOpen}
//                   toggleOpen={openBot}
//                 />
//               </motion.div>
//             </AnimatePresence>
//           </div>
//         )}
//       </div>
//     </>
//   );
// }

import useGetScriptAttributes from "@/hooks/useScriptAttributes";
import useSessionId from "@/hooks/useSessionId";
import useOpenChat from "@/hooks/useOpen";
import Head from "@/components/Head";
import OpenButton from "@/components/OpenButton";
import ChatWindow from "./components/ChatWindow";
import { useEffect, useState } from "react";
import BrandAnalytics from "@/models/brandAnalytics";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const { isChatOpen, toggleOpenChat } = useOpenChat();
  const embedSettings = useGetScriptAttributes();
  const sessionId = useSessionId();
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  const [interaction, setInteraction] = useState(false); // Track user interaction
  const [startAnimation, setStartAnimation] = useState(false); // Trigger animation after delay

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 560); // Adjust 768 to your desired breakpoint
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check the screen size on initial render

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Add an effect to track user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!interaction) {
        setInteraction(true);
      }
    };

    // Listen to events that represent user interaction
    window.addEventListener("scroll", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    // Cleanup event listeners
    return () => {
      window.removeEventListener("scroll", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, [interaction]);

  // Start the animation after 2 seconds of interaction
  useEffect(() => {
    if (interaction) {
      const timer = setTimeout(() => {
        setStartAnimation(true);
      }, 2000); // Delay of 2 seconds

      // Cleanup the timer if interaction is reset
      return () => clearTimeout(timer);
    }
  }, [interaction]);

  useEffect(() => {
    if (sessionId === "d5c5134a-ab48-458d-bc90-16cb66456426") {
      embedSettings.inputbarDisabled = true;
    }
    embedSettings.sessionId = sessionId;
  }, [embedSettings.loaded, sessionId]);

  useEffect(() => {
    const sendBrandView = async () => {
      await BrandAnalytics.sendAnalytics(
        embedSettings,
        sessionId,
        "brand_view"
      );
    };
    const sendWidgetClick = async () => {
      toggleOpenChat(true);
      await BrandAnalytics.sendAnalytics(
        embedSettings,
        sessionId,
        "tap_widget"
      );
    };

    if (embedSettings.openOnLoad === "on") {
      sendWidgetClick();
    }
    if (isChatOpen) sendWidgetClick();

    if (embedSettings.loaded) {
      sendBrandView();
    }
  }, [embedSettings.loaded, sessionId]);

  if (!embedSettings.loaded) return null;

  const positionClasses = {
    "bottom-left": "allm-bottom-0 allm-left-0 allm-ml-4",
    "bottom-right": "allm-bottom-0 allm-right-0 allm-mr-4",
    "top-left": "allm-top-0 allm-left-0 allm-ml-4 allm-mt-4",
    "top-right": "allm-top-0 allm-right-0 allm-mr-4 allm-mt-4",
  };

  const position = embedSettings.position || "bottom-right";
  const windowWidth = embedSettings.windowWidth ?? "450px";
  const windowHeight = embedSettings.windowHeight ?? "85%";

  const openBot = async () => {
    toggleOpenChat(true);
    await BrandAnalytics.sendAnalytics(embedSettings, sessionId, "tap_widget");
  };

  const variants = {
    open: {
      scale: embedSettings.inputbarDisabled ? 1 : 1,
      opacity: embedSettings.inputbarDisabled ? 1 : 1,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.5, ease: [0.76, 0, 0.24, 1] }, // Normal transitio
    },
    closed: {
      scale: embedSettings.inputbarDisabled ? 1 : 0,
      opacity: embedSettings.inputbarDisabled ? 1 : 0,
      transition: embedSettings.inputbarDisabled
        ? {} // No transition if disabled
        : { duration: 0.5, ease: [0.6, 0, 0.24, 1] }, // Normal transition
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
    : "center";

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
                className={`allm-h-full allm-w-full allm-bg-transparent allm-fixed allm-bottom-[10px] allm-z-[9999] allm-right-0 
                ${isLargeScreen ? positionClasses[position] : ""} allm-rounded-2xl`}
                id="anything-llm-chat"
              >
                <ChatWindow
                  closeChat={() => toggleOpenChat(false)}
                  settings={embedSettings}
                  sessionId={sessionId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isChatOpen && (
          <div>
            <AnimatePresence>
              {startAnimation && (
                <motion.div
                  key="welcome-message"
                  variants={openingMessageVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className={`allm-fixed allm-bottom-[110px] ${positionClasses[position]} allm-bg-transparent`}
                  style={{ transformOrigin }}
                  onAnimationStart={playSound}
                >
                  {embedSettings.openingMessage !== "" && (
                    <div className="allm-relative allm-w-[350px] allm-flex allm-flex-col allm-items-end allm-p-[16px] ">
                      <div
                        id="allm-starting-message-div"
                        style={{
                          backgroundColor: embedSettings.startingMessageTheme,
                          color: getContrastColor(
                            embedSettings.startingMessageTheme
                          ),
                        }}
                        className="allm-rounded-lg allm-px-[10px] allm-py-[5px] allm-relative"
                      >
                        <p
                          id="allm-starting-message"
                          className="allm-text-[14px] allm-font-medium allm-leading-[20px]"
                        >
                          {embedSettings.openingMessage}
                        </p>
                      </div>

                      {/* Triangle pointer */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0px",
                          right: "50px",
                          width: "0px",
                          height: "0px",
                          borderLeft: "30px solid transparent",
                          borderRight: "0px solid transparent",
                          borderTop: `20px solid ${embedSettings.startingMessageTheme}`,
                          display: "block",
                        }}
                      ></div>
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
                className={`allm-fixed allm-bottom-[30px] allm-right-[15px] ${positionClasses[position]} allm-z-50`}
                style={{ transformOrigin }}
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

const getContrastColor = (hex) => {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Calculate luminance (Y) using the relative luminance formula
  let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF"; // Black for light BG, White for dark BG
};

const playSound = () => {
  console.log("sound");

  const audio = new Audio("https://pub-8c1bb6e7c1dc4de9a9c50ab4d399094d.r2.dev/discord-message.mp3");
  audio.play();
};
