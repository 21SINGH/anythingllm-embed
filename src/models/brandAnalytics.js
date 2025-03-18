import BrandService from "@/models/brandService";

const BrandAnalytics = {
  sendAnalytics: async function (
    embedSettings,
    sessionId,
    type,
    product = null
  ) {
    const brandData = await BrandService.getBrandDetails(embedSettings);
    const url = "https://analytics-backend.aroundme.global/api/shoppie/";

    console.log("embedSettings", embedSettings);
    console.log("sessionId", sessionId);
    console.log("type", type);
    console.log("brandData", brandData);

    const body = {
      type,
      brand_id: brandData.id,
      industry: brandData.industry,
      brand_name: brandData.name,
      product_link: product?.purchase_link || null, 
      product_name: product?.product_name || null,
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
