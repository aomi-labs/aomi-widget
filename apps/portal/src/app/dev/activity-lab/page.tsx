import { notFound } from "next/navigation";
import { ActivityLab } from "./activity-lab";

export const dynamic = "force-dynamic";

export default function ActivityLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ActivityLab />;
}
