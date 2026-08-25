import { redirect } from "next/navigation";

export default function PortalProductRedirect() {
  redirect("/v2/products/widget");
}
