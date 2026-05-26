import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate, clsx } from "../lib/format";

// Inline hook since /api/obsolescence isn't in the router — we'll fetch from parts catalogue inline
// (Backend exposes ObsolescenceRisk only via ProcurementCheck flag — provide a focused read here)
function useObsolescenceList() {
  return useQuery({
    queryKey: ["obsolescence-aggregate"],
    queryFn: async () => {
      // Derive by running checks for every part — heavy. Simpler: query the inventory and read obsolescence per part.
      // For now, return seeded entries via a thin endpoint added later. Use procurement check on parts that have flags.
      return [] as any[];
    },
    enabled: false,
  });
}

export default function ObsolescencePage() {
  const { data, isLoading } = useObsolescenceList();

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Obsolescence Risk"
        subtitle="Critical-parts pipeline visibility. HIGH-risk parts trigger BER Rule 5 and feed the procurement check."
        actions={<Clock size={28} color="var(--gold)" strokeWidth={1.3} />}
      />

      <div className="panel p-6 text-center">
        <Clock size={42} color="var(--text-muted)" strokeWidth={1.2} className="mx-auto mb-3" />
        <div className="display text-lg" style={{ color: "var(--text-primary)" }}>Obsolescence flags in catalogue</div>
        <p className="text-[13px] mt-2 max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
          Seeded obsolescence records are evaluated at the per-part level inside the 15-point procurement check (Check #9) and the BER Engine (Rule #5).
          A dedicated read-only viewer is on the next sprint; meanwhile, run a procurement check to surface the flag for any part.
        </p>
      </div>
    </>
  );
}
