import type { Metadata } from "next";
import PluginSdkProductPageContent from "../../../v2/products/console/page";
import pluginStyles from "../../../v2/products/console/plugin-sdk.module.css";

export const metadata: Metadata = {
  title: "Plugin SDK | Aomi V3",
  description:
    "Turn an API into an agent-ready Aomi App with the Rust Plugin SDK and Aomi Build toolchain.",
  robots: { index: false, follow: false },
};

export default function PluginSdkProductPage() {
  return (
    <div className={pluginStyles.v3Tokens}>
      <PluginSdkProductPageContent />
    </div>
  );
}
