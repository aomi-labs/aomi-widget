import { notFound } from "next/navigation";
import { FinalActivityMock } from "./final-activity-mock";

export const dynamic = "force-dynamic";
export default function FinalActivityPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FinalActivityMock />;
}
