import { AlertTriangle, CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';
import { inr, timeAgo } from '../lib/fifo.js';

export default function ApprovalsTab({ approvals, isAdmin, onApprove, onReject }) {
  const pending = approvals.filter(a => a.status === 'pending').sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
  const decided = approvals.filter(a => a.status !== 'pending').sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at));

  return (
    <div>
      <div className="ff-panel">
        <div className="ff-panel-head">
          <div className="ff-panel-title">Pending Approval</div>
          <div className="ff-panel-note">{pending.length} request(s) waiting {!isAdmin && '· only an Admin can decide these'}</div>
        </div>
        {pending.length === 0 ? (
          <div className="ff-empty" style={{ padding: '30px 10px' }}>
            <div className="ff-display" style={{ fontSize: 18 }}>Nothing waiting</div>
            <div>Every dispatch so far has followed FIFO order.</div>
          </div>
        ) : (
          <div className="ff-approval-list">
            {pending.map(req => (
              <div key={req.id} className="ff-approval-card">
                <div className="ff-approval-top">
                  <div>
                    <div className="ff-strong">{req.sku}</div>
                    <div className="ff-panel-note">{req.cold_store} &middot; Lot {req.lot_no} (received {req.lot_date})</div>
                  </div>
                  <div className="ff-approval-qty">{inr(req.out_qty)} kg</div>
                </div>
                <div className="ff-approval-blockers">
                  <AlertTriangle size={13} style={{ flexShrink: 0, color: '#d9a441' }} />
                  <span>Would jump ahead of: {(req.blockers || []).map(b => `Lot ${b.lot_no} (${inr(b.pending_qty)} kg pending, recv ${b.lot_date})`).join('; ')}</span>
                </div>
                <div className="ff-approval-meta">Requested by {req.requested_by_name} &middot; {timeAgo(req.requested_at)}</div>
                <div className="ff-approval-meta">
                  <Mail size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  {req.email_sent ? 'Admin alerted by email' : 'Email alert not confirmed — check manually'}
                </div>
                {isAdmin ? (
                  <div className="ff-approval-actions">
                    <button className="ff-btn-approve" onClick={() => onApprove(req.id)}><CheckCircle2 size={14} /> Approve</button>
                    <button className="ff-btn-reject" onClick={() => onReject(req.id)}><XCircle size={14} /> Reject</button>
                  </div>
                ) : (
                  <div className="ff-approval-actions">
                    <span className="ff-badge dim"><Clock size={11} /> Waiting on Admin</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="ff-panel">
          <div className="ff-panel-head">
            <div className="ff-panel-title">Decision History</div>
            <div className="ff-panel-note">{decided.length} resolved request(s)</div>
          </div>
          <div className="ff-tbl-wrap">
            <table className="ff-table">
              <thead><tr><th>Item</th><th>Cold Store</th><th>Lot</th><th className="num">Qty</th><th>Requested By</th><th>Decision</th><th>Decided By</th></tr></thead>
              <tbody>
                {decided.map(req => (
                  <tr key={req.id}>
                    <td>{req.sku}</td>
                    <td>{req.cold_store}</td>
                    <td className="mono">{req.lot_no}</td>
                    <td className="num">{inr(req.out_qty)}</td>
                    <td>{req.requested_by_name}</td>
                    <td>{req.status === 'approved' ? <span className="ff-badge ok">Approved</span> : <span className="ff-badge bad">Rejected</span>}</td>
                    <td>{req.decided_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
