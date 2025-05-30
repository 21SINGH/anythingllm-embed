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
            
      return data;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
};

export default BrandService;
