import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { Construction } from "lucide-react";

export default function PagePlaceholder({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle="This module is part of the DSOS roadmap and will be activated in a future build." />
      <EmptyState
        icon={<Construction size={42} strokeWidth={1.2} />}
        title="Module under construction"
        body="The current build prioritises core sustainment operations. This module's scaffolding is in place and ready to be wired up to its backend services."
      />
    </>
  );
}
