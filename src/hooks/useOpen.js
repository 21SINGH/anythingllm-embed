// import { CHAT_UI_REOPEN } from "@/utils/constants";
// import { useState, useEffect } from "react";

// export default function useOpenChat() {
//   // Initialize state based on localStorage or default to false
//   const [isOpen, setOpen] = useState(() => {
//     const storedValue = window.localStorage.getItem(CHAT_UI_REOPEN);
//     // If stored value is "1", reset to "0" and return false
//     if (storedValue === "1") {
//       window.localStorage.setItem(CHAT_UI_REOPEN, "0");
//       return false;
//     }
//     return storedValue === "1";
//   });

//   // Sync initial localStorage value only if not already handled
//   useEffect(() => {
//     const storedValue = window.localStorage.getItem(CHAT_UI_REOPEN);
//     if (storedValue !== "1") {
//       window.localStorage.setItem(CHAT_UI_REOPEN, "0");
//     }
//   }, []);

//   function toggleOpenChat(newValue) {
//     // Convert boolean to string "1" or "0"
//     const storageValue = newValue ? "1" : "0";
//     window.localStorage.setItem(CHAT_UI_REOPEN, storageValue);
//     setOpen(newValue);
//   }

//   return { isChatOpen: isOpen, toggleOpenChat };
// }


import { CHAT_UI_REOPEN } from "@/utils/constants";
import { useState, useEffect } from "react";

export default function useOpenChat() {
  // Initialize state based on localStorage or default to false
  const [isOpen, setOpen] = useState(() => {
    const storedValue = window.localStorage.getItem(CHAT_UI_REOPEN);
    // If stored value is "1", reset to "0" and return false
    if (storedValue === "1") {
      window.localStorage.setItem(CHAT_UI_REOPEN, "0");
      return false;
    }
    return storedValue === "1";
  });

  // Sync initial localStorage value and fire event if set to "0"
  useEffect(() => {
    const storedValue = window.localStorage.getItem(CHAT_UI_REOPEN);
    if (storedValue !== "1") {
      window.localStorage.setItem(CHAT_UI_REOPEN, "0");
      // Fire chatbot_open event with value "0"
      const event = new CustomEvent("chatbot_open", {
        detail: { value: "0" },
      });
      window.dispatchEvent(event);
    }
  }, []);

  function toggleOpenChat(newValue) {
    // Convert boolean to string "1" or "0"
    const storageValue = newValue ? "1" : "0";
    window.localStorage.setItem(CHAT_UI_REOPEN, storageValue);
    setOpen(newValue);

    // Fire chatbot_open event with the new value (1 or 0)
    const event = new CustomEvent("chatbot_open", {
      detail: { value: storageValue },
    });
    window.dispatchEvent(event);
  }

  return { isChatOpen: isOpen, toggleOpenChat };
}