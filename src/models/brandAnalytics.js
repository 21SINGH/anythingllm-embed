const BrandAnalytics = {
  sendAnalytics: async function (
    embedSettings,
    sessionId,
    type,
    product = null
  ) {
    const url = "https://analytics-backend.aroundme.global/api/shoppie/";

    const body = {
      type,
      host: embedSettings?.host,
      content: String(product?.product_name || product?.title) || null,
      session_id: sessionId,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to send analytics data");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending analytics data:", error);
      return null;
    }
  },
  sendTokenAnalytics: async function (embedSettings, sessionId) {
    const url =
      "https://analytics-backend.aroundme.global/api/shoppie/chat-token";

    const body = {
      host: embedSettings?.host,
      session_id: sessionId,
      embed_id: embedSettings?.embedId,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to send analytics data");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending analytics data:", error);
      return null;
    }
  },
  connectToLiveAgent: async function (embedSettings, sessionId) {
    const url =
      "https://analytics-backend.aroundme.global/api/shoppie/live-agent";

    const body = {
      host: embedSettings?.host,
      content: null,
      session_id: sessionId,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to send analytics data");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending analytics data:", error);
      return null;
    }
  },
};

export default BrandAnalytics;
