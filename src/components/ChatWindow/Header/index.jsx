import AnythingLLMIcon from "@/assets/anything-llm-icon.svg";
import BrandService from "@/models/brandService";
import { RxCross2 } from "react-icons/rx";
import { useEffect, useRef, useState } from "react";

export default function ChatWindowHeader({
  sessionId,
  settings = {},
  iconUrl = null,
  closeChat,
  setChatHistory,
}) {
  const [showingOptions, setShowOptions] = useState(false);
  const [brandDetails, setBrandDetails] = useState(null);  
  const menuRef = useRef();
  const buttonRef = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

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
    <div
      style={{ backgroundColor: settings.headerColor }}
      className={`allm-flex allm-items-center`}
      id="anything-llm-header"
    >
      <div className="allm-flex allm-pl-3 allm-items-center allm-w-full allm-h-[76px]">
        <img
          style={{ maxWidth: 48, maxHeight: 48, borderRadius: 25 }}
          src={settings?.brandImageUrl ?? brandDetails?.logo ?? AnythingLLMIcon}
          alt={brandDetails?.logo ? "Brand" : "AnythingLLM Logo"}
        />
        <div
          className="allm-text-[21px] allm-font-semibold allm-ml-3 "
          style={{ color: settings.textHeaderColor }}
        >
          {settings?.brandName ?? brandDetails?.name}
        </div>
      </div>
      <div className="allm-absolute allm-right-0 allm-flex allm-justify-center allm-items-center allm-px-[22px]">
       
        <button
          type="button"
          aria-label="Close"
          onClick={closeChat}
          className="hover:allm-cursor-pointer allm-border-none allm-bg-[#5C5C5C]/50 allm-rounded-full allm-p-1  allm-flex allm-items-center allm-justify-center"
        >
          <RxCross2 size={18} color="#FAFAFA" />
        </button>
      </div>
     
    </div>
  );
}