import type { Metadata } from "next";
import { WidgetProductPageContent } from "../../../v2/products/widget/page";
import widgetStyles from "../../../v2/products/widget/widget-product.module.css";

export const metadata: Metadata = {
  title: "Human Interface | Aomi V3",
  description:
    "Put Aomi's chat-to-transaction surface in your product or a Telegram bot while preserving your authentication, wallet, and application policy.",
  robots: { index: false, follow: false },
};

export default function HumanInterfacePage() {
  return (
    <div className={widgetStyles.v3Tokens}>
      <WidgetProductPageContent
        contactHref="/v3/contact"
        productName="HUMAN INTERFACE"
        flat
      />
    </div>
  );
}
