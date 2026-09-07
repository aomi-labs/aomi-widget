import { notFound } from "next/navigation";
import { TransactionLayouts } from "./transaction-layouts";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TransactionLayouts />;
}
