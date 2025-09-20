const StoreMessageDB = {
  postMessageInDB: async function (
    settings,
    userMessage,
    botReply,
    include // optional param
  ) {
    const url = `https://shoppie-backend.goshoppie.com/api/anythingllm/`;

    const bodyPayload = {
      embed_id: `${settings.embedId}`,
      prompt: `${userMessage}`,
      response: { text: `${botReply}` },
      session_id: `${settings.sessionId}`,
      include: include ?? true, // include is false if passed, otherwise defaults to true
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
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
