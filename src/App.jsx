import useGetScriptAttributes from "@/hooks/useScriptAttributes";
import useSessionId from "@/hooks/useSessionId";
import useOpenChat from "@/hooks/useOpen";
import Head from "@/components/Head";
import OpenButton from "@/components/OpenButton";
import ChatWindow from "./components/ChatWindow";
import { useEffect, useState } from "react";
import BrandAnalytics from "@/models/brandAnalytics";
import { motion, AnimatePresence } from "framer-motion";
// import BrandBotConfigure from "./models/brandBotConfigure";

export default function App() {
  const { isChatOpen, toggleOpenChat } = useOpenChat();
  const embedSettings = useGetScriptAttributes();
  const sessionId = useSessionId();
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 560); // Adjust 768 to your desired breakpoint
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check the screen size on initial render

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    // const getBotDetailes = async () =>{
    //   const res = await BrandBotConfigure.getBotDetails(embedSettings)
    //   console.log('result for bot details',res);

    // }
    if (embedSettings.openOnLoad === "on") {
      sendWidgetClick();
    }
    if (isChatOpen) sendWidgetClick();

    if (embedSettings.loaded) {
      sendBrandView();
      // getBotDetailes()
    }
  }, [embedSettings.loaded]);

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
      scale: 1,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] },
    },
    closed: {
      scale: 0,
      opacity: 0,
      transition: { duration: 0.5, ease: [0.6, 0, 0.24, 1] },
    },
  };

  const transformOrigin = isLargeScreen
    ? `${position.split("-")[1] === "right" ? "right" : "left"} ${position.split("-")[0]}`
    : "center";

    const buttonVariants = {
      open: {
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: [0.76, 0, 0.24, 1] }
      },
      closed: {
        scale: 0,
        opacity: 0,
        transition: { duration: 0.2, ease: [0.6, 0, 0.24, 1] }
      }
    };

    
  return (
    <>
      <Head />
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
              className={`allm-h-full allm-w-full allm-bg-transparent allm-fixed allm-bottom-0 allm-z-[9999] allm-right-0 
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
      <AnimatePresence>
      {!isChatOpen && (
        <>
          <motion.div
            key="welcome-message"
            variants={buttonVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`allm-fixed allm-bottom-20 ${positionClasses[position]} allm-bg-[#2d2d2d] allm-text-white allm-py-2 allm-px-4 allm-rounded-md allm-shadow-lg allm-text-center`}
            style={{ transformOrigin }}
          >
            <p className="allm-text-sm allm-font-medium">
              Welcome to Plix Chat, How can we help you today?
            </p>
          </motion.div>

          <motion.div
            key="chat-button"
            variants={buttonVariants}
            initial="closed"
            animate="open"
            exit="closed"
            id="anything-llm-embed-chat-button-container"
            className={`allm-fixed allm-bottom-0 ${positionClasses[position]} allm-mb-4 allm-z-50`}
            style={{ transformOrigin }}
          >
            <OpenButton
              settings={embedSettings}
              isOpen={isChatOpen}
              toggleOpen={openBot}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
