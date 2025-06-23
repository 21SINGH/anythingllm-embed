const BrandService = {
  getBrandDetails: async function (host, baseApiUrl) {
    if (!host) return;
    const url = `https://shoppie-backend.aroundme.global/api/stores/${host}`;

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

      if (baseApiUrl === "https://anythingllm-dev1.aroundme.global/api/embed") {
        console.log("setting up dev emebed id");

        data = {
          ...data,
          embed_id: "ad86110c-462b-41bd-b8b5-b7a889eb1b50",
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
    const url = ` https://shoppie-backend.aroundme.global/api/store_prompts/generate-suggested-questions`;

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
