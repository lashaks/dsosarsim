import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Shield, Lock } from "lucide-react";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("dsos2026");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(username, password);
      const to = (loc.state as any)?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch {
      setErr("Invalid username or password.");
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between flex-1 p-12"
           style={{
             background:
               "linear-gradient(135deg, #0D1117 0%, #131A24 60%, #0D1117 100%)",
             borderRight: "1px solid var(--border)",
           }}>
        <div>
          <div className="flex items-center gap-3">
            <Shield size={32} color="var(--gold)" strokeWidth={1.4} />
            <div>
              <div className="display text-3xl tracking-wide" style={{ color: "var(--text-primary)" }}>DSOS</div>
              <div className="text-xs tracking-section uppercase mt-1" style={{ color: "var(--gold-dim)" }}>
                Defense Sustainment OS
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="display text-4xl leading-tight" style={{ color: "var(--text-primary)" }}>
            COMMAND-GRADE<br />
            <span style={{ color: "var(--gold)" }}>SUSTAINMENT</span><br />
            PLATFORM
          </h2>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "var(--text-body)" }}>
            Built for the Saudi Armed Forces, SANG, Ministry of Interior, and GCC defense
            partners. Real-time readiness, IPSAS-compliant accounting, and intelligence-led
            sustainment decisions in one operations theatre.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="section-title">Readiness</div>
              <div className="mono text-lg mt-1" style={{ color: "var(--text-primary)" }}>15-vehicle</div>
            </div>
            <div>
              <div className="section-title">Engines</div>
              <div className="mono text-lg mt-1" style={{ color: "var(--text-primary)" }}>3 / 3</div>
            </div>
            <div>
              <div className="section-title">Compliance</div>
              <div className="mono text-lg mt-1" style={{ color: "var(--text-primary)" }}>IPSAS</div>
            </div>
          </div>
        </div>
        <div className="text-xs tracking-section uppercase" style={{ color: "var(--text-muted)" }}>
          Classification: For demonstration use only
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Shield size={24} color="var(--gold)" />
            <div className="display text-2xl" style={{ color: "var(--text-primary)" }}>DSOS</div>
          </div>
          <div className="section-title mb-2">Secure Sign-In</div>
          <h1 className="display text-2xl mb-6" style={{ color: "var(--text-primary)" }}>
            Operator Authentication
          </h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="section-title block mb-2">Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="section-title block mb-2">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {err && (
              <div className="text-xs px-3 py-2 rounded"
                   style={{ background: "rgba(107,31,31,0.18)", color: "var(--status-nmc-t)", border: "1px solid rgba(224,80,80,0.3)" }}>
                {err}
              </div>
            )}
            <button type="submit" className="btn btn-gold w-full justify-center mt-2" disabled={loading}>
              <Lock size={14} /> {loading ? "Authenticating…" : "Sign In"}
            </button>
          </form>

          <div className="mt-8 p-3 rounded text-xs border" style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}>
            <div className="section-title mb-2">Demo Accounts</div>
            <div className="space-y-1 mono" style={{ color: "var(--text-body)" }}>
              <div>admin / dsos2026</div>
              <div>commander / dsos2026</div>
              <div>technician / dsos2026</div>
              <div>storekeeper / dsos2026</div>
              <div>procurement / dsos2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
