"use client";

import { PageHeader } from "@/components/Page";
import { LearningLog, PreferencesPanel } from "@/components/PreferencesPanel";
import { useStore } from "@/lib/store";
import { useState } from "react";

export default function PreferencesPage() {
  const { reloadMe } = useStore();
  const [logVersion, setLogVersion] = useState(0);
  return <div className="max-w-3xl space-y-5 pb-16"><PageHeader title="Preferences" subtitle="Your work interests, matching preferences and learning history." />
    <PreferencesPanel onSaved={() => { setLogVersion((v) => v + 1); void reloadMe(); }} /><LearningLog key={logVersion} />
  </div>;
}
