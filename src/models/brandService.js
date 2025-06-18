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

      // if (baseApiUrl === "https://anythingllm-dev1.aroundme.global/api/embed") {
      //   console.log("setting up dev emebed id");

      //   data = {
      //     ...data,
      //     embed_id: "ad86110c-462b-41bd-b8b5-b7a889eb1b50",
      //   };
      // }

      return data;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
};

export default BrandService;
