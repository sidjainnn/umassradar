import { ApplicationsPanel } from "@/components/ApplicationsPanel";
import { PageHeader } from "@/components/Page";

export default function ApplicationsPage() {
  return <div className="max-w-3xl space-y-6 pb-16"><PageHeader title="Applications" subtitle="Your applications, interviews and offers in one place." /><ApplicationsPanel /></div>;
}
