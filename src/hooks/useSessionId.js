import { useEffect, useState } from "react";

export default function useSessionId(embedSettings) {
  const [sessionId, setSessionId] = useState("");
  const [serialNo, setSerialNo] = useState("");

  useEffect(() => {
    if (!embedSettings?.embedId || !embedSettings?.host) return;

    const STORAGE_IDENTIFIER = `allm_${embedSettings.embedId}_session_id`;
    const ANONYMOUS_MODE = `allm_${embedSettings.embedId}_anonymous_mode`;
    const PRODUCT_CONTEXT_INDENTIFIER = `allm_${embedSettings.embedId}_product_id`;
    const PAGE_CONTEXT_IDENTIFIER = `allm_${embedSettings.embedId}_page_context`;
    const DEFAULT_NUDGE_ALLOW = `allm_${embedSettings.embedId}_default_nudge_allow`;
    const currentId = window.localStorage.getItem(STORAGE_IDENTIFIER);
    

    const sendSessionToAPI = async (id) => {
      try {
        const url = new URL(
          "https://shoppie-backend.goshoppie.com/api/store_prompts/session"
        );
        url.searchParams.append("host", embedSettings.host);
        if (id) url.searchParams.append("session_id", id);

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error("Failed to send session to API");
        }

        const data = await response.json();

        const isSameSession = id === data.session_id;

        setSessionId(data.session_id);
        setSerialNo(data.serial_no);
        window.localStorage.setItem(STORAGE_IDENTIFIER, data.session_id);

        const event = new CustomEvent("session_changed", {
          detail: { value: data.session_id },
        });
        window.dispatchEvent(event);

        if (!isSameSession) {
          window.localStorage.setItem(ANONYMOUS_MODE, "false");
          window.sessionStorage.setItem(DEFAULT_NUDGE_ALLOW, "true");
        }

        if (!window.sessionStorage.getItem(PRODUCT_CONTEXT_INDENTIFIER)) {
          window.sessionStorage.setItem(PRODUCT_CONTEXT_INDENTIFIER, null);
        }
        if (!window.sessionStorage.getItem(PAGE_CONTEXT_IDENTIFIER)) {
          window.sessionStorage.setItem(PAGE_CONTEXT_IDENTIFIER, null);
        }
      } catch (error) {
        console.error("Error sending session to API:", error);
      }
    };

    sendSessionToAPI(currentId); // send currentId (or undefined)
  }, [embedSettings?.embedId, embedSettings?.host]);

  return { sessionId, serialNo };
}
