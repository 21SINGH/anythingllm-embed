import { useEffect, useState } from "react";
import { embedderSettings } from "../main";
import { useQuery } from "@tanstack/react-query";
import BrandBotConfigure from "@/models/brandBotConfigure";
import BrandService from "@/models/brandService";

const DEFAULT_SETTINGS = {
  embedId: null,
  baseApiUrl: null,
  sessionId: null,
  prompt: null,
  model: null,
  temperature: null,
  host: "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvc2hvcHBpZXRlc3RpbmdzdG9yZQ",
  customer:{},
  toggleWhatsapp:false,
  whatsappNo:'7068835235',

  // style parameters
  brandName: null,
  chatIcon: "plus",
  brandImageUrl: null,
  greeting: null,
  buttonColor: "#262626",
  userBgColor: "#2563eb",
  assistantBgColor: "#1B1B1B",
  position: "bottom-right",
  assistantName: "AnythingLLM Chat Assistant",
  assistantIcon: null,
  windowHeight: null,
  windowWidth: null,
  textSize: null,
  headerColor: "#222222",
  textHeaderColor: "#fff",
  userTextColor: "#fff",
  botTextColor: null,
  cardTextColor: "#fff",
  cardTextSubColour: "#a4a4a4",
  prompotBgColor: "#1E60FB66",
  promptBorderColor: "#1E60FBBB",
  bgColor: "#282828",
  inputbarColor: "#1d1d1d",
  cardBgColor: "#1d1d1d",
  startingMessageTheme: "#2d2d2d",
  openingMessage: "",
  openingMessageTextColor: "#ffff",
  inputTextColor: "#fff",
  suggestion1: null,
  suggestion2: null,
  nudgeBgColor: null,
  nudgeTextColor: null,
  logoBackgroundColor:'black',

  // behaviors
  inputbarDisabled: false,
  openOnLoad: "off",
  supportEmail: null,
  username: null,
  defaultMessages: [],
};

export default function useGetScriptAttributes() {
  const host = "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvc2hvcHBpZXRlc3RpbmdzdG9yZQ";
  const [settings, setSettings] = useState({
    loaded: false,
    ...DEFAULT_SETTINGS,
  });

  useEffect(() => {
    function fetchAttribs() {
      if (!document) return false;
      if (
        !embedderSettings.settings.baseApiUrl
        // ||
        // !embedderSettings.settings.embedId
      ) {
        throw new Error(
          "[AnythingLLM Embed Module::Abort] - Invalid script tag setup detected. Missing required parameters for boot!"
        );
      }

      const rawSettings = embedderSettings.settings;

      if (typeof rawSettings.customer === "string") {
        try {
          rawSettings.customer = JSON.parse(rawSettings.customer);
        } catch (e) {
          console.warn("Failed to parse customer data:", e);
          rawSettings.customer = {}; // fallback
        }
      }
  

      setSettings((prevSettings) => ({
        ...prevSettings,
        ...DEFAULT_SETTINGS,
        ...parseAndValidateEmbedSettings(rawSettings),
        loaded: false,
      }));
    }

    fetchAttribs();
  }, []);

  const { data } = useQuery({
    queryKey: ["brandDetails", host],
    queryFn: () => BrandService.getBrandDetails(host),
    enabled: !!host, // avoid running if host is not ready
  });

  const { data: brandConfig } = useQuery({
    queryKey: ["brandTheme", host],
    queryFn: () => BrandBotConfigure.getBotDetails(host),
    enabled: !!host, // avoid running if host is not ready
  });
  
  useEffect(() => {
    if (data?.embed_id) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        embedId: data.embed_id,
        loaded: true,
      }));
    }
  }, [data]);
  
  useEffect(()=>{
    if (brandConfig) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        ...brandConfig,
        loaded: true,
      }));
    }
  },[brandConfig])

  return settings;
}

const validations = {
  _fallbacks: {
    defaultMessages: [],
  },

  defaultMessages: function (value = null) {
    if (typeof value !== "string") return this._fallbacks.defaultMessages;
    try {
      const list = value.split(",");
      if (
        !Array.isArray(list) ||
        list.length === 0 ||
        !list.every((v) => typeof v === "string" && v.length > 0)
      )
        throw new Error(
          "Invalid default-messages attribute value. Must be array of strings"
        );
      return list.map((v) => v.trim());
    } catch (e) {
      console.error("AnythingLLMEmbed", e);
      return this._fallbacks.defaultMessages;
    }
  },
};

function parseAndValidateEmbedSettings(settings = {}) {
  const validated = {};
  for (let [key, value] of Object.entries(settings)) {
    if (!validations.hasOwnProperty(key)) {
      validated[key] = value;
      continue;
    }

    const validatedValue = validations[key](value);
    validated[key] = validatedValue;
  }

  return validated;
}

