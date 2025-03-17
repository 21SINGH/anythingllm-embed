import { fetchEventSource } from "@microsoft/fetch-event-source";
import { v4 } from "uuid";

const BrandService = {
  getBrandDetails: async function ( embedSettings) {
    const embedId = embedSettings.embedId;
    const url = `https://shoppie-backend.aroundme.global/api/brands/brand-by-workspace/${embedId}`;

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
