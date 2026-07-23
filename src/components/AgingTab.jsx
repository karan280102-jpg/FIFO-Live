import { useState, useMemo, Fragment } from 'react';
import { Search } from 'lucide-react';
import { aggregateAgingByItem, inr, fmtDate } from '../lib/fifo.js';
import { AGING_BUCKETS } from '../lib/constants.js';

function SortTh({ label, sortField, className, sortKey, sortDir, onSort }) {
  const active = sortKey === sortField;
  return (
    <th className={`sortable${className ? ' ' + className : ''}`} onClick={() => onSort(sortField)}>
      {label}{active && <span className="ff-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default function AgingTab({ lots }) {
  const items = useMemo(() => aggregateAgingByItem(lots), [lots]);
  const lastKey = AGING_BUCKETS[AGING_BUCKETS.length - 1].key;
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');
  const colCount = AGING_BUCKETS.length + 5;

  function onSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'sku' ? 'asc' : 'desc'); }
  }

  function bucketColorFor(aging) {
    const b = AGING_BUCKETS.find(b => aging >= b.min && aging <= b.max);
    return b ? b.color : '#a89a83';
  }

  const filtered = useMemo(() => {
    let rows = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(i => i.sku.toLowerCase().includes(q) || i.coldStores.some(c => c.toLowerCase().includes(q)));
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [items, search, sortKey, sortDir]);

  return (
    <div className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <div className="ff-panel-title">Item-Wise Aging Breakdown</div>
          <div className="ff-panel-note">{filtered.length} of {items.length} items holding balance &middot; click a row to see lot numbers</div>
        </div>
        <div className="ff-search-wrap">
          <Search size={14} />
          <input className="ff-input" placeholder="Search item or cold store..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="ff-tbl-wrap">
        <table className="ff-table">
          <thead><tr>
            <th></th>
            <SortTh label="Item" sortField="sku" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th>Cold Store(s)</th>
            {AGING_BUCKETS.map(b => <SortTh key={b.key} label={`${b.label} (kg)`} sortField={b.key} className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />)}
            <SortTh label="Total Balance (kg)" sortField="total" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Oldest Pending (d)" sortField="oldestAge" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </tr></thead>
          <tbody>
            {filtered.map(i => {
              const isOpen = expanded === i.sku;
              const lotRows = isOpen
                ? lots.filter(l => l.sku === i.sku && l.pending_qty > 0).sort((a, b) => b.aging - a.aging)
                : [];
              return (
                <Fragment key={i.sku}>
                  <tr className="row-click" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : i.sku)}>
                    <td style={{ color: '#6e6455', width: 18 }}>{isOpen ? '▾' : '▸'}</td>
                    <td className="strong">{i.sku}</td>
                    <td>{i.coldStores.map(c => <span key={c} className="ff-badge dim">{c}</span>)}</td>
                    {AGING_BUCKETS.map(b => {
                      const v = i[b.key];
                      return <td key={b.key} className="num" style={{ color: v ? b.color : undefined, fontWeight: (v && b.key === lastKey) ? 700 : undefined }}>{v ? inr(v) : '—'}</td>;
                    })}
                    <td className="num strong">{inr(i.total)}</td>
                    <td className="num">{i.oldestAge}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={colCount} style={{ padding: 0, background: '#151210' }}>
                        <div style={{ padding: '10px 16px 16px' }}>
                          <table className="ff-table" style={{ fontSize: 12 }}>
                            <thead><tr>
                              <th>Cold Store</th><th>Lot No</th><th>Inward Date</th>
                              <th className="num">Aging (d)</th><th className="num">Balance (kg)</th>
                            </tr></thead>
                            <tbody>
                              {lotRows.map(l => (
                                <tr key={l.id}>
                                  <td>{l.cold_store}</td>
                                  <td className="mono strong">{l.lot_no}</td>
                                  <td className="mono">{fmtDate(l.dateObj)}</td>
                                  <td className="num" style={{ color: bucketColorFor(l.aging), fontWeight: 700 }}>{l.aging}</td>
                                  <td className="num strong">{inr(l.pending_qty)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
