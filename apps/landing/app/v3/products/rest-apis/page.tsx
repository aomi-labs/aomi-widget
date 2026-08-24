import type { Metadata } from "next";
import RestApiProductPageContent from "../../../v2/products/api/page";
import apiStyles from "../../../v2/products/api/rest-api.module.css";

export const metadata: Metadata = {
  title: "REST APIs | Aomi V3",
  description:
    "Natural language in, signable transactions out. Use Aomi's Agent API or guarded Pipeline API without giving up custody.",
  robots: { index: false, follow: false },
};

export default function RestApiProductPage() {
  return (
    <div className={apiStyles.v3Tokens}>
      <RestApiProductPageContent />
    </div>
  );
}
