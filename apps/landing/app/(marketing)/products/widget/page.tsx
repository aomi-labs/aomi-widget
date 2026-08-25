import type { Metadata } from "next";
import { WidgetProductPageContent } from "../../../_marketing/products/widget/page";
import widgetStyles from "../../../_marketing/products/widget/widget-product.module.css";

export const metadata: Metadata = {
  title: "Human Interface | Aomi",
  description:
    "Put Aomi's chat-to-transaction surface in your product or a Telegram bot while preserving your authentication, wallet, and application policy.",
  robots: { index: false, follow: false },
};

export default function HumanInterfacePage() {
  return (
    <div className={widgetStyles.marketingTokens}>
      <WidgetProductPageContent
        contactHref="/contact"
        productName="HUMAN INTERFACE"
        flat
      />
    </div>
  );
}
