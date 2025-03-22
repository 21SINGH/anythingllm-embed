import { useEffect, useState } from "react";
import { embedderSettings } from "../main";
import { v4 } from "uuid";

export default function useSessionId() {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    function getOrAssignSessionId() {
      if (!window || !embedderSettings?.settings?.embedId) return;
      const STORAGE_IDENTIFIER = `allm_${embedderSettings?.settings?.embedId}_session_id`;

      if (
        embedderSettings?.settings?.embedId ===
        "bbc22a75-2033-41a9-8327-6e51caad0c39"
      ) {
        window.localStorage.setItem(
          STORAGE_IDENTIFIER,
          "d5c5134a-ab48-458d-bc90-16cb66456426"
        );
        setSessionId("d5c5134a-ab48-458d-bc90-16cb66456426");
      } else {
        const currentId = window.localStorage.getItem(STORAGE_IDENTIFIER);
        if (!!currentId) {
          console.log(`Resuming session id`, currentId);
          setSessionId(currentId);
          return;
        }

        const newId = v4();
        console.log(`Registering new session id`, newId);
        window.localStorage.setItem(STORAGE_IDENTIFIER, newId);
        setSessionId(newId);
      }
    }
    getOrAssignSessionId();
  }, [window]);

  return sessionId;
}
