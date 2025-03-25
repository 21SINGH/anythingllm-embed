import { useEffect, useState } from "react";
import { embedderSettings } from "../main";
import { useQuery } from "@tanstack/react-query";
import BrandBotConfigure from "@/models/brandBotConfigure";

const DEFAULT_SETTINGS = {
  embedId: null, //required
  baseApiUrl: null, // required
  
  sessionId: null, 

  // Override properties that can be defined.
  prompt: null, // override
  model: null, // override
  temperature: null, //override

  // style parameters
  chatIcon: "plus",
  brandImageUrl: null, // will be forced into 100x50px container
  greeting: null, // empty chat window greeting.
  buttonColor: "#262626", // must be hex color code
  userBgColor: "#2563eb", // user text bubble color
  assistantBgColor: "#1B1B1B", // assistant text bubble color
  position: "bottom-right", // position of chat button/window
  assistantName: "AnythingLLM Chat Assistant", // default assistant name
  assistantIcon: null, // default assistant icon
  windowHeight: null, // height of chat window in number:css-prefix
  windowWidth: null, // width of chat window in number:css-prefix
  textSize: null, // text size in px (number only)
  headerColor: "#222222",
  textHeaderColor: "#fff",
  userTextColor: "#fff",
  botTextColor: "#fff",
  cardTextColor: "#fff",
  cardTextSubColour: "#a4a4a4",
  prompotBgColor: "#1E60FB66",
  promptBorderColor: "#1E60FBBB",
  bgColor: "#282828",
  inputbarColor: "#1d1d1d",
  cardBgColor: "#1d1d1d",
  startingMessageTheme:'#2d2d2d',
  openingMessage:"",

  // behaviors
  inputbarDisabled:false,
  openOnLoad: "off", // or "on"
  supportEmail: null, // string of email for contact
  username: null, // The display or readable name set on a script
  defaultMessages: [], // list of strings for default messages.
};

export default function useGetScriptAttributes() {
  const [settings, setSettings] = useState({
    loaded: false,
    ...DEFAULT_SETTINGS,
  });

  useEffect(() => {
    function fetchAttribs() {
      if (!document) return false;
      if (
        !embedderSettings.settings.baseApiUrl ||
        !embedderSettings.settings.embedId
      ) {
        throw new Error(
          "[AnythingLLM Embed Module::Abort] - Invalid script tag setup detected. Missing required parameters for boot!"
        );
      }

      setSettings((prevSettings) => ({
        ...prevSettings,
        ...DEFAULT_SETTINGS,
        ...parseAndValidateEmbedSettings(embedderSettings.settings),
        loaded: true,
      }));
    }

    fetchAttribs();
  }, []);

  // Use TanStack Query to fetch bot details
  const { data, error } = useQuery({
    queryKey: ["botDetails", settings],
    queryFn: () => BrandBotConfigure.getBotDetails(settings),
    enabled: settings.loaded, // Only run when settings.loaded is true
    retry: 2, // Optional: Retry failed requests
  });

  useEffect(() => {
    if (data) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        ...data,
      }));
    }
  }, [data]);

  if (error) {
    console.error("Error fetching bot details:", error);
  }

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
