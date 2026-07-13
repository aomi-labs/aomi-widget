import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AomiWidget } from "@aomi-labs/widget-lib";
import { paraAuth } from "@aomi-labs/widget-lib/providers/para";
import "./styles.css";

const apiUrl = import.meta.env.VITE_AOMI_API_URL ?? "http://localhost:3000";
const paraApiKey = import.meta.env.VITE_PARA_API_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AomiWidget
      apiUrl={apiUrl}
      auth={paraAuth({ apiKey: paraApiKey })}
      height="calc(100dvh - 2rem)"
    />
  </StrictMode>,
);
