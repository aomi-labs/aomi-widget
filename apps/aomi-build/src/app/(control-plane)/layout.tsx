import { ControlPlaneShell } from "@portal/components/control-plane/control-plane-shell";

export default function ControlPlaneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ControlPlaneShell>{children}</ControlPlaneShell>;
}
