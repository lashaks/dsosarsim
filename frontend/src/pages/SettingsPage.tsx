import { useI18n } from "../lib/i18n";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/ui/PageHeader";

export default function SettingsPage() {
  const { lang, setLang, dir } = useI18n();
  const { user } = useAuth();

  return (
    <>
      <PageHeader eyebrow="System" title="Settings" subtitle="Per-user preferences and platform information." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="section-title mb-3">Identity</div>
          <Row k="Username" v={user?.username || "—"} />
          <Row k="Full name" v={user?.full_name || "—"} />
          <Row k="Email" v={user?.email || "—"} />
          <Row k="Role" v={user?.role || "—"} />
          <Row k="Sector" v={user?.sector || "—"} />
        </div>

        <div className="panel p-5">
          <div className="section-title mb-3">Language &amp; Layout</div>
          <Row k="Current language" v={lang.toUpperCase()} />
          <Row k="Layout direction" v={dir.toUpperCase()} />
          <div className="mt-4 flex gap-2">
            <button className={`btn ${lang === "en" ? "btn-gold" : ""}`} onClick={() => setLang("en")}>English (LTR)</button>
            <button className={`btn ${lang === "ar" ? "btn-gold" : ""}`} onClick={() => setLang("ar")}>العربية (RTL)</button>
          </div>
        </div>

        <div className="panel p-5 md:col-span-2">
          <div className="section-title mb-3">Platform</div>
          <Row k="Build" v="DSOS v0.1 — Demonstration" />
          <Row k="Backend" v="http://localhost:8000" mono />
          <Row k="Classification" v="For demonstration only — not for live financial posting" />
        </div>
      </div>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{k}</span>
      <span className={mono ? "mono" : ""} style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  );
}
