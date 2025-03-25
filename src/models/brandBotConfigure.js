import BrandService from "@/models/brandService";

const BrandBotConfigure = {
  getBotDetails: async function (embedSettings) {
    const brandData = await BrandService.getBrandDetails(embedSettings);
    const url = `https://shoppie-backend.aroundme.global/api/widget_theme/?brand_id=${brandData.id}`;

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
      return data.theme;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
};

export default BrandBotConfigure;