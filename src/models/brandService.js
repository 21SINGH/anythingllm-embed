const BrandService = {
  getBrandDetails: async function (host, baseApiUrl) {
    if (!host) return;
    const url = `https://shoppie-backend.goshoppie.com/api/stores/${host}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch brand details");
      }

      let data = await response.json();

      if (baseApiUrl === "https://anythingllm-dev1.goshoppie.com/api/embed") {
        console.log("setting up dev emebed id");

        data = {
          ...data,
          embed_id: "7414ae0c-42bc-46d9-9fdc-3bb47ef21e31",
        };
      }

      return data;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
  generateFollowUpQuestion: async function (host, title, session_id) {
    if (!host) return;
    const url = ` https://shoppie-backend.goshoppie.com/api/store_prompts/generate-suggested-questions`;

    const body = JSON.stringify({
      host,
      title,
      session_id,
      product: null,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch follow-up questions: ${response.status}`
        );
      }

      const data = await response.json();
      return data.suggested_questions;
    } catch (error) {
      console.error("Error fetching follow-up questions:", error.message);
      return null;
    }
  },
};

export default BrandService;
