import { useEffect, useState } from "react";
import BrandService from "@/models/brandService";

export default function OpenButton({ settings, isOpen, toggleOpen }) {
  if (isOpen) return null;
  const [brandDetails, setBrandDetails] = useState(null);

  const getBrandDetails = async () => {
    try {
      const data = await BrandService.getBrandDetails(settings);
      setBrandDetails(data);
    } catch (error) {
      console.error("Error streaming chat:", error);
    }
  };

  useEffect(() => {
    if (!brandDetails) {
      getBrandDetails();
    }
  }, [settings, brandDetails]);

  return (
    <button
      // style={{ backgroundColor: settings.buttonColor }}
      id="anything-llm-embed-chat-button"
      onClick={toggleOpen}
      className="hover:allm-cursor-pointer allm-border-none allm-flex allm-items-center allm-justify-center allm-rounded-full allm-transition-transform alm-duration-200 hover:allm-scale-110 allm-w-[70px] allm-h-[70px] allm-overflow-hidden"
      aria-label="Toggle Menu"
    >
      <img
        src={
          brandDetails?.logo ||
          "https://storage.aroundme.global/avatar_default.png"
        }
        alt={brandDetails?.name || "Brand Logo"}
        className="allm-w-[70px] allm-h-[70px] allm-rounded-full allm-object-cover allm-border-2 allm-border-[#2d2d2d]"
      />
    </button>
  );
}
