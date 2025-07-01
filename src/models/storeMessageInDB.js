const StoreMessageDB = {
  postMessageInDB: async function (settings, userMessage, botReply) {
    const url = `https://shoppie-backend-dev.goshoppie.com/api/anythingllm/`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embed_id: `${settings.embedId}`,
          prompt: `${userMessage}`,
          response: { text: `${botReply}` },
          session_id: `${settings.sessionId}`,
          include: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to store message in db");
      }
    } catch (error) {
      console.error("Error storing message in db:", error);
      throw error;
    }
  },
};

export default StoreMessageDB;
