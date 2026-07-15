import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AomiWidget } from "@aomi-labs/widget-lib/aomi-widget";
import "@aomi-labs/widget-lib/styles.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

const portalUrl =
  import.meta.env.VITE_AOMI_PORTAL_URL ?? "http://127.0.0.1:3000";

createRoot(root).render(
  <StrictMode>
    <main>
      <p>
        Consumer origin: <code>{window.location.origin}</code>
      </p>
      <AomiWidget apiUrl={portalUrl} height="calc(100dvh - 5rem)" />
    </main>
  </StrictMode>,
);
