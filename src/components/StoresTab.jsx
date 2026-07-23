import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { aggregateItems, aggregateStores, inr, fifoColor } from '../lib/fifo.js';

function SortTh({ label, sortField, className, sortKey, sortDir, onSort }) {
  const active = sortKey === sortField;
  return (
    <th className={`sortable${className ? ' ' + className : ''}`} onClick={() => onSort(sortField)}>
      {label}{active && <span className="ff-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default function StoresTab({ lots }) {
  const stores = useMemo(() => aggregateStores(lots), [lots]);
  const [focus, setFocus] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('fifoPct');
  const [sortDir, setSortDir] = useState('asc');
  const activeFocus = focus || (stores[0] && stores[0].key);
  const storeRows = lots.filter(l => l.cold_store === activeFocus);
  const storeItems = useMemo(() => aggregateItems(storeRows), [storeRows]);

  function onSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'key' ? 'asc' : 'desc'); }
  }

  const filteredItems = useMemo(() => {
    let rows = storeItems;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(i => i.key.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [storeItems, search, sortKey, sortDir]);

  return (
    <div>
      <div className="ff-cs-grid">
        {stores.map(s => {
          const r = 26, c = 2 * Math.PI * r, dash = c * (s.fifoPct / 100);
          return (
            <div key={s.key} className="ff-cs-card"
              style={{ borderColor: activeFocus === s.key ? 'rgba(212,175,90,0.32)' : 'rgba(212,175,90,0.14)' }}
              onClick={() => setFocus(s.key)}>
              <div className="ff-cs-card-top">
                <div>
                  <div className="ff-display" style={{ fontSize: 22 }}>{s.key}</div>
                  <div className="ff-panel-note" style={{ marginTop: 4 }}>{s.totalLots} lots</div>
                </div>
                <div className="ff-ring">
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke={fifoColor(s.fifoPct)} strokeWidth="6"
                      strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
                  </svg>
                  <div className="ff-ring-val" style={{ color: fifoColor(s.fifoPct) }}>{Math.round(s.fifoPct)}%</div>
                </div>
              </div>
              <div className="ff-cs-metrics">
                <div><span className="ff-metric-val" style={{ color: s.violations ? '#c15a4e' : '#5fae7c' }}>{s.violations}</span><span className="ff-metric-label">Violations</span></div>
                <div><span className="ff-metric-val">{inr(s.balanceQty)}</span><span className="ff-metric-label">Balance Kg</span></div>
                <div><span className="ff-metric-val">{s.oldestAge || 0}</span><span className="ff-metric-label">Oldest Days</span></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ff-panel">
        <div className="ff-panel-head">
          <div>
            <div className="ff-panel-title">Item Breakdown — {activeFocus}</div>
            <div className="ff-panel-note">{filteredItems.length} of {storeItems.length} items &middot; select a cold store above to change focus</div>
          </div>
          <div className="ff-search-wrap">
            <Search size={14} />
            <input className="ff-input" placeholder="Search item..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="ff-tbl-wrap">
          <table className="ff-table">
            <thead><tr>
              <SortTh label="Item" sortField="key" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Lots" sortField="totalLots" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Violations" sortField="violations" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="FIFO %" sortField="fifoPct" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Balance Qty (kg)" sortField="balanceQty" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Oldest Pending (d)" sortField="oldestAge" className="num" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr></thead>
            <tbody>
              {filteredItems.map(i => (
                <tr key={i.key}>
                  <td className="strong">{i.key}</td>
                  <td className="num">{i.totalLots}</td>
                  <td className="num">{i.violations ? <span style={{ color: '#c15a4e' }}>{i.violations}</span> : '0'}</td>
                  <td><span className="ff-pctbar"><i style={{ width: Math.round(i.fifoPct) + '%', background: fifoColor(i.fifoPct) }}></i></span>{Math.round(i.fifoPct)}%</td>
                  <td className="num">{inr(i.balanceQty)}</td>
                  <td className="num">{i.oldestAge || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
