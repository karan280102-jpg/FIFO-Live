import { useState, useMemo } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { inr, fmtDate } from '../lib/fifo.js';

export default function LedgerTab({ lots, isAdmin, onDelete }) {
  const sorted = useMemo(() => lots.slice().sort((a, b) => b.dateObj - a.dateObj), [lots]);
  const [confirmId, setConfirmId] = useState(null);

  function handleDeleteClick(id) {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(prev => (prev === id ? null : prev)), 4000);
    }
  }

  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div className="ff-panel-title">Lot Ledger</div>
        <div className="ff-panel-note">{sorted.length} lots{isAdmin ? ' · Admins can delete rows below' : ''}</div>
      </div>
      <div className="ff-tbl-wrap" style={{ maxHeight: 640 }}>
        <table className="ff-table">
          <thead><tr>
            <th>Date</th><th>Cold Store</th><th>Item</th><th>Lot No</th>
            <th className="num">Inward</th><th className="num">Out</th><th className="num">Balance</th>
            <th className="num">Aging (d)</th><th>FIFO Status</th><th>Entered By</th>
            {isAdmin && <th></th>}
          </tr></thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td className="mono">{fmtDate(r.dateObj)}</td>
                <td>{r.cold_store}</td>
                <td>{r.sku}</td>
                <td className="mono">{r.lot_no}</td>
                <td className="num">{inr(r.inward_qty)}</td>
                <td className="num">{inr(r.out_qty)}</td>
                <td className="num strong">{inr(r.pending_qty)}</td>
                <td className="num">{r.aging}</td>
                <td>
                  {r.violation
                    ? (r.exception_approved_by_name
                      ? <span className="ff-badge warn"><ShieldCheck size={11} /> Approved Exception</span>
                      : <span className="ff-badge bad">Violation</span>)
                    : <span className="ff-badge ok">In Order</span>}
                </td>
                <td style={{ fontSize: 11, color: '#6e6455' }}>{r.entered_by_name || '—'}</td>
                {isAdmin && (
                  <td>
                    <button
                      className={confirmId === r.id ? 'ff-btn-reject' : 'ff-btn-ghost'}
                      style={{ padding: '5px 10px', fontSize: 10.5 }}
                      onClick={() => handleDeleteClick(r.id)}
                    >
                      <Trash2 size={11} /> {confirmId === r.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
