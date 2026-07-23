import { useState, useMemo } from 'react';
import { Search, ShieldCheck, Trash2 } from 'lucide-react';
import { inr, fmtDate } from '../lib/fifo.js';

function SortTh({ label, sortField, className, sortKey, sortDir, onSort }) {
  const active = sortKey === sortField;
  return (
    <th className={`sortable${className ? ' ' + className : ''}`} onClick={() => onSort(sortField)}>
      {label}{active && <span className="ff-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default function LedgerTab({ lots, isAdmin, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('dateObj');
  const [sortDir, setSortDir] = useState('desc');

  function onSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'dateObj' || key === 'pending_qty' ? 'desc' : 'asc'); }
  }

  function handleDeleteClick(id) {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(prev => (prev === id ? null : prev)), 4000);
    }
  }

  const filtered = useMemo(() => {
    let rows = lots;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(l =>
        l.sku.toLowerCase().includes(q) ||
        String(l.lot_no).toLowerCase().includes(q) ||
        l.cold_store.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [lots, search, sortKey, sortDir]);

  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <div className="ff-panel-title">Lot Ledger</div>
          <div className="ff-panel-note">{filtered.length} of {lots.length} lots{isAdmin ? ' · Admins can delete rows below' : ''}</div>
        </div>
        <div className="ff-search-wrap">
          <Search size={14} />
          <input className="ff-input" placeholder="Search item, lot no, or cold store..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="ff-tbl-wrap" style={{ maxHeight: 640 }}>
        <table className="ff-table">
          <thead><tr>
            <SortTh label="Date" sortField="dateObj" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Cold Store" sortField="cold_store" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Item" sortField="sku" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Lot No" sortField="lot_no" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Inward" sortField="inward_qty" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Out" sortField="out_qty" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Balance" sortField="pending_qty" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Aging (d)" sortField="aging" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th>FIFO Status</th><th>Entered By</th>
            {isAdmin && <th></th>}
          </tr></thead>
          <tbody>
            {filtered.map(r => (
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
