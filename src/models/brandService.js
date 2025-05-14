const BrandService = {
  getBrandDetails: async function (host) {
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

      const data = await response.json();


      // only for dev
      if (data && data.embed_id) {
        data.embed_id = "7cb5d6db-8b37-4c2c-8863-fdaf59ecf962"; // Change embed_id here
      }

      console.log("data", data);

      return data;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
};

export default BrandService;
