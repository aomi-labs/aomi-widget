import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AomiWidget } from "@aomi-labs/widget-lib";
import "./styles.css";

const apiUrl = import.meta.env.VITE_AOMI_API_URL ?? "http://localhost:3000";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AomiWidget apiUrl={apiUrl} height="calc(100dvh - 2rem)" />
  </StrictMode>,
);
