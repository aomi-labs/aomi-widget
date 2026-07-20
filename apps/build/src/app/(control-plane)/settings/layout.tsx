import { SettingsLayout } from "./settings-layout";

export default function SettingsRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
