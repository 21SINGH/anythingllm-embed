import BrandService from "@/models/brandService";

const BrandAnalytics = {
  sendAnalytics: async function (
    embedSettings,
    sessionId,
    type,
    product = null,
  ) {
    const brandData = await BrandService.getBrandDetails(embedSettings);
    const url = "https://analytics-backend.aroundme.global/api/shoppie/";

    const body = {
      type,
      brand_id: brandData?.id,
      industry: brandData?.industry,
      brand_name: brandData?.name,
      content: product?.product_name || product?.title || null,
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
