import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseStylesSrc } from "./utils/constants.js";

const queryClient = new QueryClient(); // Initialize QueryClient

const appElement = document.createElement("div");
document.body.appendChild(appElement);
const root = ReactDOM.createRoot(appElement);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

const scriptSettings = Object.assign(
  {},
  document?.currentScript?.dataset || {}
);
export const embedderSettings = {
  settings: scriptSettings,
  stylesSrc: parseStylesSrc(document?.currentScript?.src),
  USER_STYLES: {
    msgBg: scriptSettings?.userBgColor ,
    base: `allm-text-white allm-rounded-t-[18px] allm-rounded-bl-[18px] allm-rounded-br-[4px] allm-mx-[20px] allm-my-[3px]`,
  },
  ASSISTANT_STYLES: {
    msgBg: scriptSettings?.assistantBgColor ,
    base: `allm-text-[#fff] allm-rounded-t-[18px] allm-rounded-br-[18px] allm-rounded-bl-[4px] allm-mr-[37px] allm-ml-[9px] allm-my-[5px]`,
  },
};
