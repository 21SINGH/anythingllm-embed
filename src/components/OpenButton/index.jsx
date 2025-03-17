import { useEffect, useState } from "react";
import {
  Plus,
  ChatCircleDots,
  Headset,
  Binoculars,
  MagnifyingGlass,
  MagicWand,
} from "@phosphor-icons/react";
import BrandService from "@/models/brandService";

// const CHAT_ICONS = {
//   plus: Plus,
//   chatBubble: ChatCircleDots,
//   support: Headset,
//   search2: Binoculars,
//   search: MagnifyingGlass,
//   magic: MagicWand,
// };

export default function OpenButton({ settings, isOpen, toggleOpen }) {
  if (isOpen) return null;
  const [brandDetails, setBrandDetails] = useState(null);
  // const ChatIcon = CHAT_ICONS.hasOwnProperty(settings?.chatIcon)
  //   ? CHAT_ICONS[settings.chatIcon]
  //   : CHAT_ICONS.plus;

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

  useEffect(() => {
    console.log(brandDetails);
  }, [brandDetails]);

  return (
    <button
      style={{ backgroundColor: settings.buttonColor }}
      id="anything-llm-embed-chat-button"
      onClick={toggleOpen}
      className="hover:allm-cursor-pointer allm-border-none allm-flex allm-items-center allm-justify-center allm-rounded-full allm-text-white allm-text-2xl hover:allm-opacity-50 allm-h-[48px] allm-w-[48px]"
      aria-label="Toggle Menu"
    >
      <img
        src={
          brandDetails?.logo ||
          "https://storage.aroundme.global/avatar_default.png"
        }
        alt={brandDetails?.name || "Brand Logo"}
        style={{ maxWidth: 48, maxHeight: 48, borderRadius: 25 }}
      />
    </button>
  );
}
