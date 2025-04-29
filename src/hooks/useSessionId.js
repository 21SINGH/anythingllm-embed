// import { useEffect, useState } from "react";
// import { embedderSettings } from "../main";
// import { v4 } from "uuid";

// export default function useSessionId(embedSettings) {
//   const [sessionId, setSessionId] = useState("");
//   useEffect(() => {
//     function getOrAssignSessionId() {
//       if (!window || embedSettings.embedId) return null;
//       console.log("embedSettings", embedSettings);

//       const STORAGE_IDENTIFIER = `allm_${embedSettings.embedId}_session_id`;

//       if (embedSettings?.embedId === "bbc22a75-2033-41a9-8327-6e51caad0c39") {
//         window.localStorage.setItem(
//           STORAGE_IDENTIFIER,
//           "d5c5134a-ab48-458d-bc90-16cb66456426"
//         );
//         setSessionId("d5c5134a-ab48-458d-bc90-16cb66456426");
//       } else {
//         const currentId = window.localStorage.getItem(STORAGE_IDENTIFIER);
//         if (!!currentId) {
//           console.log(`Resuming session id`, currentId);
//           setSessionId(currentId);
//           return;
//         }

//         const newId = v4();
//         console.log(`Registering new session id`, newId);
//         window.localStorage.setItem(STORAGE_IDENTIFIER, newId);
//         setSessionId(newId);
//       }
//     }
//     getOrAssignSessionId();
//   }, [window]);

//   return sessionId;
// }
import { useEffect, useState } from "react";

export default function useSessionId(embedSettings) {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (!embedSettings?.embedId || !embedSettings?.host) return;

    const STORAGE_IDENTIFIER = `allm_${embedSettings.embedId}_session_id`;
    const currentId = window.localStorage.getItem(STORAGE_IDENTIFIER);

    const sendSessionToAPI = async (id) => {
      try {
        const url = new URL(
          "https://shoppie-backend.aroundme.global/api/store_prompts/session"
        );
        url.searchParams.append("host", embedSettings.host);
        if (id) url.searchParams.append("session_id", id);

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error("Failed to send session to API");
        }

        const sessionId = await response.json();

        console.log("Received session ID from API:", sessionId);
        setSessionId(sessionId);
        window.localStorage.setItem(STORAGE_IDENTIFIER, sessionId);
      } catch (error) {
        console.error("Error sending session to API:", error);
      }
    };

    sendSessionToAPI(currentId); // send currentId (or undefined)
  }, [embedSettings?.embedId, embedSettings?.host]);

  return sessionId;
}
