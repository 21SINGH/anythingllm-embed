import { useEffect, useState } from "react";

export default function useSessionId(embedSettings) {
  const [sessionId, setSessionId] = useState("");
  const [serialNo, setSerialNo] = useState("");

  useEffect(() => {
    if (!embedSettings?.embedId || !embedSettings?.host) return;

    const STORAGE_IDENTIFIER = `allm_${embedSettings.embedId}_session_id`;
    const ANONYMOUS_MODE = `allm_${embedSettings.embedId}_anonymous_mode`;
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

        const data = await response.json();

        const isSameSession = id === data.session_id;

        if (!isSameSession) {
          window.localStorage.setItem(ANONYMOUS_MODE, "false");
        }

        setSessionId(data.session_id);
        setSerialNo(data.serial_no);
        window.localStorage.setItem(STORAGE_IDENTIFIER, data.session_id);
      } catch (error) {
        console.error("Error sending session to API:", error);
      }
    };

    sendSessionToAPI(currentId); // send currentId (or undefined)
  }, [embedSettings?.embedId, embedSettings?.host]);

  return { sessionId, serialNo };
}
