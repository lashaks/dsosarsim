import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { useAuditLog } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDateTime, clsx } from "../lib/format";

export default function AuditPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const { data, isLoading } = useAuditLog({
    entity_type: entityType || undefined,
    action: action || undefined,
    user: user || undefined,
    limit: 500,
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Audit Trail"
        subtitle="Append-only log of every state-changing action. Captures actor, entity, and full before/after diff."
        actions={<Lock size={28} color="var(--gold)" strokeWidth={1.3} />}
      />

      <div className="panel p-3 mb-3 flex gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Filter by user" value={user} onChange={(e) => setUser(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All entities</option>
          <option value="WorkOrder">WorkOrder</option>
          <option value="Vehicle">Vehicle</option>
          <option value="Inventory">Inventory</option>
          <option value="RFQ">RFQ</option>
          <option value="PO">PO</option>
          <option value="BERReview">BERReview</option>
          <option value="User">User</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="CREATE_WO">CREATE_WO</option>
          <option value="UPDATE_WO">UPDATE_WO</option>
          <option value="ISSUE_STOCK">ISSUE_STOCK</option>
          <option value="RECEIVE_STOCK">RECEIVE_STOCK</option>
          <option value="WRITE_DOWN">WRITE_DOWN</option>
          <option value="CREATE_RFQ">CREATE_RFQ</option>
          <option value="AWARD_RFQ">AWARD_RFQ</option>
          <option value="RECEIVE_PO">RECEIVE_PO</option>
          <option value="SAVE_BER_REVIEW">SAVE_BER_REVIEW</option>
          <option value="PROCUREMENT_CHECK">PROCUREMENT_CHECK</option>
        </select>
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? <Skeleton className="h-60 m-3" /> : (
          <table className="data-table">
            <thead><tr>
              <th></th><th>Timestamp</th><th>User</th><th>Action</th>
              <th>Entity</th><th>Entity ID</th><th>Summary</th>
            </tr></thead>
            <tbody>
              {data?.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No audit entries match these filters.
                </td></tr>
              )}
              {data?.map((e) => {
                const isExp = expanded === e.id;
                const summary = e.new_values
                  ? Object.keys(e.new_values).slice(0, 3).map((k) => `${k}=${JSON.stringify(e.new_values[k])}`).join(" · ")
                  : "—";
                return (
                  <Fragment key={e.id}>
                    <tr onClick={() => setExpanded(isExp ? null : e.id)}>
                      <td>{isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</td>
                      <td className="mono text-[11px]">{formatDateTime(e.created_at)}</td>
                      <td className="text-[12px]">{e.username || "—"}</td>
                      <td><span className="badge badge-info">{e.action}</span></td>
                      <td className="text-[12px]">{e.entity_type}</td>
                      <td className="mono text-[11px]">{e.entity_id || "—"}</td>
                      <td className="text-[11px]" style={{ color: "var(--text-muted)" }}>{summary}</td>
                    </tr>
                    {isExp && (
                      <tr style={{ cursor: "default" }}>
                        <td colSpan={7} className="p-0">
                          <div className="p-4" style={{ background: "var(--bg-primary)" }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <div className="section-title mb-2">Before</div>
                                <pre className="mono text-[10.5px] p-3 rounded overflow-auto"
                                     style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-body)", maxHeight: 200 }}>
{e.old_values ? JSON.stringify(e.old_values, null, 2) : "— no prior state —"}
                                </pre>
                              </div>
                              <div>
                                <div className="section-title mb-2">After</div>
                                <pre className="mono text-[10.5px] p-3 rounded overflow-auto"
                                     style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-body)", maxHeight: 200 }}>
{e.new_values ? JSON.stringify(e.new_values, null, 2) : "— no new state —"}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
